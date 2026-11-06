"use client";

import { useState } from "react";
import { Button } from "antd";
import type { ConfirmationTicket } from "../types";
import { canConfirmTicket } from "../rules";
import ConfirmTicketModal from "./ConfirmTicketModal";
import styles from "../tickets.module.css";

export default function TicketActions({
  ticket,
}: {
  ticket: ConfirmationTicket;
}) {
  const [open, setOpen] = useState(false);
  const allowed = canConfirmTicket(ticket);
  return (
    <>
      <div className={styles.actions}>
        {allowed && (
          <Button type="primary" onClick={() => setOpen(true)}>
            确认完成
          </Button>
        )}
        <Button onClick={() => window.location.reload()}>刷新进度</Button>
      </div>
      {allowed && open && (
        <ConfirmTicketModal ticket={ticket} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
