import { useState } from "react";
import { Text, View } from "react-native";
import { randomUUID } from "expo-crypto";
import type { ServiceOrderRecord } from "@device-service-hub/contracts";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import { useNativeSession } from "../auth/sessionContext";
import ActionButton from "../../shared/components/ActionButton";
import MutationModal from "../../shared/components/MutationModal";
import { useApiMutation } from "../../shared/hooks/useApiMutation";
import { typography } from "../../shared/styles/typography";
import { spacing } from "../../shared/theme";
import { createMockPayment } from "./api";
function Creation({
  order,
  onClose,
}: {
  order: ServiceOrderRecord;
  onClose: () => void;
}) {
  const { post } = useNativeSession(),
    mutation = useApiMutation();
  const [input] = useState(() => ({ requestId: randomUUID() }));
  return (
    <MutationModal
      title="创建模拟支付单"
      submitText="确认创建模拟支付单"
      pending={mutation.pending}
      error={mutation.error}
      onClose={onClose}
      onSubmit={() =>
        mutation.run(
          (signal) => createMockPayment(post, order.id, input, signal),
          onClose,
        )
      }
    >
      <View style={{ gap: spacing.xs }}>
        <Text style={typography.text}>{order.code}</Text>
        <Text style={typography.text}>
          订单金额：¥{formatCents(order.totalCents)}（人民币）
        </Text>
        <Text style={typography.text}>渠道：本地模拟</Text>
        <Text style={typography.muted}>
          只生成待支付记录，不发生扣款，也不代表付款成功。金额由服务端读取订单快照；结果不明时保持本窗口重试，关闭后刷新核对。
        </Text>
      </View>
    </MutationModal>
  );
}
export default function CreateMockPaymentAction({
  order,
  reload,
}: {
  order: ServiceOrderRecord;
  reload: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ActionButton title="创建模拟支付单" onPress={() => setOpen(true)} />
      {open && (
        <Creation
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
