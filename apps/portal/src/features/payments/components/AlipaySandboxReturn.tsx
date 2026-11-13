"use client";
import { useEffect } from "react";
import Link from "next/link";

export default function AlipaySandboxReturn({ orderId }: { orderId: string }) {
  const href = `/orders/${encodeURIComponent(orderId)}?paymentReturn=alipay`;
  useEffect(() => {
    // Commit a same-origin page before navigating, preserving SameSite=Strict.
    // Return parameters never confirm payment or trigger a financial mutation.
    window.location.replace(href);
  }, [href]);
  return (
    <>
      <p>正在返回订单详情并读取服务端支付结果。</p>
      <Link href={href} prefetch={false}>
        返回订单详情
      </Link>
    </>
  );
}
