"use client";

import { useState } from "react";
import { Button } from "antd";
import type { ServiceOrderRecord } from "@device-service-hub/contracts";
import { canCancelOrder } from "../rules";
import type { CancellationTicket } from "../types";
import CancelOrderModal from "./CancelOrderModal";
import styles from "../../quotes/quotes.module.css";

export default function OrderActions({
  ticket,
  order,
}: {
  ticket: CancellationTicket;
  order: ServiceOrderRecord;
}) {
  const [open, setOpen] = useState(false);
  if (!canCancelOrder(ticket, order)) return null;
  return (
    <div className={styles.actions}>
      <Button danger onClick={() => setOpen(true)}>
        取消订单
      </Button>
      {open && (
        <CancelOrderModal
          ticket={ticket}
          order={order}
          onClose={() =>
            window.location.replace(`/tickets/${encodeURIComponent(ticket.id)}`)
          }
        />
      )}
    </div>
  );
}
