import { useRef } from "react";
import { Form, Input } from "antd";
import type {
  CreateTicketInput,
  DeviceSummary,
  TicketRecord,
} from "@device-service-hub/contracts";
import { useSession } from "../../auth/sessionContext";
import { useApiMutation } from "../../../shared/hooks/useApiMutation";
import MutationModal from "../../../shared/components/MutationModal";
import { connectedTicketsApi } from "../api";
import TicketTextFields from "./TicketTextFields";

type Values = Pick<CreateTicketInput, "title" | "description" | "priority">;
interface Props {
  device: DeviceSummary;
  onClose: () => void;
  onCreated: (ticket: TicketRecord) => void;
}

export default function ConnectedCreateTicketModal({
  device,
  onClose,
  onCreated,
}: Props) {
  const [form] = Form.useForm<Values>();
  const { clearSession } = useSession();
  const { submitting, error, run } = useApiMutation({
    onUnauthorized: clearSession,
    fallbackError: "尚未确认提交结果，可重试相同内容，或先查看我的报修。",
  });
  const intent = useRef<{ fingerprint: string; requestId: string } | null>(
    null,
  );
  function submit(values: Values) {
    const payload = {
      deviceId: device.id,
      title: values.title.trim(),
      description: values.description.trim(),
      priority: values.priority,
    };
    const fingerprint = JSON.stringify(payload);
    return run((signal) => {
      if (intent.current?.fingerprint !== fingerprint)
        intent.current = { fingerprint, requestId: crypto.randomUUID() };
      return connectedTicketsApi.create(
        { ...payload, requestId: intent.current.requestId },
        signal,
      );
    }, onCreated);
  }

  return (
    <MutationModal
      title="提交设备报修"
      okText="提交报修"
      submitting={submitting}
      error={error}
      onClose={onClose}
      onSubmit={() => form.submit()}
    >
      <Form<Values>
        autoComplete="off"
        form={form}
        layout="vertical"
        onFinish={submit}
        initialValues={{ priority: "normal" }}
        disabled={submitting}
      >
        <Form.Item label="报修设备">
          <Input
            autoComplete="off"
            value={device.code + " · " + device.name}
            readOnly
          />
        </Form.Item>
        <TicketTextFields />
      </Form>
      <p className="muted">本阶段支持文字报修，提交后等待管理员分派。</p>
    </MutationModal>
  );
}
