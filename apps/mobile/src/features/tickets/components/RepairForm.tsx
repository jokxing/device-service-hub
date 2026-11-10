import { useEffect, useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { randomUUID } from "expo-crypto";
import type {
  DeviceSummary,
  TicketPriority,
} from "@device-service-hub/contracts";
import { useNativeSession } from "../../auth/sessionContext";
import { useAction } from "../../../shared/hooks/useAction";
import ActionButton from "../../../shared/components/ActionButton";
import { createTicket } from "../api";
import { PRIORITY_LABELS, TICKET_LIMITS } from "../constants";
import { ticketStyles as styles } from "../ticketStyles";
export default function RepairForm({ device }: { device: DeviceSummary }) {
  const { post } = useNativeSession();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("normal");
  const action = useAction();
  const intent = useRef<{ fingerprint: string; requestId: string } | null>(
    null,
  );
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
      const payload = {
        deviceId: device.id,
        title: title.trim(),
        description: description.trim(),
        priority,
      };
      if (!payload.title || !payload.description)
        throw new Error("请填写问题标题和描述");
      if (
        payload.title.length > TICKET_LIMITS.title ||
        payload.description.length > TICKET_LIMITS.description
      )
        throw new Error("问题内容超过长度限制");
      const fingerprint = JSON.stringify(payload);
      if (intent.current?.fingerprint !== fingerprint)
        intent.current = { fingerprint, requestId: randomUUID() };
      controller.current = new AbortController();
      const ticket = await createTicket(
        post,
        { ...payload, requestId: intent.current.requestId },
        controller.current.signal,
      );
      if (active.current) router.replace(`/tickets/${ticket.id}`);
    });
  }
  return (
    <>
      <Text style={styles.text}>
        报修设备：{device.code} · {device.name}
      </Text>
      <View style={styles.field}>
        <Text style={styles.text}>问题标题</Text>
        <TextInput
          autoComplete="off"
          importantForAutofill="no"
          accessibilityLabel="问题标题"
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          maxLength={TICKET_LIMITS.title}
          editable={!action.pending}
          placeholder="例如：空调不制冷"
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.text}>问题描述</Text>
        <TextInput
          autoComplete="off"
          importantForAutofill="no"
          accessibilityLabel="问题描述"
          style={[styles.input, styles.description]}
          multiline
          value={description}
          onChangeText={setDescription}
          maxLength={TICKET_LIMITS.description}
          editable={!action.pending}
          placeholder="故障现象、发生时间和影响范围"
        />
      </View>
      <Text style={styles.text}>优先级：{PRIORITY_LABELS[priority]}</Text>
      <ActionButton
        title={priority === "normal" ? "设为紧急" : "设为普通"}
        secondary
        disabled={action.pending}
        onPress={() =>
          setPriority((value) => (value === "normal" ? "urgent" : "normal"))
        }
      />
      {!!action.error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {action.error}
        </Text>
      )}
      <Text style={styles.muted}>
        提交结果不明时，请保留相同内容重试。离开页面或修改内容前，请先查看“我的报修”，避免重复报修。离页取消请求不代表工单已撤销。
      </Text>
      <ActionButton
        title="提交报修"
        pending={action.pending}
        disabled={!title.trim() || !description.trim()}
        onPress={submit}
      />
      <ActionButton
        title="查看我的报修"
        secondary
        disabled={action.pending}
        onPress={() => router.replace("/tickets")}
      />
    </>
  );
}
