import { Collapse } from "antd";
import type { QuoteRecord } from "@device-service-hub/contracts";
import { QUOTE_STATUS_META } from "../constants";
import QuoteSummary from "./QuoteSummary";

export default function QuoteHistory({ quotes }: { quotes: QuoteRecord[] }) {
  if (!quotes.length) return null;
  return (
    <section aria-label="历史报价">
      <h3>历史报价</h3>
      <Collapse
        items={quotes.map((quote) => ({
          key: quote.id,
          label: `第 ${quote.revision} 版 · ${QUOTE_STATUS_META[quote.status].label}`,
          children: <QuoteSummary quote={quote} />,
        }))}
      />
    </section>
  );
}
