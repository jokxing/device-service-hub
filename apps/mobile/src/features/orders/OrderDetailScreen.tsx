import { useMyPayments } from "../payments/useMyPayments";
import OrderPayments from "../payments/OrderPayments";
import AlipayPayments from "../payments/alipay/AlipayPayments";
import { useCallback, useState } from "react";
import CancelOrderAction from "./CancelOrderAction";
import { useLocalSearchParams, useRouter } from "expo-router";
import Screen from "../../shared/components/Screen";
import ActionButton from "../../shared/components/ActionButton";
import LoadFeedback from "../../shared/components/LoadFeedback";
import ReporterAccess from "../tickets/components/ReporterAccess";
import TicketRecordDetails from "../tickets/components/TicketRecordDetails";
import OrderSnapshot from "./OrderSnapshot";
import { useOrder } from "./useOrders";
function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    router = useRouter();
  const { data, loading, error, reload } = useOrder(id);
  const payments = useMyPayments(id);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const paymentChanged = useCallback(
    (orderChanged = false) => {
      payments.reload();
      if (orderChanged) reload();
    },
    [payments.reload, reload],
  );
  const refresh = useCallback(() => {
    reload();
    payments.reload();
  }, [reload, payments.reload]);
  return (
    <Screen>
      <LoadFeedback loading={loading} error={error} />
      {data && (
        <>
          <OrderSnapshot order={data} />
          {payments.data && !checkingPayment && (
            <CancelOrderAction
              key={`${data.id}:${data.ticket.version}`}
              ticket={data.ticket}
              order={data}
              payments={payments.data.payments}
              blockCancellation={
                payments.loading ||
                !!payments.error ||
                payments.data.blockCancellation
              }
              reload={refresh}
            />
          )}
          <AlipayPayments
            order={data}
            blockedByMock={
              !payments.data ||
              payments.data.payments.some((p) => p.status !== "closed")
            }
            onChanged={paymentChanged}
            onCheckingChange={setCheckingPayment}
          />
          {!!payments.data?.payments.length && (
            <OrderPayments
              order={data}
              payments={payments.data.payments}
              loading={payments.loading}
              error={payments.error}
              reload={refresh}
            />
          )}
          <TicketRecordDetails ticket={data.ticket} />
        </>
      )}
      <ActionButton
        title="刷新订单详情"
        secondary
        disabled={loading}
        onPress={refresh}
      />
      <ActionButton
        title="返回我的订单"
        secondary
        onPress={() => router.dismissTo("/orders")}
      />
    </Screen>
  );
}
export default function OrderDetailScreen() {
  return (
    <ReporterAccess>
      <Detail />
    </ReporterAccess>
  );
}
