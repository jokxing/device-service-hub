import { useState } from "react";
import { Text } from "react-native";
import { randomUUID } from "expo-crypto";
import type {
  ServiceOrderRecord,
  TaskTicketRecord,
} from "@device-service-hub/contracts";
import { canStartOrder } from "@device-service-hub/contracts/order-rules";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import { useNativeSession } from "../auth/sessionContext";
import MutationModal from "../../shared/components/MutationModal";
import ActionButton from "../../shared/components/ActionButton";
import { useApiMutation } from "../../shared/hooks/useApiMutation";
import { typography } from "../../shared/styles/typography";
import { startTaskOrder } from "./api";
function Confirmation({
  task,
  order,
  onClose,
}: {
  task: TaskTicketRecord;
  order: ServiceOrderRecord;
  onClose: () => void;
}) {
  const { post } = useNativeSession(),
    mutation = useApiMutation();
  const [input] = useState(() => ({
    requestId: randomUUID(),
    expectedVersion: task.version,
  }));
  return (
    <MutationModal
      title="确认订单开工"
      submitText="确认开工"
      pending={mutation.pending}
      error={mutation.error}
      onClose={onClose}
      onSubmit={() =>
        mutation.run(
          (signal) => startTaskOrder(post, order.id, input, signal),
          onClose,
        )
      }
    >
      <Text style={typography.text}>
        {task.code} · {task.title}
      </Text>
      <Text style={typography.text}>
        {order.code} · 报价第 {order.quoteRevision} 版 · ¥
        {formatCents(order.totalCents)}
      </Text>
      <Text style={typography.text}>
        条目数量
        {order.items.length}
      </Text>
      <Text style={typography.text}>
        确认后订单进入维修中，记录开工人和时间；用户不能再直接取消。开工不代表付款，待处理退款会阻止开工。
      </Text>
      <Text style={typography.muted}>
        结果不明时保留本窗口重试；关闭后刷新核对，取消请求不等于事务回滚。
      </Text>
    </MutationModal>
  );
}
export default function StartOrderAction({
  task,
  order,
  reload,
}: {
  task: TaskTicketRecord;
  order: ServiceOrderRecord;
  reload: () => void;
}) {
  const [open, setOpen] = useState(false);
  if (!canStartOrder(task, order)) return null;
  return (
    <>
      <ActionButton title="订单开工" onPress={() => setOpen(true)} />
      {open && (
        <Confirmation
          task={task}
          order={order}
          onClose={() => {
            setOpen(false);
            reload();
          }}
        />
      )}
    </>
  );
}
