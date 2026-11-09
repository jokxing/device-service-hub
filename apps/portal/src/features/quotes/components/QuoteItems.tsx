import type { QuoteRecord } from "@device-service-hub/contracts";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import styles from "../quotes.module.css";

export default function QuoteItems({ items }: { items: QuoteRecord["items"] }) {
  return (
    <div className={styles.items}>
      {items.map((item, index) => (
        <div className={styles.item} key={index}>
          <div className={styles.row}>
            <strong>{item.name}</strong>
            <span>¥{formatCents(item.amountCents)}</span>
          </div>
          <p className={styles.meta}>
            数量 {item.quantity} × 单价 ¥{formatCents(item.unitPriceCents)}
          </p>
          {item.note && <p className={styles.note}>{item.note}</p>}
        </div>
      ))}
    </div>
  );
}
