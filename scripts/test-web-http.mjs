import assert from "node:assert/strict";
import test from "node:test";
import {
  apiRequest,
  apiImageRequest,
  ApiError,
} from "../apps/web/src/shared/api/http.ts";

test("读取与写入超时只发送一次请求，并区分结果不明的写操作", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const fetch = t.mock.method(
    globalThis,
    "fetch",
    (_url, { signal }) =>
      new Promise((_resolve, reject) =>
        signal.addEventListener("abort", () => reject(signal.reason)),
      ),
  );
  for (const method of ["GET", "POST"]) {
    const checked = assert.rejects(
      apiRequest("/devices", { method }),
      (error) =>
        error instanceof ApiError &&
        error.status === 408 &&
        error.message.includes(method === "POST" ? "核对操作结果" : "稍后重试"),
    );
    t.mock.timers.tick(20000);
    await checked;
  }
  assert.equal(fetch.mock.callCount(), 2);
});

test("JSON 和图片响应体也受超时限制，收到响应头不提前结束计时", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  t.mock.method(
    globalThis,
    "fetch",
    async (_url, { signal }) =>
      new Response(
        new ReadableStream({
          start(controller) {
            signal.addEventListener("abort", () =>
              controller.error(signal.reason),
            );
          },
        }),
        { headers: { "Content-Type": "image/webp" } },
      ),
  );
  for (const load of [apiRequest, apiImageRequest]) {
    const checked = assert.rejects(
      load("/slow-body"),
      (error) => error instanceof ApiError && error.status === 408,
    );
    await Promise.resolve();
    t.mock.timers.tick(20000);
    await checked;
  }
});

test("调用方取消保留原原因，已取消请求不发送，并解除监听", async (t) => {
  const fetch = t.mock.method(
    globalThis,
    "fetch",
    (_url, { signal }) =>
      new Promise((_resolve, reject) =>
        signal.addEventListener("abort", () => reject(signal.reason)),
      ),
  );
  const controller = new AbortController();
  const remove = t.mock.method(controller.signal, "removeEventListener");
  const checked = assert.rejects(
    apiRequest("/devices", { signal: controller.signal }),
    (error) => error === "leave-page",
  );
  controller.abort("leave-page");
  await checked;
  await assert.rejects(
    apiRequest("/devices", { signal: controller.signal }),
    (error) => error === "leave-page",
  );
  assert.equal(fetch.mock.callCount(), 1);
  assert.equal(remove.mock.callCount(), 2);
});

test("保留 401、DTO 校验信息与 204 语义，并统一禁用缓存", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () =>
    Response.json({ message: "登录已过期" }, { status: 401 }),
  );
  await assert.rejects(
    apiRequest("/auth/me"),
    (error) => error instanceof ApiError && error.status === 401,
  );
  fetch.mock.mockImplementation(async () =>
    Response.json({ message: ["名称必填", "数量无效"] }, { status: 400 }),
  );
  await assert.rejects(apiRequest("/tickets"), {
    message: "名称必填；数量无效",
  });
  fetch.mock.mockImplementation(
    async () => new Response(null, { status: 204 }),
  );
  assert.equal(await apiRequest("/auth/logout", { method: "POST" }), undefined);
  for (const call of fetch.mock.calls) {
    assert.equal(call.arguments[1].cache, "no-store");
    assert.equal(call.arguments[1].credentials, "same-origin");
  }
});

test("连接失败提供可读反馈且不自动重试", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => {
    throw new TypeError("Failed to fetch");
  });
  await assert.rejects(apiRequest("/devices"), {
    message: "无法连接设备服务，请检查连接后重试",
  });
  assert.equal(fetch.mock.callCount(), 1);
});
