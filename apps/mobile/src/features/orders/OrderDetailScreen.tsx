import { useMyPayments } from "../payments/useMyPayments";
import OrderPayments from "../payments/OrderPayments";
import AlipayPayments from "../payments/alipay/AlipayPayments";
import { useCallback, useLayoutEffect, useState } from "react";
import CancelOrderAction from "./CancelOrderAction";
import { useLocalSearchParams, useNavigation } from "expo-router";
import Screen from "../../shared/components/Screen";
import HeaderRefreshButton from "../../shared/components/HeaderRefreshButton";
import LoadFeedback from "../../shared/components/LoadFeedback";
import ReporterAccess from "../tickets/components/ReporterAccess";
import TicketRecordDetails from "../tickets/components/TicketRecordDetails";
import OrderSnapshot from "./OrderSnapshot";
import { useOrder } from "./useOrders";

function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
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
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <HeaderRefreshButton
          accessibilityLabel="刷新订单详情"
          disabled={loading || payments.loading}
          onPress={refresh}
        />
      ),
    });
  }, [navigation, loading, payments.loading, refresh]);
  return (
    <Screen dense>
      <LoadFeedback
        loading={loading && !data}
        error={error}
        loadingLabel="正在读取订单详情…"
        onRetry={refresh}
        retryLabel="刷新订单详情"
      />
      {data ? (
        <>
          <OrderSnapshot order={data}>
            {payments.data && !checkingPayment ? (
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
            ) : null}
          </OrderSnapshot>
          <AlipayPayments
            order={data}
            blockedByMock={
              !payments.data ||
              payments.data.payments.some((p) => p.status !== "closed")
            }
            onChanged={paymentChanged}
            onCheckingChange={setCheckingPayment}
          />
          {!!payments.data?.payments.length ? (
            <OrderPayments
              order={data}
              payments={payments.data.payments}
              loading={payments.loading}
              error={payments.error}
              reload={refresh}
            />
          ) : null}
          <TicketRecordDetails ticket={data.ticket} />
        </>
      ) : null}
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
