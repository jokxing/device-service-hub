import RequestMockRefundAction from "./RequestMockRefundAction";
import RefundSummary from "./RefundSummary";
import { Text } from "react-native";
import type {
  PaymentRecord,
  ServiceOrderRecord,
} from "@device-service-hub/contracts";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import ContentCard from "../../shared/components/ContentCard";
import { typography } from "../../shared/styles/typography";
import { formatDateTime } from "../../shared/utils/date";
import ConfirmMockPaymentAction from "./ConfirmMockPaymentAction";
import { canConfirmMockPayment, paymentStatusLabel } from "./rules";
export default function PaymentRecordCard({
  order,
  payment,
  reload,
}: {
  order: ServiceOrderRecord;
  payment: PaymentRecord;
  reload: () => void;
}) {
  return (
    <ContentCard title={payment.code}>
      <Text style={typography.text}>{paymentStatusLabel(payment)}</Text>
      <Text style={typography.text}>
        金额：¥{formatCents(payment.amountCents)}（人民币） · 本地模拟
      </Text>
      <Text style={typography.muted}>
        创建时间：{formatDateTime(payment.createdAt)}
      </Text>
      <Text style={typography.text}>
        支付截止时间：{formatDateTime(payment.expiresAt)}
      </Text>
      {payment.closedAt && (
        <Text style={typography.muted}>
          关闭时间：{formatDateTime(payment.closedAt)} ·{" "}
          {payment.closeReason === "expired" ? "支付已超时" : "关联订单已取消"}
        </Text>
      )}
      {payment.succeededAt && (
        <Text style={typography.muted}>
          模拟成功时间：{formatDateTime(payment.succeededAt)}
        </Text>
      )}
      {payment.refund && <RefundSummary refund={payment.refund} />}
      <RequestMockRefundAction
        order={order}
        payment={payment}
        reload={reload}
      />
      {canConfirmMockPayment(order, payment) && (
        <>
          <Text style={typography.muted}>
            请在截止时间前完成模拟确认；刷新查单会按服务端时间检查是否超时。
          </Text>
          <ConfirmMockPaymentAction
            key={payment.id}
            payment={payment}
            reload={reload}
          />
        </>
      )}
    </ContentCard>
  );
}
