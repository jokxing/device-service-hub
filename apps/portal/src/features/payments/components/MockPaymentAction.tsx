"use client";
import { useState } from "react";
import { Button } from "antd";
import type { PaymentRecord } from "@device-service-hub/contracts";
import ConfirmMockPaymentModal from "./ConfirmMockPaymentModal";
export default function MockPaymentAction({
  payment,
}: {
  payment: PaymentRecord;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>模拟支付成功</Button>
      {open && (
        <ConfirmMockPaymentModal
          payment={payment}
          onClose={() => window.location.reload()}
        />
      )}
    </>
  );
}

export function RefreshPayments() { return <Button onClick={() => window.location.reload()}>刷新查单（模拟）</Button>; }
