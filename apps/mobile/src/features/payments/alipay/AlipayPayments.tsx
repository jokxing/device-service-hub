import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Text, View } from "react-native";
import { randomUUID } from "expo-crypto";
import type {
  AlipaySandboxPaymentRecord,
  ServiceOrderRecord,
} from "@device-service-hub/contracts";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import { useNativeSession } from "../../auth/sessionContext";
import ContentCard from "../../../shared/components/ContentCard";
import ActionButton from "../../../shared/components/ActionButton";
import LoadFeedback from "../../../shared/components/LoadFeedback";
import MutationModal from "../../../shared/components/MutationModal";
import { useApiMutation } from "../../../shared/hooks/useApiMutation";
import { typography } from "../../../shared/styles/typography";
import { spacing } from "../../../shared/theme";
import { formatDateTime } from "../../../shared/utils/date";
import { alipaySdkAvailable, payWithAlipay } from "./nativeSdk";
import {
  closeAppPayment,
  continueAppPayment,
  createAppPayment,
  queryAppPayment,
  readAlipayPayments,
} from "./api";
import { reconcileAlipayReturn } from "./reconcileAlipayReturn";
import { useAlipayPayments } from "./useAlipayPayments";
import AlipayRefundSection from "./AlipayRefundSection";
import { queryAlipayRefund } from "./api";

function PaymentAction({
  order,
  payment,
  reload,
  onWalletChange,
  disabled,
}: {
  order: ServiceOrderRecord;
  payment?: AlipaySandboxPaymentRecord;
  reload: () => void;
  onWalletChange: (busy: boolean) => void;
  disabled: boolean;
}) {
  const { post, request } = useNativeSession();
  const mutation = useApiMutation();
  const [open, setOpen] = useState(false);
  const [intent] = useState(() => ({ requestId: randomUUID() }));
  return (
    <>
      <ActionButton
        title={payment ? "继续支付" : "支付"}
        disabled={!alipaySdkAvailable || disabled}
        onPress={() => setOpen(true)}
      />
      {open && (
        <MutationModal
          title="支付宝支付"
          submitText="前往支付宝"
          pending={mutation.pending}
          error={mutation.error}
          onClose={() => {
            setOpen(false);
            reload();
          }}
          onSubmit={() =>
            mutation.run(
              async (signal) => {
                onWalletChange(true);
                try {
                  const result = payment
                    ? await continueAppPayment(
                        post,
                        order.id,
                        payment.id,
                        signal,
                      )
                    : await createAppPayment(post, order.id, intent, signal);
                  if (!result.orderString) {
                    throw new Error("支付单已结束或已到截止时间，请查询结果。");
                  }
                  try {
                    await payWithAlipay(result.orderString);
                  } finally {
                    // Includes cancellation/errors. Only a verified server query can settle payment.
                    if (!signal.aborted)
                      await reconcileAlipayReturn(
                        () => readAlipayPayments(request, order.id, signal),
                        (id) => queryAppPayment(post, order.id, id, signal),
                        signal,
                      );
                  }
                } finally {
                  onWalletChange(false);
                  reload();
                }
              },
              () => {
                setOpen(false);
              },
            )
          }
        >
          <Text style={typography.text}>
            订单金额：¥{formatCents(order.totalCents)}
          </Text>
          <Text style={typography.muted}>
            测试环境。将打开支付宝完成支付，结果以服务端核验为准。退出收银台不会自动关闭支付单，可返回后继续支付或关闭支付。
          </Text>
        </MutationModal>
      )}
    </>
  );
}

function PaymentRow({
  payment,
  order,
  reload,
  onWalletChange,
  disabled,
}: {
  payment: AlipaySandboxPaymentRecord;
  order: ServiceOrderRecord;
  reload: (orderChanged?: boolean) => void;
  onWalletChange: (busy: boolean) => void;
  disabled: boolean;
}) {
  const { post } = useNativeSession();
  const mutation = useApiMutation();
  const [closing, setClosing] = useState(false);
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={typography.text}>
        {
          { pending: "待核实", succeeded: "已支付", closed: "已关闭" }[
            payment.status
          ]
        }{" "}
        · ¥{formatCents(payment.amountCents)}
      </Text>
      <Text style={typography.muted}>支付编号：{payment.id}</Text>
      <Text style={typography.muted}>
        支付截止：{formatDateTime(payment.expiresAt)}
      </Text>
      <Text style={typography.muted}>
        最近核验：
        {payment.checkedAt ? formatDateTime(payment.checkedAt) : "尚未查单"}
      </Text>
      <AlipayRefundSection
        order={order}
        payment={payment}
        disabled={disabled}
        reload={reload}
      />
      {payment.status === "pending" && payment.checkoutKind === "app" && (
        <PaymentAction
          order={order}
          payment={payment}
          reload={reload}
          onWalletChange={onWalletChange}
          disabled={disabled}
        />
      )}
      {payment.status === "pending" && payment.checkoutKind !== "app" && (
        <Text style={typography.muted}>
          请通过门户继续原支付，或关闭后重新发起。
        </Text>
      )}
      <ActionButton
        title="查询支付结果"
        secondary
        disabled={mutation.pending || disabled}
        onPress={() =>
          mutation.run(
            (signal) => queryAppPayment(post, order.id, payment.id, signal),
            () => reload(),
          )
        }
      />
      {payment.status === "pending" && (
        <ActionButton
          title="关闭支付"
          secondary
          disabled={mutation.pending || disabled}
          onPress={() => setClosing(true)}
        />
      )}
      {!!mutation.error && (
        <Text style={typography.error}>{mutation.error}</Text>
      )}
      {closing && (
        <MutationModal
          title="关闭支付"
          submitText="确认关闭支付"
          pending={mutation.pending}
          error={mutation.error}
          onClose={() => {
            setClosing(false);
            reload();
          }}
          onSubmit={() =>
            mutation.run(
              (signal) => closeAppPayment(post, order.id, payment.id, signal),
              () => {
                setClosing(false);
                reload();
              },
            )
          }
        >
          <Text style={typography.text}>
            先核对渠道结果，再关闭未付款交易。已付款将保留支付成功；结果待核实时不能取消订单。关闭支付不等于取消服务订单。
          </Text>
        </MutationModal>
      )}
    </View>
  );
}

export default function AlipayPayments({
  order,
  blockedByMock,
  onChanged,
  onCheckingChange,
}: {
  order: ServiceOrderRecord;
  blockedByMock: boolean;
  onChanged: (orderChanged?: boolean) => void;
  onCheckingChange: (checking: boolean) => void;
}) {
  const resource = useAlipayPayments(order.id);
  const { post, request, user } = useNativeSession();
  const walletBusy = useRef(false);
  const running = useRef(false);
  const hasOpenRefund = useRef(false);
  hasOpenRefund.current =
    resource.data?.payments.some(
      (p) =>
        p.refund?.status === "requested" || p.refund?.status === "processing",
    ) ?? false;
  useEffect(() => {
    if (
      order.status !== "cancelled" &&
      resource.data?.payments.some((p) => p.refund?.status === "succeeded")
    )
      onChanged(true);
  }, [resource.data, order.status, onChanged]);
  const [checking, setChecking] = useState(true);
  const [syncError, setSyncError] = useState("");
  const onWalletChange = useCallback(
    (busy: boolean) => {
      walletBusy.current = busy;
      onCheckingChange(busy || running.current);
    },
    [onCheckingChange],
  );
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function synchronize() {
      // Never unmount/abort the mutation which owns the SDK promise on foreground return.
      if (walletBusy.current || running.current) return;
      running.current = true;
      setChecking(true);
      setSyncError("");
      onCheckingChange(true);
      let orderChanged = false;
      try {
        // Fetch first: a new payment may not exist in the pre-wallet React snapshot.
        const result = await reconcileAlipayReturn(
          () => readAlipayPayments(request, order.id, controller.signal),
          (id) => queryAppPayment(post, order.id, id, controller.signal),
          controller.signal,
          undefined,
          (id) => queryAlipayRefund(post, order.id, id, controller.signal),
        );
        orderChanged = result.refundSucceeded && order.status !== "cancelled";
      } catch {
        if (active)
          setSyncError("支付结果核验暂未完成，请点击刷新支付记录重试。");
      } finally {
        running.current = false;
        if (active) {
          setChecking(false);
          resource.reload();
          onChanged(orderChanged);
          onCheckingChange(walletBusy.current);
        }
      }
    }
    void synchronize();
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void synchronize();
    });
    const interval = setInterval(() => {
      if (AppState.currentState === "active" && hasOpenRefund.current)
        void synchronize();
    }, 5000);
    refreshRef.current = synchronize;
    return () => {
      active = false;
      controller.abort();
      running.current = false;
      refreshRef.current = null;
      listener.remove();
      clearInterval(interval);
    };
  }, [
    post,
    request,
    user?.id,
    order.id,
    order.status,
    resource.reload,
    onChanged,
    onCheckingChange,
  ]);
  const refreshRef = useRef<(() => Promise<void>) | null>(null);
  const reload = (orderChanged = false) => {
    resource.reload();
    onChanged(orderChanged);
  };
  return (
    <ContentCard title="支付">
      <Text style={typography.muted}>
        测试环境 · 支付结果以服务端核验为准。
      </Text>
      {!alipaySdkAvailable && (
        <Text style={typography.muted}>
          请使用包含支付模块的 Android 安装包。
        </Text>
      )}
      <LoadFeedback
        loading={resource.loading || checking}
        error={syncError || resource.error}
      />
      <ActionButton
        title="刷新支付记录"
        secondary
        disabled={resource.loading || checking || walletBusy.current}
        onPress={() => {
          void refreshRef.current?.();
        }}
      />
      {resource.data?.payments.map((payment) => (
        <PaymentRow
          key={payment.id + payment.status}
          payment={payment}
          order={order}
          reload={reload}
          onWalletChange={onWalletChange}
          disabled={checking || !!syncError}
        />
      ))}
      {resource.data?.enabled &&
        order.status === "awaiting_start" &&
        !blockedByMock &&
        !resource.data.payments.some((p) => p.status !== "closed") && (
          <PaymentAction
            order={order}
            reload={reload}
            onWalletChange={onWalletChange}
            disabled={checking || !!syncError}
          />
        )}
    </ContentCard>
  );
}
