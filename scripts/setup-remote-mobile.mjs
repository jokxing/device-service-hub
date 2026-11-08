import fs from "node:fs/promises";
import path from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { openLocalApi } from "./lib/local-api.mjs";

const local = openLocalApi();
const directory = path.join(local.root, ".local/remote-mobile");
const configPath = path.join(directory, "accounts.json");
const guidePath = path.join(
  local.root,
  ".local/private-docs/异地真机测试账号.md",
);
const db = await local.connectDatabase();
const createdFiles = [];
try {
  if (process.argv.includes("--disable")) {
    const config = JSON.parse(await fs.readFile(configPath, "utf8"));
    await db.query("BEGIN");
    for (const account of config.accounts) {
      if (
        !account.id.startsWith("remote-test-") ||
        !/^remote\.(reporter|technician)\.[a-f0-9]{8}$/.test(account.username)
      )
        throw new Error("Unexpected account configuration");
      await db.query(
        'UPDATE "User" SET "active"=false WHERE "id"=$1 AND "username"=$2',
        [account.id, account.username],
      );
      await db.query(
        'DELETE FROM "Session" WHERE "userId"=$1 AND EXISTS (SELECT 1 FROM "User" WHERE "id"=$1 AND "username"=$2 AND "active"=false)',
        [account.id, account.username],
      );
    }
    await db.query("COMMIT");
    console.log(
      "Dedicated remote test accounts disabled; their sessions revoked. Business records preserved.",
    );
  } else {
    await fs.mkdir(directory, { recursive: true });
    await fs.mkdir(path.dirname(guidePath), { recursive: true });
    try {
      await fs.access(configPath);
      throw new Error(
        "Remote configuration already exists; refusing to overwrite",
      );
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const { hashPassword } = createRequire(import.meta.url)(
      path.join(local.root, "apps/api/dist/modules/auth/utils/password.js"),
    );
    const suffix = randomBytes(4).toString("hex");
    const accounts = await Promise.all(
      ["reporter", "technician"].map(async (role) => {
        const password = randomBytes(20).toString("base64url");
        return {
          id: `remote-test-${role}-${randomUUID()}`,
          username: `remote.${role}.${suffix}`,
          name: role === "reporter" ? "异地报修测试" : "异地维修测试",
          role,
          password,
          passwordHash: await hashPassword(password),
        };
      }),
    );
    const device = {
      id: `remote-test-device-${randomUUID()}`,
      code: `RT-${suffix.toUpperCase()}`,
    };
    const config = {
      expiresAt: new Date(Date.now() + 48 * 3600000).toISOString(),
      device,
      accounts: accounts.map(({ passwordHash, ...account }) => account),
    };
    await db.query("BEGIN");
    for (const account of accounts)
      await db.query(
        'INSERT INTO "User" ("id","username","name","role","passwordHash","active") VALUES ($1,$2,$3,$4,$5,true)',
        [
          account.id,
          account.username,
          account.name,
          account.role,
          account.passwordHash,
        ],
      );
    await db.query(
      'INSERT INTO "Device" ("id","code","name","category","location","model","enabled") VALUES ($1,$2,$3,$4,$5,$6,true)',
      [
        device.id,
        device.code,
        "异地测试设备",
        "测试设备",
        "远程验收区",
        "REMOTE-TEST",
      ],
    );
    await db.query(
      'INSERT INTO "DeviceAccess" ("userId","deviceId") VALUES ($1,$2)',
      [accounts[0].id, device.id],
    );
    await fs.writeFile(configPath, JSON.stringify(config, null, 2) + "\n", {
      flag: "wx",
    });
    createdFiles.push(configPath);
    await fs.writeFile(
      guidePath,
      `# 异地真机测试账号（仅本地）\n\n网关测试窗口截止：${config.expiresAt}（UTC）。网关仅允许下列账号，原有账号密码不变。\n\n${accounts.map((account) => `- ${account.name}：\`${account.username}\`；密码：\`${account.password}\``).join("\n")}\n\n授权设备：${device.code}（独立虚拟测试设备）。报修账号只能读取本设备和本人报修；维修账号仅可读取被分派给自己的任务，管理员分派在本机 Web 完成。\n\n本文件含密码，不提交 Git，不公开转发；按需要单独向测试人员提供对应账号。\n\n结束后停止隧道并执行 scripts/npm-local.ps1 run remote:mobile:disable，停用这两个账号并撤销其会话；不删除工单记录。\n`,
      { flag: "wx" },
    );
    createdFiles.push(guidePath);
    await db.query("COMMIT");
    createdFiles.length = 0;
    console.log(
      "Prepared 2 dedicated accounts and 1 isolated test device. Credentials are only in .local/private-docs/异地真机测试账号.md. No public tunnel started.",
    );
  }
} catch (error) {
  await db.query("ROLLBACK").catch(() => {});
  for (const file of createdFiles) await fs.unlink(file).catch(() => {});
  console.error(
    "Remote test setup failed; existing accounts were not overwritten. " +
      (error.code ?? "Check ignored local configuration."),
  );
  process.exitCode = 1;
} finally {
  await db.end();
}
