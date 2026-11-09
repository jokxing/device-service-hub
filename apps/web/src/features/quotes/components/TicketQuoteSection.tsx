import { useCallback, useState } from "react";
import { Alert, Button, Empty, Spin } from "antd";
import type { TaskTicketRecord } from "@device-service-hub/contracts";
import { useSession } from "../../auth/sessionContext";
import { useApiResource } from "../../../shared/hooks/useApiResource";
import ContentCard from "../../../shared/components/ContentCard";
import { quotesApi } from "../api";
import { canSubmitQuote } from "../quoteRules";
import QuoteSummary from "./QuoteSummary";
import SubmitQuoteModal from "./SubmitQuoteModal";
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
    (signal: AbortSignal) => quotesApi.detail(ticketId, signal),
    [ticketId, task?.version],
  );
  const { data, error, loading, refresh } = useApiResource(load, clearSession);
  const [editing, setEditing] = useState(false);
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
          <Button loading={loading} onClick={refresh}>
            刷新报价
          </Button>
        }
      >
        <div className={styles.content}>
          {error ? (
            <Alert type="error" showIcon title={error} />
          ) : loading ? (
            <Spin />
          ) : data ? (
            <QuoteSummary quote={data} />
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
          task={task}
          onClose={closeAndRefresh}
          onSubmitted={closeAndRefresh}
        />
      )}
    </>
  );
}
