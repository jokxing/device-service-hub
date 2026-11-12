import assert from "node:assert/strict";
import test from "node:test";
import { formatDateTime } from "../apps/mobile/src/shared/utils/date.ts";
test("本地时间固定补零且不显示 ISO UTC 文本", () => {
  const d = new Date(2026, 10, 10, 23, 22, 57);
  assert.equal(formatDateTime(d.toISOString()), "2026-11-10 23:22:57");
  assert.equal(formatDateTime("bad"), "—");
});
