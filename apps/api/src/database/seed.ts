import "reflect-metadata";
import { DatabaseService } from "./database.service";
import { hashPassword } from "../modules/auth/utils/password";

async function seed() {
  const password = process.env.SEED_ACCOUNT_PASSWORD;
  if (!password || password.startsWith("REPLACE") || password.length < 16)
    throw new Error("Configure a random local seed password first.");
  const database = new DatabaseService();
  await database.$connect();
  try {
    const users = [
      {
        id: "user-admin",
        username: "admin",
        name: "陈管理员",
        role: "admin" as const,
      },
      {
        id: "user-reporter-a",
        username: "reporter.a",
        name: "张明",
        role: "reporter" as const,
      },
      {
        id: "user-reporter-b",
        username: "reporter.b",
        name: "刘欣",
        role: "reporter" as const,
      },
      {
        id: "user-technician",
        username: "technician",
        name: "王志远",
        role: "technician" as const,
      },
    ];
    const hashes = await Promise.all(users.map(() => hashPassword(password)));
    await database.$transaction(async (transaction) => {
      for (const [index, user] of users.entries())
        await transaction.user.upsert({
          where: { id: user.id },
          create: { ...user, passwordHash: hashes[index]! },
          update: {},
        });
      const devices = [
        {
          id: "device-ac001",
          code: "AC-001",
          name: "中央空调 · 一楼大厅",
          category: "空调设备",
          location: "A 座 · 1F 大厅",
          model: "KFR-120LW",
        },
        {
          id: "device-wp002",
          code: "WP-002",
          name: "循环水泵 · 二号机组",
          category: "动力设备",
          location: "B 座 · 地下设备间",
          model: "ISG 50-160",
        },
      ];
      for (const device of devices)
        await transaction.device.upsert({
          where: { id: device.id },
          create: device,
          update: {},
        });
      for (const grant of [
        { userId: "user-reporter-a", deviceId: "device-ac001" },
        { userId: "user-reporter-b", deviceId: "device-wp002" },
      ]) {
        await transaction.deviceAccess.upsert({
          where: { userId_deviceId: grant },
          create: grant,
          update: {},
        });
      }
    });
    console.log(
      "Local sample data ready: 4 accounts, 2 devices, 2 explicit access grants. Existing records were preserved.",
    );
  } finally {
    await database.$disconnect();
  }
}

seed().catch(() => {
  console.error(
    "Seed failed. Check local database configuration; no credentials are printed.",
  );
  process.exitCode = 1;
});
