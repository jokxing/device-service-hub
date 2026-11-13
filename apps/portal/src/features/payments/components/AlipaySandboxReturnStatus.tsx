"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button } from "antd";
import type { AlipaySandboxPaymentRecord } from "@device-service-hub/contracts";

/** Read-only server refreshes: return parameters never confirm a payment. */
export default function AlipaySandboxReturnStatus({
  payments,
}: {
  payments: AlipaySandboxPaymentRecord[];
}) {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);
  const [refreshing, startTransition] = useTransition();
  const latest = payments[0];
  const waiting = latest?.status === "pending";
  const exhausted = attempts >= 10;

  useEffect(() => {
    if (!waiting || exhausted || refreshing) return;
    const timer = window.setTimeout(() => {
      setAttempts((value) => value + 1);
      startTransition(() => router.refresh());
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [waiting, exhausted, refreshing, attempts, router]);

  return (
    <Alert
      showIcon
      type={latest?.status === "succeeded" ? "success" : "info"}
      title={
        latest?.status === "succeeded"
          ? "支付成功"
          : latest?.status === "closed"
            ? "支付已关闭"
            : waiting
              ? exhausted
                ? "暂未收到最终支付结果"
                : "支付结果确认中"
              : "已返回订单，尚无支付记录"
      }
      description={
        latest?.status === "succeeded"
          ? "服务端已核验支付成功。维修进度请查看订单记录。"
          : waiting
            ? exhausted
              ? "自动刷新已停止。可刷新记录，或使用下方“查询支付结果”主动核对；请勿重复付款。"
              : "正在读取服务端记录，通知可能稍有延迟。返回本页不代表支付成功，请勿重复付款。"
            : "以服务端记录为准；如与收银台结果不一致，请使用下方查单入口核对。"
      }
      action={
        waiting && exhausted ? (
          <Button
            loading={refreshing}
            onClick={() => startTransition(() => router.refresh())}
          >
            刷新支付记录
          </Button>
        ) : undefined
      }
    />
  );
}
