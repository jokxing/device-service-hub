import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { nativeHttp } from "./lib/native-http.mjs";
import { createRemoteMobileGateway } from "./lib/remote-mobile-gateway.mjs";

const local = openLocalApi(),
  db = await local.connectDatabase();
const config = JSON.parse(
  await fs.readFile(
    path.join(local.root, ".local/remote-mobile/accounts.json"),
    "utf8",
  ),
);
const gateway = createRemoteMobileGateway(config);
gateway.listen(0, "127.0.0.1");
await once(gateway, "listening");
const remote = process.argv.includes("--public");
const base = remote
  ? JSON.parse(
      await fs.readFile(
        path.join(local.root, ".local/remote-mobile/endpoint.json"),
        "utf8",
      ),
    ).url
  : `http://127.0.0.1:${gateway.address().port}`;
const target = new URL(base);
assert(
  remote
    ? target.protocol === "https:" &&
        /^[a-z0-9-]+\.trycloudflare\.com$/.test(target.hostname) &&
        target.pathname === "/" &&
        !target.username &&
        !target.password &&
        !target.search &&
        !target.hash
    : target.hostname === "127.0.0.1",
);
const requests = [],
  tokens = [];
const reporterAccount = config.accounts.find((a) => a.role === "reporter");
const technicianAccount = config.accounts.find((a) => a.role === "technician");
async function call(route, token, body, expected = 200) {
  const response = await nativeHttp(base + "/api/mobile" + route, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  assert.equal(
    response.status,
    expected,
    `${route}: expected ${expected}, got ${response.status}`,
  );
  return response.status === 204 ? undefined : response.json();
}
const intent = (version) => ({
  requestId: randomUUID(),
  expectedVersion: version,
});
try {
  await local.waitForApi();
  const login = async (account) => {
    const value = await call("/auth/login", null, {
      username: account.username,
      password: account.password,
    });
    tokens.push(value.accessToken);
    return value.accessToken;
  };
  const reporter = await login(reporterAccount),
    tech = await login(technicianAccount);
  const admin = await local.login("admin");
  async function task() {
    const requestId = randomUUID();
    requests.push(requestId);
    let ticket = await call(
      "/tickets",
      reporter,
      {
        requestId,
        deviceId: config.device.id,
        title: "异地报价订单定向验收",
        description: "随机临时记录，验收后精确清理",
        priority: "normal",
      },
      201,
    );
    ticket = await readTicket(ticket.id);
    const assigned = await local.request(`/admin/tickets/${ticket.id}/assign`, {
      cookie: admin,
      method: "POST",
      body: {
        ...intent(ticket.version),
        assigneeId: technicianAccount.id,
        serviceMode: "quoted",
      },
    });
    assert.equal(assigned.response.status, 201);
    ticket = await call(
      `/tasks/${ticket.id}/accept`,
      tech,
      intent(assigned.value.version),
      201,
    );
    return call(`/tasks/${ticket.id}`, tech);
  }
  async function readTicket(id) {
    return call(`/tickets/${id}`, reporter);
  }
  async function submit(ticket) {
    const payload = {
      ...intent(ticket.version),
      items: [
        { name: "接线维护", quantity: 2, unitPriceCents: 1234, note: "含检测" },
      ],
    };
    await call(`/tasks/${ticket.id}/quote`, reporter, payload, 403);
    await call(
      `/tasks/${ticket.id}/quote`,
      tech,
      { ...payload, totalCents: 1 },
      400,
    );
    const quote = await call(`/tasks/${ticket.id}/quote`, tech, payload, 201);
    assert.equal(
      (await call(`/tasks/${ticket.id}/quote`, tech, payload, 201)).id,
      quote.id,
    );
    return quote;
  }
  const ticket = await task();
  let quote = await submit(ticket),
    current = await readTicket(ticket.id);
  await call(`/tasks/${ticket.id}/quote`, reporter, undefined, 403);
  assert.equal(
    (await call(`/tickets/${ticket.id}/quote`, reporter)).quote.id,
    quote.id,
  );
  await call(
    `/tickets/${ticket.id}/quote/reject`,
    reporter,
    {
      ...intent(current.version),
      quoteId: quote.id,
      quoteRevision: quote.revision,
      reason: "调整维修项目",
    },
    201,
  );
  current = await readTicket(ticket.id);
  quote = await call(
    `/tasks/${ticket.id}/quote/revisions`,
    tech,
    {
      ...intent(current.version),
      baseQuoteId: quote.id,
      baseQuoteRevision: quote.revision,
      items: [
        { name: "接线维护", quantity: 1, unitPriceCents: 1234, note: "修订" },
      ],
    },
    201,
  );
  current = await readTicket(ticket.id);
  const acceptance = {
    ...intent(current.version),
    quoteId: quote.id,
    quoteRevision: quote.revision,
  };
  const order = await call(
    `/tickets/${ticket.id}/quote/accept`,
    reporter,
    acceptance,
    201,
  );
  assert.equal(
    (
      await call(
        `/tickets/${ticket.id}/quote/accept`,
        reporter,
        acceptance,
        201,
      )
    ).id,
    order.id,
  );
  assert.equal(order.totalCents, 1234);
  assert.equal(
    (await call(`/orders/by-ticket/${ticket.id}`, reporter)).order.id,
    order.id,
  );
  assert.equal(
    (await call(`/tasks/${ticket.id}/order`, tech)).order.id,
    order.id,
  );
  assert.equal((await call(`/orders/${order.id}`, reporter)).id, order.id);
  const list = await call("/orders?page=1&status=awaiting_start", reporter);
  assert(JSON.stringify(list).includes(order.id));
  assert.deepEqual(
    (await call(`/orders/${order.id}/payments`, reporter)).payments,
    [],
  );
  await call(`/orders/${order.id}`, tech, undefined, 403);
  await call(`/orders/${order.id}/payments`, tech, undefined, 403);
  for (const route of [
    `/orders/${order.id}/payments`,
    `/orders/${order.id}/payments/${randomUUID()}/mock-success`,
    `/orders/${order.id}/payments/${randomUUID()}/refund`,
  ])
    await call(route, reporter, {}, 404);
  await call(`/orders/${randomUUID()}`, reporter, undefined, 404);
  await call(
    `/orders/${order.id}/start`,
    reporter,
    intent((await readTicket(ticket.id)).version),
    403,
  );
  const beforeStart = await readTicket(ticket.id);
  await call(
    `/tasks/${ticket.id}/result`,
    tech,
    { ...intent(beforeStart.version), description: "未开工不能提交" },
    409,
  );
  await call(
    `/orders/${order.id}/start`,
    tech,
    intent(beforeStart.version),
    201,
  );
  const processing = await readTicket(ticket.id);
  await call(
    `/tasks/${ticket.id}/result`,
    tech,
    { ...intent(processing.version), description: "已完成接线维护与复检" },
    201,
  );
  const waiting = await readTicket(ticket.id);
  await call(
    `/tickets/${ticket.id}/confirm`,
    reporter,
    intent(waiting.version),
    201,
  );
  const completed = await call(`/orders/${order.id}`, reporter);
  assert.equal(completed.status, "completed");
  assert.equal(completed.ticket.status, "completed");
  const cancelledTicket = await task(),
    cancelledQuote = await submit(cancelledTicket);
  current = await readTicket(cancelledTicket.id);
  const cancelledOrder = await call(
    `/tickets/${cancelledTicket.id}/quote/accept`,
    reporter,
    {
      ...intent(current.version),
      quoteId: cancelledQuote.id,
      quoteRevision: cancelledQuote.revision,
    },
    201,
  );
  current = await readTicket(cancelledTicket.id);
  const cancellation = { ...intent(current.version), reason: "计划调整" };
  await call(
    `/orders/${cancelledOrder.id}/cancel`,
    reporter,
    cancellation,
    201,
  );
  await call(
    `/orders/${cancelledOrder.id}/cancel`,
    reporter,
    cancellation,
    201,
  );
  assert.equal(
    (await call(`/orders/${cancelledOrder.id}`, reporter)).status,
    "cancelled",
  );
  console.log(
    JSON.stringify(
      {
        result: "passed",
        transport: remote ? "existing-temporary-https" : "local-gateway",
        checks: [
          "dedicated accounts and native roles",
          "quote submit/replay/reject/revision",
          "exact-version acceptance and unique order",
          "list/detail/task-order/read-only payments",
          "start/result/confirmation and cancellation replay",
          "financial writes blocked",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  for (const token of tokens)
    await nativeHttp("http://127.0.0.1:3001/api/mobile/auth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  await db.query(
    'DELETE FROM "Ticket" WHERE "requestId"=ANY($1::uuid[]) AND "reporterId"=$2',
    [requests, reporterAccount.id],
  );
  await local.dispose();
  await db.end();
  gateway.close();
  gateway.closeAllConnections();
}
