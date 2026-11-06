import { useRef, useState } from "react";
import { Text } from "react-native";
import { randomUUID } from "expo-crypto";
import type { TaskTicketRecord } from "@device-service-hub/contracts";
import ActionButton from "../../shared/components/ActionButton";
import MutationModal from "../../shared/components/MutationModal";
import { useApiMutation } from "../../shared/hooks/useApiMutation";
import { typography as styles } from "../../shared/styles/typography";
import { useNativeSession } from "../auth/sessionContext";
import { acceptTask } from "./api";
import { canAcceptTask } from "./rules";
function Acceptance({
  task,
  onClose,
}: {
  task: TaskTicketRecord;
  onClose: () => void;
}) {
  const { post } = useNativeSession();
  const mutation = useApiMutation();
  const intent = useRef<string | null>(null);
  return (
    <MutationModal
      title="接单确认"
      submitText="确认接单"
      pending={mutation.pending}
      error={mutation.error}
      onClose={onClose}
      onSubmit={() =>
        mutation.run((signal) => {
          intent.current ??= randomUUID();
          return acceptTask(
            post,
            task.id,
            { requestId: intent.current, expectedVersion: task.version },
            signal,
          );
        }, onClose)
      }
    >
      <Text style={styles.text}>
        {task.code} · {task.title}
      </Text>
      <Text style={styles.text}>
        {task.device.code} · {task.device.name}
      </Text>
      <Text style={styles.text}>
        接单后任务进入处理中，请核对任务与设备位置。
      </Text>
      <Text style={styles.muted}>
        结果不明时保留本窗口重试；关闭后刷新任务核对。取消请求不等于业务回滚。
      </Text>
    </MutationModal>
  );
}
export default function AcceptTaskAction({
  task,
  reload,
}: {
  task: TaskTicketRecord;
  reload: () => void;
}) {
  const [open, setOpen] = useState(false);
  if (!canAcceptTask(task)) return null;
  return (
    <>
      <ActionButton title="接单" onPress={() => setOpen(true)} />
      {open && (
        <Acceptance
          task={task}
          onClose={() => {
            setOpen(false);
            reload();
          }}
        />
      )}
    </>
  );
}
