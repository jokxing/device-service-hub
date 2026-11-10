import type { QuoteItemInput, TicketServiceMode, TicketStatus } from "./index";

export const QUOTE_LIMITS = {
  items: 20,
  name: 60,
  note: 200,
  rejectionReason: 500,
  serviceModeReason: 500,
  quantity: 999,
  unitPriceCents: 10_000_000,
  totalCents: 100_000_000,
} as const;

/** Display eligibility; the API also checks related quote/order rows under lock. */
export function canRequireQuote(ticket: {
  serviceMode: TicketServiceMode;
  status: TicketStatus;
  result: unknown;
  confirmation: unknown;
}): boolean {
  return (
    ticket.serviceMode === "direct" &&
    (ticket.status === "assigned" || ticket.status === "processing") &&
    !ticket.result &&
    !ticket.confirmation
  );
}

/** Integer cents only. UI estimation shares these rules; the API recomputes independently. */
export function calculateQuote(items: readonly QuoteItemInput[]) {
  if (items.length < 1 || items.length > QUOTE_LIMITS.items)
    throw new Error(`报价需要 1～${QUOTE_LIMITS.items} 个条目`);
  let totalCents = 0;
  const amounts = items.map((item) => {
    if (
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > QUOTE_LIMITS.quantity ||
      !Number.isInteger(item.unitPriceCents) ||
      item.unitPriceCents < 0 ||
      item.unitPriceCents > QUOTE_LIMITS.unitPriceCents
    )
      throw new Error("数量或单价超出报价范围");
    const amountCents = item.quantity * item.unitPriceCents;
    totalCents += amountCents;
    if (totalCents > QUOTE_LIMITS.totalCents)
      throw new Error("报价总额不能超过 1,000,000.00 元");
    return amountCents;
  });
  if (totalCents === 0)
    throw new Error("报价总额必须大于零，免费服务使用直接处理");
  return { totalCents, amounts };
}

/** Parse decimal text without multiplying a floating point price. */
export function parsePriceCents(value: string): number {
  if (!/^(0|[1-9]\d{0,6})(\.\d{1,2})?$/.test(value))
    throw new Error("单价须为非负金额，最多两位小数");
  const [whole, fraction = ""] = value.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (cents > QUOTE_LIMITS.unitPriceCents)
    throw new Error("单价不能超过 100,000.00 元");
  return cents;
}

export function formatCents(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0)
    throw new Error("金额必须为非负整数分");
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}
