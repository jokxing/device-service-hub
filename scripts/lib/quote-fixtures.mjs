import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { taskFixtures } from "./task-fixtures.mjs";

export function quoteFixtures(local, db, prefix) {
  const fixtures = taskFixtures(local, db, prefix);
  async function quotedTask(
    owner,
    { title = "维修报价验收 " + Date.now() } = {},
  ) {
    const ticket = await fixtures.task(owner, { serviceMode: "quoted", title });
    const result = await local.request(`/tickets/${ticket.id}/quote`, {
      cookie: owner.cookie,
      method: "POST",
      body: {
        requestId: randomUUID(),
        expectedVersion: ticket.version,
        items: [
          {
            name: "更换接线端子",
            quantity: 3,
            unitPriceCents: 1999,
            note: "含安装与接线复检",
          },
          { name: "故障检测", quantity: 1, unitPriceCents: 1, note: "" },
        ],
      },
    });
    assert.equal(result.response.status, 201, JSON.stringify(result.value));
    return {
      ticket: { ...ticket, version: ticket.version + 1 },
      quote: result.value,
    };
  }
  async function orderedTask(owner, options) {
    const value = await quotedTask(owner, options);
    const { reporter } = await fixtures.identities();
    const acceptanceInput = {
      requestId: randomUUID(),
      expectedVersion: value.ticket.version,
      quoteId: value.quote.id,
      quoteRevision: value.quote.revision,
    };
    const result = await local.request(
      `/tickets/${value.ticket.id}/quote/accept`,
      { cookie: reporter, method: "POST", body: acceptanceInput },
    );
    assert.equal(result.response.status, 201, JSON.stringify(result.value));
    return {
      ...value,
      ticket: { ...value.ticket, version: value.ticket.version + 1 },
      quote: { ...value.quote, status: "accepted" },
      order: result.value,
      acceptanceInput,
    };
  }
  return { ...fixtures, quotedTask, orderedTask };
}
