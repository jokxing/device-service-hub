import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";
const local = openLocalApi(),
  db = await local.connectDatabase(),
  f = quoteFixtures(local, db, "payment.utc");
try {
  await local.waitForApi();
  const { reporter } = await f.identities(),
    tech = await f.technician("支付时间校验维修员");
  for (const zone of ["UTC", "Asia/Shanghai", "Pacific/Kiritimati"]) {
    const v = await f.orderedTask(tech);
    await db.query("BEGIN");
    try {
      await db.query("SELECT set_config('TimeZone',$1,true)", [zone]);
      const result = await db.query(
        `INSERT INTO "PaymentAttempt" (id,"orderId","actorId","requestId","amountCents") VALUES ($1,$2,$3,$4,$5) RETURNING EXTRACT(EPOCH FROM ("expiresAt"-"createdAt"))*1000 AS duration,abs(EXTRACT(EPOCH FROM ("createdAt"-(clock_timestamp() AT TIME ZONE 'UTC')))) AS skew`,
        [
          randomUUID(),
          v.order.id,
          "user-reporter-a",
          randomUUID(),
          v.order.totalCents,
        ],
      );
      assert.ok(Math.abs(Number(result.rows[0].duration) - 900000) < 10);
      assert.ok(Number(result.rows[0].skew) < 2);
    } finally {
      await db.query("ROLLBACK");
    }
  }
  const v = await f.orderedTask(tech),
    r = await local.request(`/orders/${v.order.id}/payments`, {
      cookie: reporter,
      method: "POST",
      body: { requestId: randomUUID() },
    });
  assert.equal(r.response.status, 201);
  assert.equal(
    Date.parse(r.value.expiresAt) - Date.parse(r.value.createdAt),
    900000,
  );
  assert.ok(Math.abs(Date.now() - Date.parse(r.value.createdAt)) < 5000);
  console.log(
    "Payment UTC: UTC/Shanghai/UTC+14 database defaults and API exact 15 minute deadline passed.",
  );
} finally {
  await f.cleanup();
  await db.end();
}
