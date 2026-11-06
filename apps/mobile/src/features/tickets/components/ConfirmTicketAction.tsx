import { useEffect, useRef, useState } from "react";
import { Text } from "react-native";
import { randomUUID } from "expo-crypto";
import type { ReporterTicketRecord } from "@device-service-hub/contracts";
import ActionButton from "../../../shared/components/ActionButton";
import MutationModal from "../../../shared/components/MutationModal";
import { useAction } from "../../../shared/hooks/useAction";
import { useNativeSession } from "../../auth/sessionContext";
import { confirmTicket } from "../api";
import { canConfirmTicket } from "../rules";
import { ticketStyles as styles } from "../ticketStyles";

function Confirmation({
  ticket,
  onClose,
}: {
  ticket: ReporterTicketRecord;
  onClose: () => void;
}) {
  const { post } = useNativeSession();
  const action = useAction();
  const intent = useRef<string | null>(null);
  const active = useRef(true);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      controller.current?.abort();
    };
  }, []);
  function submit() {
    void action.run(async () => {
      intent.current ??= randomUUID();
      controller.current = new AbortController();
      await confirmTicket(
        post,
        ticket.id,
        { requestId: intent.current, expectedVersion: ticket.version },
        controller.current.signal,
      );
      if (active.current) onClose();
    });
  }
  return (
    <MutationModal
      title="确认维修完成"
      submitText="确认完成"
      pending={action.pending}
      error={action.error}
      onSubmit={submit}
      onClose={onClose}
    >
      <Text style={styles.text}>
        {ticket.code} · {ticket.title}
      </Text>
      <Text style={styles.text}>处理结果：{ticket.result?.description}</Text>
      <Text style={styles.text}>
        请核对处理结果与设备实际情况。确认后工单结束，当前不支持撤销或重新打开。
      </Text>
      <Text style={styles.muted}>
        结果不明时可在本窗口重试；关闭后将刷新记录核对。离页取消请求不代表操作已回滚。
      </Text>
    </MutationModal>
  );
}
export default function ConfirmTicketAction({
  ticket,
  reload,
}: {
  ticket: ReporterTicketRecord;
  reload: () => void;
}) {
  const [open, setOpen] = useState(false);
  if (!canConfirmTicket(ticket)) return null;
  return (
    <>
      <ActionButton title="确认维修完成" onPress={() => setOpen(true)} />
      {open && (
        <Confirmation
          ticket={ticket}
          onClose={() => {
            setOpen(false);
            reload();
          }}
        />
      )}
    </>
  );
}
