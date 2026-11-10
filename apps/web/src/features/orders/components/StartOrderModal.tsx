import { useState } from "react";
import type {
  ServiceOrderRecord,
  TaskTicketRecord,
} from "@device-service-hub/contracts";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import { useSession } from "../../auth/sessionContext";
import { useApiMutation } from "../../../shared/hooks/useApiMutation";
import MutationModal from "../../../shared/components/MutationModal";
import TicketActionSummary from "../../tickets/components/TicketActionSummary";
import { ordersApi } from "../api";

export default function StartOrderModal({
  task,
  order,
  onClose,
  onStarted,
}: {
  task: TaskTicketRecord;
  order: ServiceOrderRecord;
  onClose: () => void;
  onStarted: () => void;
}) {
  const { clearSession } = useSession();
  const [requestId] = useState(() => crypto.randomUUID());
  const { submitting, error, run } = useApiMutation({
    onUnauthorized: clearSession,
    fallbackError: "尚未确认开工结果，可重试，或关闭后刷新核对订单。",
  });
  return (
    <MutationModal
      title="确认订单开工"
      okText="确认开工"
      submitting={submitting}
      error={error}
      onClose={onClose}
      onSubmit={() =>
        run(
          (signal) =>
            ordersApi.start(
              order.id,
              { requestId, expectedVersion: task.version },
              signal,
            ),
          onStarted,
        )
      }
    >
      <TicketActionSummary ticket={task} />
      <p>
        订单：{order.code} · 报价第 {order.quoteRevision} 版
      </p>
      <p>确认金额：¥{formatCents(order.totalCents)}（人民币）</p>
      <p>条目数量：{order.items.length}</p>
      <p>
        确认后订单进入维修中，记录开工人及时间。开工后用户不能直接取消，报价与金额保持不变。
      </p>
      <p>当前未接入支付，开工不代表已收款。</p>
    </MutationModal>
  );
}
