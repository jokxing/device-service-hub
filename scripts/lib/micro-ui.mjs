import assert from "node:assert/strict";

export async function assertShellContentScroll(page, screenshotPath) {
  const nav = page.getByRole("navigation", { name: "协同台导航", exact: true });
  const content = page.getByRole("main", { name: "协同台内容", exact: true });
  const before = await nav.boundingBox();
  const overflow = await content.evaluate(
    (el) => el.scrollHeight > el.clientHeight,
  );
  assert.equal(overflow, true, "Long content overflows inside the shell");
  await content.evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(resolve)),
  );
  assert.ok(await content.evaluate((el) => el.scrollTop > 0));
  const after = await nav.boundingBox();
  assert.equal(
    after.y,
    before.y,
    "Navigation stays fixed while content scrolls",
  );
  assert.equal(await page.evaluate(() => window.scrollY), 0);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollHeight <= innerHeight + 1,
    ),
    true,
    "No document scrollbar",
  );
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await content.evaluate((el) => el.scrollTo(0, 0));
}
