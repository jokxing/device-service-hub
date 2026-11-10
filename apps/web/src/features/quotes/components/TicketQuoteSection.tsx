import { useCallback, useState } from "react";
import { Alert, Button, Empty, Spin } from "antd";
import type { TaskTicketRecord } from "@device-service-hub/contracts";
import { useSession } from "../../auth/sessionContext";
import { useApiResource } from "../../../shared/hooks/useApiResource";
import ContentCard from "../../../shared/components/ContentCard";
import { quotesApi } from "../api";
import { canSubmitQuote, canReviseQuote } from "../quoteRules";
import QuoteSummary from "./QuoteSummary";
import SubmitQuoteModal from "./SubmitQuoteModal";
import QuoteHistory from "./QuoteHistory";
import styles from "../quotes.module.css";

export default function TicketQuoteSection({
  ticketId,
  task,
  onSubmitted,
}: {
  ticketId: string;
  task?: TaskTicketRecord;
  onSubmitted?: () => void;
}) {
  const { clearSession } = useSession();
  const load = useCallback(
    (signal: AbortSignal) => quotesApi.history(ticketId, signal),
    [ticketId, task?.version],
  );
  const { data, error, loading, refresh } = useApiResource(load, clearSession);
  const [editing, setEditing] = useState(false);
  const quote = data?.[0];
  function closeAndRefresh() {
    setEditing(false);
    refresh();
    onSubmitted?.();
  }
  return (
    <>
      <ContentCard
        title="维修报价"
        extra={
          <Button loading={loading} onClick={closeAndRefresh}>
            刷新报价
          </Button>
        }
      >
        <div className={styles.content}>
          {error ? (
            <Alert type="error" showIcon title={error} />
          ) : loading ? (
            <Spin />
          ) : quote ? (
            <>
              <QuoteSummary quote={quote} />
              {task && canReviseQuote(task, quote) && (
                <Button type="primary" onClick={() => setEditing(true)}>
                  重新报价
                </Button>
              )}
              <QuoteHistory quotes={data?.slice(1) ?? []} />
            </>
          ) : (
            <>
              <Empty
                description="尚未提交报价"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
              {task && canSubmitQuote(task) && (
                <Button type="primary" onClick={() => setEditing(true)}>
                  编制报价
                </Button>
              )}
            </>
          )}
        </div>
      </ContentCard>
      {editing && task && (
        <SubmitQuoteModal
          key={`${task.id}:${task.version}:${quote?.id ?? "first"}`}
          task={task}
          baseQuote={quote}
          onClose={closeAndRefresh}
          onSubmitted={closeAndRefresh}
        />
      )}
    </>
  );
}
