import type { QuoteRecord } from "@device-service-hub/contracts";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import { formatDate } from "../../../shared/utils/date";
import QuoteItems from "./QuoteItems";
import QuoteStatus from "./QuoteStatus";
import styles from "../quotes.module.css";

function statusNote(quote: QuoteRecord) {
  if (quote.status === "pending")
    return "请核对本版维修项目、数量与金额。确认报价将生成服务订单，不代表已付款或维修已开始。";
  if (quote.status === "accepted")
    return "本版报价已确认，服务订单见下方。报价确认不代表已付款或维修已开始。";
  return "本版报价已拒绝，未生成服务订单。工单仍在处理中；如需调整方案，请联系服务方。";
}

export default function QuoteDetails({ quote }: { quote: QuoteRecord }) {
  return (
    <article className={styles.panel} aria-label="维修报价">
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>维修报价 · 第 {quote.revision} 版</h2>
        <QuoteStatus status={quote.status} />
      </div>
      <div className={styles.panelBody}>
        <p className={styles.metaLine}>
          {quote.actor.name} · {formatDate(quote.createdAt)}
        </p>
        <section className={styles.notePanel} aria-label="报价条目">
          <h3>报价条目</h3>
          <QuoteItems items={quote.items} />
        </section>
        <p className={styles.total}>
          报价合计：¥{formatCents(quote.totalCents)}（人民币）
        </p>
        <p className={styles.statusNotice}>{statusNote(quote)}</p>
        {quote.rejection && (
          <section className={styles.notePanel} aria-label="报价拒绝记录">
            <h3>拒绝记录</h3>
            <p className={styles.metaLine}>
              {quote.rejection.actor.name} ·{" "}
              {formatDate(quote.rejection.createdAt)}
            </p>
            <p className={styles.note}>拒绝原因：{quote.rejection.reason}</p>
          </section>
        )}
      </div>
    </article>
  );
}
