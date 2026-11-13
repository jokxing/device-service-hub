"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button } from "antd";
import type {
  AlipaySandboxCheckout,
  AlipaySandboxPaymentRecord,
} from "@device-service-hub/contracts";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import { ApiError } from "../../../shared/api/http";
import styles from "../payments.module.css";
import MutationModal from "../../../shared/components/MutationModal";
import { useAuthenticatedMutation } from "../../auth/useAuthenticatedMutation";
import {
  createSandboxPayment,
  reopenSandboxPayment,
  querySandboxPayment,
  closeSandboxPayment,
  querySandboxRefund,
} from "../api";

function enterCashier(result: AlipaySandboxCheckout, refresh: () => void) {
  if (!result.checkoutUrl) {
    refresh();
    return;
  }
  const url = new URL(result.checkoutUrl);
  if (
    url.origin !== "https://openapi-sandbox.dl.alipaydev.com" ||
    url.pathname !== "/gateway.do" ||
    url.searchParams.get("method") !== "alipay.trade.page.pay"
  )
    throw new Error("收银台地址不符合沙箱限制");
  window.location.assign(url.href);
}
export default function AlipaySandboxActions({
  orderId,
  amountCents,
  payment,
}: {
  orderId: string;
  amountCents: number;
  payment?: AlipaySandboxPaymentRecord;
}) {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const refresh = useCallback(() => {
    setOpen(null);
    setCloseNotice("");
    startTransition(() => router.refresh());
  }, [router]);
  const [open, setOpen] = useState<"checkout" | "close" | null>(null);
  const [closeNotice, setCloseNotice] = useState("");
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) refresh();
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, [refresh]);
  const requestId = useRef<string | null>(null);
  const { submitting, error, run } =
    useAuthenticatedMutation("结果尚未确定，请刷新支付记录核对");
  useEffect(() => {
    if (payment && payment.status !== "pending") setCloseNotice("");
  }, [payment?.status]);
  return (
    <>
      <div className={styles.actions}>
        {payment?.refund && (
          <Button
            loading={submitting || refreshing}
            onClick={() =>
              run(
                (signal) => querySandboxRefund(orderId, payment.id, signal),
                refresh,
              )
            }
          >
            查询退款结果
          </Button>
        )}
        {(!payment || payment.status === "pending") && (
          <Button
            type="primary"
            className={styles.payButton}
            disabled={submitting || refreshing}
            onClick={() => setOpen("checkout")}
          >
            {payment ? "继续支付" : "支付"}
          </Button>
        )}
        {payment && (
          <Button
            type={payment.status === "closed" ? "link" : "default"}
            loading={submitting || refreshing}
            onClick={() =>
              run(
                (signal) => querySandboxPayment(orderId, payment.id, signal),
                refresh,
              )
            }
          >
            查询支付结果
          </Button>
        )}
        {payment?.status === "pending" && (
          <Button
            danger
            disabled={submitting || refreshing}
            onClick={() => setOpen("close")}
          >
            {closeNotice ? "重新尝试关闭" : "关闭支付"}
          </Button>
        )}
      </div>
      {closeNotice && (
        <Alert
          className={styles.notice}
          type="warning"
          showIcon
          title="本次支付尚未确认关闭"
          description={closeNotice}
        />
      )}
      {!open && error && <Alert type="error" showIcon title={error} />}
      {open && (
        <MutationModal
          title={open === "close" ? "关闭支付" : "支付"}
          okText={open === "close" ? "确认关闭支付" : "前往收银台"}
          submitting={submitting}
          error={error}
          onClose={refresh}
          onSubmit={() => {
            if (open === "close" && payment) {
              void run(
                async (signal) => {
                  try {
                    await closeSandboxPayment(orderId, payment.id, signal);
                    return true;
                  } catch (error) {
                    if (error instanceof ApiError && error.status === 409) {
                      setCloseNotice(error.message);
                      setOpen(null);
                      return false;
                    }
                    throw error;
                  }
                },
                (closed) => {
                  if (closed) refresh();
                },
              );
              return;
            }
            requestId.current ??= crypto.randomUUID();
            const input = { requestId: requestId.current };
            void run(
              (signal) =>
                payment
                  ? reopenSandboxPayment(orderId, payment.id, signal)
                  : createSandboxPayment(orderId, input, signal),
              (result) => enterCashier(result, refresh),
            );
          }}
        >
          <p>金额：¥{formatCents(amountCents)}（人民币）</p>
          {open === "close" ? (
            <>
              <p>
                先核对支付宝状态，再关闭未付款交易。若已付款，将保留支付成功；不会按未付款取消或执行退款。
              </p>
              <p>
                结果未确认时仍禁止取消订单。渠道没有交易但原链接尚有效时，请在截止后查单核对。
              </p>
              <p>
                关闭的是支付单，服务订单保持原状态；确认关闭后可回关联报修取消订单。
              </p>
            </>
          ) : (
            <>
              <p>当前为测试环境，请使用测试买家账号。</p>
              <p>
                收银台返回后将自动读取服务端支付结果。如迟迟未更新，可点击“查询支付结果”。页面返回不代表支付成功。
              </p>
              <p>支付待核实期间暂停开工和取消订单。</p>
            </>
          )}
        </MutationModal>
      )}
    </>
  );
}
