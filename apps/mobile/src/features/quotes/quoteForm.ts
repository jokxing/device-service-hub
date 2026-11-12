import type { QuoteItemInput } from "@device-service-hub/contracts";
import {
  calculateQuote,
  parsePriceCents,
  QUOTE_LIMITS,
} from "@device-service-hub/contracts/quote-rules";
export interface QuoteDraftItem {
  id: string;
  name: string;
  quantity: string;
  price: string;
  note: string;
}
export function normalizeQuoteItems(
  drafts: readonly QuoteDraftItem[],
): QuoteItemInput[] {
  const items = drafts.map((d) => {
    const name = d.name.trim(),
      note = d.note.trim();
    if (!name || name.length > QUOTE_LIMITS.name)
      throw new Error("请填写有效的项目名称");
    if (!/^[1-9]\d*$/.test(d.quantity)) throw new Error("数量须为正整数");
    if (note.length > QUOTE_LIMITS.note) throw new Error("备注超出长度限制");
    return {
      name,
      note,
      quantity: Number(d.quantity),
      unitPriceCents: parsePriceCents(d.price),
    };
  });
  calculateQuote(items);
  return items;
}
