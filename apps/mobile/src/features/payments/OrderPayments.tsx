import { Text, View } from "react-native";
import type {
  PaymentRecord,
  ServiceOrderRecord,
} from "@device-service-hub/contracts";
import ContentCard from "../../shared/components/ContentCard";
import ActionButton from "../../shared/components/ActionButton";
import LoadFeedback from "../../shared/components/LoadFeedback";
import { typography } from "../../shared/styles/typography";
import { spacing } from "../../shared/theme";
import { canCreateMockPayment } from "./rules";
import CreateMockPaymentAction from "./CreateMockPaymentAction";
import PaymentRecordCard from "./PaymentRecordCard";
export default function OrderPayments({
  order,
  payments,
  loading,
  error,
  reload,
}: {
  order: ServiceOrderRecord;
  payments: PaymentRecord[] | null;
  loading: boolean;
  error: string;
  reload: () => void;
}) {
  return (
    <ContentCard title="模拟支付单">
      <Text style={typography.muted}>
        本地模拟流程，不发生真实扣款。真实支付未接入，维修完成不代表付款。
      </Text>
      <ActionButton
        title="刷新查单（模拟）"
        secondary
        disabled={loading}
        onPress={reload}
      />
      <LoadFeedback loading={loading} error={error} />
      {payments && (
        <View style={{ gap: spacing.sm }}>
          {payments.length === 0 && (
            <Text style={typography.text}>尚无模拟支付单</Text>
          )}
          {payments.map((payment) => (
            <PaymentRecordCard
              key={payment.id + ":" + payment.status}
              order={order}
              payment={payment}
              reload={reload}
            />
          ))}
          {canCreateMockPayment(order, payments) && (
            <CreateMockPaymentAction
              key={order.id}
              order={order}
              reload={reload}
            />
          )}
        </View>
      )}
    </ContentCard>
  );
}
