import { useRef, useState } from "react";
import { StyleSheet, Text, TextInput } from "react-native";
import { randomUUID } from "expo-crypto";
import type { TaskTicketRecord } from "@device-service-hub/contracts";
import ActionButton from "../../shared/components/ActionButton";
import MutationModal from "../../shared/components/MutationModal";
import { useApiMutation } from "../../shared/hooks/useApiMutation";
import { typography } from "../../shared/styles/typography";
import { colors, fontSizes, spacing, radii } from "../../shared/theme";
import { useNativeSession } from "../auth/sessionContext";
import { submitTaskResult } from "./api";
import { TASK_RESULT_LIMIT } from "./constants";
import { canSubmitTaskResult } from "./rules";

function ResultForm({
  task,
  onClose,
}: {
  task: TaskTicketRecord;
  onClose: () => void;
}) {
  const { post } = useNativeSession();
  const mutation = useApiMutation();
  const [description, setDescription] = useState("");
  const intent = useRef<{ description: string; requestId: string } | null>(
    null,
  );
  function submit() {
    mutation.run((signal) => {
      const normalized = description.trim();
      if (!normalized || normalized.length > TASK_RESULT_LIMIT)
        throw new Error(`请填写 1～${TASK_RESULT_LIMIT} 字符的处理说明`);
      if (intent.current?.description !== normalized)
        intent.current = { description: normalized, requestId: randomUUID() };
      return submitTaskResult(
        post,
        task.id,
        {
          description: normalized,
          requestId: intent.current.requestId,
          expectedVersion: task.version,
        },
        signal,
      );
    }, onClose);
  }
  return (
    <MutationModal
      title="填写处理结果"
      submitText="提交结果"
      pending={mutation.pending}
      error={mutation.error}
      submitDisabled={!description.trim()}
      onSubmit={submit}
      onClose={onClose}
    >
      <Text style={typography.text}>
        {task.code} · {task.title}
      </Text>
      <Text style={typography.text}>处理说明</Text>
      <TextInput
        autoComplete="off"
        importantForAutofill="no"
        accessibilityLabel="处理说明"
        multiline
        textAlignVertical="top"
        value={description}
        onChangeText={setDescription}
        maxLength={TASK_RESULT_LIMIT}
        editable={!mutation.pending}
        placeholder="说明故障原因、维修措施和复查结果"
        style={styles.input}
      />
      <Text style={typography.muted}>
        {description.length} / {TASK_RESULT_LIMIT}
      </Text>
      <Text style={typography.text}>
        提交后工单进入待用户确认，当前不能修改已提交的结果。
      </Text>
      <Text style={typography.muted}>
        结果不明时保留相同说明重试；修改内容或关闭前，请先核对任务记录。关闭后刷新，取消请求不等于回滚。
      </Text>
    </MutationModal>
  );
}
export default function SubmitTaskResultAction({
  task,
  reload,
}: {
  task: TaskTicketRecord;
  reload: () => void;
}) {
  const [open, setOpen] = useState(false);
  if (!canSubmitTaskResult(task)) return null;
  return (
    <>
      <ActionButton title="提交处理结果" onPress={() => setOpen(true)} />
      {open && (
        <ResultForm
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
const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.input,
    padding: spacing.sm,
    fontSize: fontSizes.input,
    minHeight: 150,
  },
});
