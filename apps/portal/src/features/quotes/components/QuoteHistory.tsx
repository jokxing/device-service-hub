import { Collapse } from "antd";
import type { QuoteRecord } from "@device-service-hub/contracts";
import { QUOTE_STATUS_LABELS } from "../constants";
import QuoteDetails from "./QuoteDetails";
import styles from "../quotes.module.css";

export default function QuoteHistory({ quotes }: { quotes: QuoteRecord[] }) {
  if (!quotes.length) return null;
  return (
    <section aria-label="历史报价" className={styles.section}>
      <h2>历史报价</h2>
      <Collapse
        items={quotes.map((quote) => ({
          key: quote.id,
          label: `第 ${quote.revision} 版 · ${QUOTE_STATUS_LABELS[quote.status]}`,
          children: <QuoteDetails quote={quote} />,
        }))}
      />
    </section>
  );
}
