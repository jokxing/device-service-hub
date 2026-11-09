import type { QuoteItemInput } from "@device-service-hub/contracts";
import { parsePriceCents } from "@device-service-hub/contracts/quote-rules";
import type { QuoteFormItem } from "./types";

export function createEmptyQuoteItem(): QuoteFormItem {
  return { name: "", quantity: 1, unitPrice: "", note: "" };
}

export function toQuoteItems(items: QuoteFormItem[]): QuoteItemInput[] {
  return items.map((item) => ({
    name: (item.name ?? "").trim(),
    quantity: item.quantity,
    unitPriceCents: parsePriceCents(item.unitPrice ?? ""),
    note: (item.note ?? "").trim(),
  }));
}
