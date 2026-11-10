import type { QuoteRecord } from "@device-service-hub/contracts";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import { formatDate } from "../../../shared/utils/date";
import pageStyles from "../../../shared/components/PortalPage.module.css";
import styles from "../quotes.module.css";
import QuoteItems from "./QuoteItems";
import { QUOTE_STATUS_LABELS } from "../constants";

export default function QuoteDetails({ quote }: { quote: QuoteRecord }) {
  return (
    <article
      className={`${pageStyles.card} ${styles.section}`}
      aria-label="维修报价"
    >
      <div className={styles.row}>
        <h2 className={pageStyles.cardTitle}>
          维修报价 · 第 {quote.revision} 版
        </h2>
        <span className={styles.status}>
          {QUOTE_STATUS_LABELS[quote.status]}
        </span>
      </div>
      <p className={styles.meta}>
        {quote.actor.name} · {formatDate(quote.createdAt)}
      </p>
      <QuoteItems items={quote.items} />
      <p className={styles.total}>
        报价合计：¥{formatCents(quote.totalCents)}（人民币）
      </p>
      <p className={styles.meta}>
        {quote.status === "pending"
          ? "请核对本版维修项目、数量与金额。确认报价将生成服务订单，不代表已付款或维修已开始。"
          : quote.status === "accepted"
            ? "本版报价已确认，服务订单见下方。报价确认不代表已付款或维修已开始。"
            : "本版报价已拒绝，未生成服务订单。工单仍在处理中；如需调整方案，请联系服务方。"}
      </p>
      {quote.rejection && (
        <div aria-label="报价拒绝记录">
          <p className={styles.meta}>
            {quote.rejection.actor.name} ·{" "}
            {formatDate(quote.rejection.createdAt)}
          </p>
          <p className={styles.note}>拒绝原因：{quote.rejection.reason}</p>
        </div>
      )}
    </article>
  );
}
