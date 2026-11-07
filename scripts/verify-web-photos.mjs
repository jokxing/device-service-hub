import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { openLocalApi } from "./lib/local-api.mjs";
import { nativeRequest } from "./lib/native-api.mjs";
import { photoRequest, uploadPhoto } from "./lib/photo-api.mjs";
import { openLocalBrowser } from "./lib/browser.mjs";

const local = openLocalApi();
const db = await local.connectDatabase();
const tickets = [];
let token, browser;
const base = (id) => `/admin/tickets/${id}/photos`;
try {
  await local.waitForApi();
  const login = await nativeRequest("/mobile/auth/login", {
    method: "POST",
    body: {
      username: "reporter.a",
      password: process.env.SEED_ACCOUNT_PASSWORD,
    },
  });
  assert.equal(login.status, 200);
  token = login.value.accessToken;
  const title = "现场照片浏览器验收 " + randomUUID().slice(0, 8);
  for (const suffix of ["", "（无照片）"]) {
    const created = await nativeRequest("/mobile/tickets", {
      token,
      method: "POST",
      body: {
        requestId: randomUUID(),
        deviceId: "device-ac001",
        title: title + suffix,
        description: "本轮随机工单，使用生成的纯色照片。",
        priority: "normal",
      },
    });
    assert.equal(created.status, 201);
    tickets.push(created.value.id);
  }
  const [id, emptyId] = tickets;
  const photoId = randomUUID();
  const image = await sharp({
    create: { width: 640, height: 360, channels: 3, background: "#2764e7" },
  })
    .png()
    .toBuffer();
  assert.equal((await uploadPhoto(token, id, photoId, image)).status, 201);
  for (const sample of [
    { width: 240, height: 640, background: "#d97706" },
    { width: 600, height: 600, background: "#0d9488" },
  ]) {
    const buffer = await sharp({ create: { ...sample, channels: 3 } })
      .png()
      .toBuffer();
    assert.equal(
      (await uploadPhoto(token, id, randomUUID(), buffer)).status,
      201,
    );
  }
  const admin = await local.login("admin");
  const listPath = base(id),
    contentPath = `${listPath}/${photoId}`;
  assert.equal((await photoRequest(listPath)).status, 401);
  assert.equal((await photoRequest(contentPath)).status, 401);
  assert.equal(
    (await photoRequest(contentPath, { token })).status,
    401,
    "Web endpoint does not accept native Bearer",
  );
  const adminHeaders = { Cookie: admin };
  const list = await photoRequest(listPath, { headers: adminHeaders });
  assert.equal(list.status, 200);
  assert.deepEqual(Object.keys(list.value[0]).sort(), [
    "bytes",
    "createdAt",
    "height",
    "id",
    "width",
  ]);
  const content = await photoRequest(contentPath, { headers: adminHeaders });
  assert.equal(content.status, 200);
  assert.equal(content.headers["content-type"], "image/webp");
  assert.equal(content.headers["cache-control"], "no-store");
  assert.equal(content.headers["x-content-type-options"], "nosniff");
  assert.equal((await sharp(content.buffer).metadata()).format, "webp");
  for (const username of ["reporter.a", "reporter.b", "technician"]) {
    const cookie = await local.login(username);
    for (const route of [listPath, contentPath])
      assert.equal(
        (await photoRequest(route, { headers: { Cookie: cookie } })).status,
        403,
      );
  }
  assert.equal(
    (await photoRequest(base(randomUUID()), { headers: adminHeaders })).status,
    404,
  );
  assert.equal(
    (
      await photoRequest(`${base(emptyId)}/${photoId}`, {
        headers: adminHeaders,
      })
    ).status,
    404,
    "Photo must belong to URL ticket",
  );
  assert.equal(
    (
      await photoRequest(contentPath, {
        method: "POST",
        headers: { ...adminHeaders, Origin: "http://127.0.0.1:5173" },
      })
    ).status,
    404,
    "No Web upload route",
  );

  browser = await openLocalBrowser("web-photos-browser-profile");
  const { context, page, screenshots, errors } = browser;
  const separator = admin.indexOf("=");
  await context.addCookies([
    {
      name: admin.slice(0, separator),
      value: admin.slice(separator + 1),
      domain: "127.0.0.1",
      path: "/api",
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
  await page.goto("http://127.0.0.1:5173/service/admin/tickets", {
    waitUntil: "networkidle",
  });
  const row = (recordTitle) =>
    page.locator("tbody tr.ant-table-row").filter({ hasText: recordTitle });
  // The empty fixture shares the title prefix; select by complete title text.
  const photoRow = page
    .locator("tbody tr.ant-table-row")
    .filter({ has: page.getByText(title, { exact: true }) });
  await photoRow.getByRole("button", { name: /^详\s*情$/ }).click();
  const section = page.getByRole("region", { name: "现场照片", exact: true });
  const photo = section.getByAltText("现场照片 1", { exact: true });
  await photo.waitFor();
  await section.getByAltText("现场照片 3", { exact: true }).waitFor();
  assert.equal(
    await photo.evaluate((img) => img.complete && img.naturalWidth === 640),
    true,
  );
  assert.ok((await photo.getAttribute("src")).startsWith("blob:"));
  await page
    .getByRole("dialog")
    .screenshot({ path: path.join(screenshots, "service-admin-photos.png") });
  await photo.click();
  await page.locator(".ant-image-preview").waitFor({ state: "visible" });
  await page.locator(".ant-image-preview").evaluate(async (element) => {
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
    await Promise.all(
      element
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished.catch(() => {})),
    );
  });
  await page.screenshot({
    path: path.join(screenshots, "service-admin-photo-preview.png"),
  });
  await page.keyboard.press("Escape");
  await page.locator(".ant-image-preview").waitFor({ state: "hidden" });

  // Read failures must allow explicit retry and never expose a stale image.
  let failList = true;
  await page.route(`**/api${listPath}`, async (route) => {
    if (failList) {
      failList = false;
      await route.fulfill({
        status: 503,
        json: { message: "照片列表暂不可用" },
      });
    } else await route.continue();
  });
  await section.getByRole("button", { name: /刷新照片$/ }).click();
  await section.getByText("照片列表暂不可用", { exact: true }).waitFor();
  assert.equal(
    await section.getByAltText("现场照片 1", { exact: true }).count(),
    0,
  );
  await section.getByRole("button", { name: /^重\s*试$/ }).click();
  await photo.waitFor();
  let failImage = true;
  await page.route(`**/api${contentPath}`, async (route) => {
    if (failImage) {
      await route.fulfill({ status: 503, json: { message: "照片暂不可用" } });
    } else await route.continue();
  });
  await section.getByRole("button", { name: /刷新照片$/ }).click();
  await section.getByText("现场照片 1 加载失败", { exact: true }).waitFor();
  failImage = false;
  await section
    .getByRole("button", { name: "重试照片 1", exact: true })
    .click();
  await photo.waitFor();

  await page.setViewportSize({ width: 390, height: 844 });
  const dialog = page.getByRole("dialog");
  await section.scrollIntoViewIfNeeded();
  const box = await dialog.boundingBox();
  assert.ok(box.x >= 0 && box.x + box.width <= 391);
  assert.equal(
    await section.evaluate((el) => el.scrollWidth <= el.clientWidth),
    true,
  );
  await dialog.screenshot({
    path: path.join(screenshots, "service-admin-photos-mobile.png"),
  });
  const oldUrl = await photo.getAttribute("src");
  await dialog.getByRole("button", { name: "关闭", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  assert.equal(
    await page.evaluate(async (url) => {
      try {
        await fetch(url);
        return true;
      } catch {
        return false;
      }
    }, oldUrl),
    false,
    "Object URL revoked on close",
  );
  await page.setViewportSize({ width: 1440, height: 1100 });
  await row(title + "（无照片）")
    .getByRole("button", { name: /^详\s*情$/ })
    .click();
  await section.getByText("暂无现场照片", { exact: true }).waitFor();
  await dialog.getByRole("button", { name: "关闭", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  await photoRow.getByRole("button", { name: /^详\s*情$/ }).click();
  await photo.waitFor();
  await page.route(`**/api${contentPath}`, (route) =>
    route.fulfill({ status: 401, json: { message: "登录已过期" } }),
  );
  await section.getByRole("button", { name: /刷新照片$/ }).click();
  await page.waitForURL("**/login");
  assert.equal(await page.getByRole("region", { name: "现场照片" }).count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        result: "passed",
        checks: [
          "Cookie-only admin reads, metadata whitelist, no-store WebP",
          "Non-admin/Bearer/anonymous denied; wrong ticket and missing photo rejected",
          "Real native upload shown on Web, preview, empty state and explicit list/image retry",
          "390px layout, close cleanup and photo 401 clears session",
        ],
        screenshots,
      },
      null,
      2,
    ),
  );
} catch (error) {
  if (browser)
    await fs.writeFile(
      path.join(local.root, ".local/web-photos-failure.txt"),
      await browser.page.locator("body").ariaSnapshot(),
    );
  if (browser)
    await browser.page.screenshot({
      path: path.join(local.root, ".local/web-photos-failure.png"),
      fullPage: true,
    });
  throw error;
} finally {
  await browser?.context.close();
  const rows = await db.query(
    'SELECT "storageKey" FROM "TicketPhoto" WHERE "ticketId"=ANY($1::text[])',
    [tickets],
  );
  await db.query('DELETE FROM "Ticket" WHERE "id"=ANY($1::text[])', [tickets]);
  for (const { storageKey } of rows.rows)
    await fs.unlink(
      path.join(local.root, ".local/uploads/ticket-photos", storageKey),
    );
  if (token)
    await nativeRequest("/mobile/auth/logout", { token, method: "POST" }).catch(
      () => {},
    );
  await local.dispose();
  await db.end();
}
