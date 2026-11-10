import { useCallback, useState } from "react";
import type {
  ServiceOrderRecord,
  TaskTicketRecord,
} from "@device-service-hub/contracts";
import { Alert, Button, Spin } from "antd";
import { useSession } from "../../auth/sessionContext";
import { useApiResource } from "../../../shared/hooks/useApiResource";
import ContentCard from "../../../shared/components/ContentCard";
import { ordersApi } from "../api";
import OrderSummary from "./OrderSummary";
import styles from "../orders.module.css";
import { canStartOrder, canSubmitOrderResult } from "../rules";
import StartOrderModal from "./StartOrderModal";
import SubmitTaskResultModal from "../../tickets/components/SubmitTaskResultModal";

export default function TicketOrderSection({
  ticketId,
  version,
  task,
  onChanged,
}: {
  ticketId: string;
  version: number;
  task?: TaskTicketRecord;
  onChanged?: () => void;
}) {
  const { clearSession } = useSession();
  const load = useCallback(
    (signal: AbortSignal) => ordersApi.byTicket(ticketId, signal),
    [ticketId, version],
  );
  const { data, error, loading, refresh } = useApiResource(load, clearSession);
  const [starting, setStarting] = useState<ServiceOrderRecord>();
  const [submittingResult, setSubmittingResult] = useState<TaskTicketRecord>();
  function reread() {
    setStarting(undefined);
    setSubmittingResult(undefined);
    refresh();
    onChanged?.();
  }
  if (!loading && !error && !data) return null;
  return (
    <div className="mt-5">
      <ContentCard
        title="服务订单"
        extra={
          <Button onClick={refresh} loading={loading}>
            刷新订单
          </Button>
        }
      >
        <div className={styles.content}>
          {error ? (
            <Alert type="error" showIcon title={error} />
          ) : loading || !data ? (
            <Spin />
          ) : (
            <>
              <OrderSummary order={data} />
              {task && canStartOrder(task, data) && (
                <Button
                  type="primary"
                  className="mt-4"
                  onClick={() => setStarting(data)}
                >
                  订单开工
                </Button>
              )}
              {task && canSubmitOrderResult(task, data) && (
                <Button
                  type="primary"
                  className="mt-4"
                  onClick={() => setSubmittingResult(task)}
                >
                  提交处理结果
                </Button>
              )}
            </>
          )}
        </div>
      </ContentCard>
      {starting && task && (
        <StartOrderModal
          key={`${starting.id}:${task.version}`}
          order={starting}
          task={task}
          onClose={reread}
          onStarted={reread}
        />
      )}
      {submittingResult && (
        <SubmitTaskResultModal
          key={`${submittingResult.id}:${submittingResult.version}`}
          task={submittingResult}
          onClose={reread}
          onSubmitted={reread}
        />
      )}
    </div>
  );
}
