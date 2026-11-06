import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = path.join(root, ".local", "postgres");
const data = path.join(base, "data");
const bin = path.join(base, "runtime", "pgsql", "bin");
const credentialsPath = path.join(base, "credentials.json");
const envPath = path.join(root, ".env");
const action = process.argv[2] ?? "status";
const port = 55432;
for (const name of ["temp", "appdata", "localappdata"])
  fs.mkdirSync(path.join(root, ".local", name), { recursive: true });
process.env.TEMP = process.env.TMP = path.join(root, ".local", "temp");
process.env.APPDATA = path.join(root, ".local", "appdata");
process.env.LOCALAPPDATA = path.join(root, ".local", "localappdata");

function execute(name, args, options = {}) {
  return execFileSync(path.join(bin, name + ".exe"), args, {
    encoding: "utf8",
    windowsHide: true,
    ...(name === "pg_ctl" ? { stdio: "ignore" } : {}),
    ...options,
  });
}
function running() {
  try {
    execute("pg_ctl", ["status", "-D", data]);
    return true;
  } catch {
    return false;
  }
}
function start() {
  if (!fs.existsSync(path.join(data, "PG_VERSION")))
    throw new Error("Database is not initialized; run db:local:setup first.");
  if (!running())
    execute("pg_ctl", [
      "start",
      "-D",
      data,
      "-l",
      path.join(base, "server.log"),
      "-o",
      `-h 127.0.0.1 -p ${port}`,
      "-w",
      "-t",
      "30",
    ]);
  console.log(`Project PostgreSQL is listening on 127.0.0.1:${port}`);
}

try {
  if (!fs.existsSync(path.join(bin, "pg_ctl.exe")))
    throw new Error(
      "Portable PostgreSQL binaries are missing; see docs/API_SETUP.md.",
    );
  if (action === "setup") {
    fs.mkdirSync(base, { recursive: true });
    if (!fs.existsSync(credentialsPath)) {
      if (
        fs.existsSync(envPath) ||
        fs.existsSync(path.join(data, "PG_VERSION"))
      )
        throw new Error(
          "Existing environment or cluster found; refusing to overwrite configuration.",
        );
      fs.writeFileSync(
        credentialsPath,
        JSON.stringify(
          {
            ownerPassword: randomBytes(24).toString("hex"),
            appPassword: randomBytes(24).toString("hex"),
            seedPassword: randomBytes(18).toString("base64url"),
          },
          null,
          2,
        ),
        { flag: "wx" },
      );
    }
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
    if (!fs.existsSync(path.join(data, "PG_VERSION"))) {
      if (fs.existsSync(data) && fs.readdirSync(data).length)
        throw new Error(
          "Non-empty data directory found; refusing to initialize over existing files.",
        );
      const passwordFile = path.join(base, "init-password");
      fs.writeFileSync(passwordFile, credentials.ownerPassword, {
        mode: 0o600,
      });
      try {
        execute("initdb", [
          "-D",
          data,
          "-U",
          "dsh_owner",
          "--auth-host=scram-sha-256",
          "--auth-local=scram-sha-256",
          "--encoding=UTF8",
          "--locale=C",
          `--pwfile=${passwordFile}`,
        ]);
      } finally {
        fs.unlinkSync(passwordFile);
      }
    }
    start();
    const quote = (value) => value.replaceAll("'", "''");
    const sql = `DO $setup$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'dsh_app') THEN CREATE ROLE dsh_app LOGIN PASSWORD '${quote(credentials.appPassword)}'; END IF; END $setup$;
SELECT 'CREATE DATABASE device_service_hub OWNER dsh_app' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'device_service_hub')\n\\gexec\n`;
    execute(
      "psql",
      [
        "-h",
        "127.0.0.1",
        "-p",
        String(port),
        "-U",
        "dsh_owner",
        "-d",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
      ],
      {
        input: sql,
        env: { ...process.env, PGPASSWORD: credentials.ownerPassword },
      },
    );
    if (!fs.existsSync(envPath))
      fs.writeFileSync(
        envPath,
        `DATABASE_URL=postgresql://dsh_app:${credentials.appPassword}@127.0.0.1:${port}/device_service_hub?schema=public\nAPI_PORT=3001\nWEB_ORIGINS=http://127.0.0.1:5173,http://localhost:5173\nSEED_ACCOUNT_PASSWORD=${credentials.seedPassword}\n`,
        { flag: "wx", mode: 0o600 },
      );
    const privateDocs = path.join(root, ".local", "private-docs");
    fs.mkdirSync(privateDocs, { recursive: true });
    const accountDoc = path.join(privateDocs, "API_ACCOUNTS.md");
    if (!fs.existsSync(accountDoc))
      fs.writeFileSync(
        accountDoc,
        `# 本地 API 测试账号\n\n仅用于本机虚构数据，禁止用于生产。账号密码由首次初始化随机生成。\n\n| 账号 | 角色与范围 |\n|---|---|\n| admin | 管理员，查看两台设备 |\n| reporter.a | 张明，仅授权 AC-001 |\n| reporter.b | 刘欣，仅授权 WP-002 |\n| technician | 王志远，尚无设备访问权 |\n\n共同测试密码：\`${credentials.seedPassword}\`\n\n浏览器入口：http://127.0.0.1:5173/service/devices\n`,
        { flag: "wx", mode: 0o600 },
      );
    console.log(
      "Project database ready. Connection configuration and account instructions saved to ignored local files.",
    );
  } else if (action === "start") start();
  else if (action === "stop") {
    if (running())
      execute("pg_ctl", ["stop", "-D", data, "-m", "fast", "-w", "-t", "30"]);
    console.log("Project PostgreSQL stopped.");
  } else if (action === "status")
    console.log(
      running()
        ? "Project PostgreSQL is running."
        : "Project PostgreSQL is stopped.",
    );
  else throw new Error("Supported actions: setup, start, stop, status");
} catch (error) {
  // Do not echo command output: provisioning SQL and subprocess errors can contain secrets.
  console.error(
    error instanceof Error && !("stderr" in error)
      ? error.message
      : "PostgreSQL operation failed; inspect the ignored local server.log and environment.",
  );
  process.exitCode = 1;
}
