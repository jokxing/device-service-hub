import { Tag } from "antd";
import type { QuoteRecord } from "@device-service-hub/contracts";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import { formatDateTime } from "../../../shared/utils/date";
import styles from "../quotes.module.css";
import { QUOTE_STATUS_META } from "../constants";

export default function QuoteSummary({ quote }: { quote: QuoteRecord }) {
  return (
    <div aria-label="报价明细">
      <div className={styles.row}>
        <strong>报价第 {quote.revision} 版</strong>
        <Tag color={QUOTE_STATUS_META[quote.status].color}>
          {QUOTE_STATUS_META[quote.status].label}
        </Tag>
      </div>
      <p className={`muted ${styles.meta}`}>
        {quote.actor.name} · {formatDateTime(new Date(quote.createdAt))}
      </p>
      <div className={styles.items}>
        {quote.items.map((item, index) => (
          <article key={index} className={styles.item}>
            <div className={styles.row}>
              <strong>{item.name}</strong>
              <span>¥{formatCents(item.amountCents)}</span>
            </div>
            <div className="muted">
              数量 {item.quantity} × 单价 ¥{formatCents(item.unitPriceCents)}
            </div>
            {item.note && <p className={styles.note}>{item.note}</p>}
          </article>
        ))}
      </div>
      <p className={styles.total}>
        报价合计：¥{formatCents(quote.totalCents)}（人民币）
      </p>
      <p className="muted">
        {quote.status === "accepted"
          ? "用户已确认本版报价并生成服务订单；报价确认不代表已付款。"
          : quote.status === "rejected"
            ? "用户已拒绝本版报价，未生成服务订单；工单仍在处理中。"
            : "本报价已保存，尚未获用户确认，不代表订单成立或付款。"}
      </p>
      {quote.rejection && (
        <div aria-label="报价拒绝记录">
          <p className="muted">
            {quote.rejection.actor.name} ·{" "}
            {formatDateTime(new Date(quote.rejection.createdAt))}
          </p>
          <p className={styles.note}>拒绝原因：{quote.rejection.reason}</p>
        </div>
      )}
    </div>
  );
}
