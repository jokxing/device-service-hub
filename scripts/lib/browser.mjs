import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

export async function openLocalBrowser(profile = "browser-profile") {
  const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../..",
  );
  const local = path.join(root, ".local");
  const screenshots = path.join(root, "docs", "screenshots");
  for (const directory of [
    "temp",
    "appdata",
    "localappdata",
    profile,
    `${profile}-cache`,
  ])
    await fs.mkdir(path.join(local, directory), { recursive: true });
  await fs.mkdir(screenshots, { recursive: true });
  process.env.TEMP = process.env.TMP = path.join(local, "temp");
  process.env.APPDATA = path.join(local, "appdata");
  process.env.LOCALAPPDATA = path.join(local, "localappdata");
  const context = await chromium.launchPersistentContext(
    path.join(local, profile),
    {
      executablePath:
        process.env.DSH_BROWSER_PATH ??
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      headless: true,
      acceptDownloads: false,
      viewport: { width: 1440, height: 1100 },
      deviceScaleFactor: 1,
      args: [
        `--disk-cache-dir=${path.join(local, `${profile}-cache`)}`,
        "--disable-crash-reporter",
        "--no-first-run",
        "--disable-background-networking",
      ],
    },
  );
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return { root, context, page, screenshots, errors };
}
