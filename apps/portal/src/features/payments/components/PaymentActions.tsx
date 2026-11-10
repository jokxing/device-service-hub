"use client";
import { useState } from "react";
import { Button } from "antd";
import type { ServiceOrderRecord } from "@device-service-hub/contracts";
import CreateMockPaymentModal from "./CreateMockPaymentModal";
export default function PaymentActions({
  order,
}: {
  order: Pick<ServiceOrderRecord, "id" | "code" | "totalCents" | "status">;
}) {
  const [open, setOpen] = useState(false);
  if (order.status !== "awaiting_start") return null;
  return (
    <>
      <Button type="primary" onClick={() => setOpen(true)}>
        创建模拟支付单
      </Button>
      {open && (
        <CreateMockPaymentModal
          order={order}
          onClose={() => window.location.reload()}
        />
      )}
    </>
  );
}
