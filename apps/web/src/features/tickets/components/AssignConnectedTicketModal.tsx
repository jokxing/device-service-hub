import { useCallback, useRef } from "react";
import { Alert, Button, Form, Select } from "antd";
import type {
  AdminTicketRecord,
  TicketServiceMode,
} from "@device-service-hub/contracts";
import { useSession } from "../../auth/sessionContext";
import { useApiResource } from "../../../shared/hooks/useApiResource";
import { useApiMutation } from "../../../shared/hooks/useApiMutation";
import MutationModal from "../../../shared/components/MutationModal";
import TicketActionSummary from "./TicketActionSummary";
import { adminTicketsApi } from "../admin-api";

interface Props {
  ticket: AdminTicketRecord;
  onClose: () => void;
  onAssigned: () => void;
}
export default function AssignConnectedTicketModal({
  ticket,
  onClose,
  onAssigned,
}: Props) {
  const { clearSession } = useSession();
  const load = useCallback(
    (signal: AbortSignal) => adminTicketsApi.technicians(signal),
    [],
  );
  const {
    data: technicians,
    error: loadError,
    loading,
    refresh,
  } = useApiResource(load, clearSession);
  const [form] = Form.useForm<{
    assigneeId: string;
    serviceMode: TicketServiceMode;
  }>();
  const { submitting, error, run } = useApiMutation({
    onUnauthorized: clearSession,
    fallbackError: "尚未确认分派结果，可重试相同选择，或关闭后刷新列表核对。",
  });
  const intent = useRef<{
    assigneeId: string;
    serviceMode: TicketServiceMode;
    requestId: string;
  } | null>(null);
  function submit({
    assigneeId,
    serviceMode,
  }: {
    assigneeId: string;
    serviceMode: TicketServiceMode;
  }) {
    return run((signal) => {
      if (
        intent.current?.assigneeId !== assigneeId ||
        intent.current.serviceMode !== serviceMode
      )
        intent.current = {
          assigneeId,
          serviceMode,
          requestId: crypto.randomUUID(),
        };
      return adminTicketsApi.assign(
        ticket.id,
        {
          requestId: intent.current.requestId,
          assigneeId,
          serviceMode,
          expectedVersion: ticket.version,
        },
        signal,
      );
    }, onAssigned);
  }

  return (
    <MutationModal
      title="分派维修人员"
      okText="确认分派"
      submitting={submitting}
      error={error}
      onClose={onClose}
      onSubmit={() => form.submit()}
      submitDisabled={loading || !technicians?.length}
    >
      <TicketActionSummary ticket={ticket} />
      {loadError && (
        <Alert
          type="error"
          showIcon
          title={loadError}
          action={
            <Button size="small" onClick={refresh}>
              重试
            </Button>
          }
          className="mb-5"
        />
      )}
      {!loading && technicians?.length === 0 && (
        <Alert
          type="warning"
          showIcon
          title="暂无启用的维修人员，暂时无法分派"
          className="mb-5"
        />
      )}
      <Form
        form={form}
        layout="vertical"
        onFinish={submit}
        disabled={submitting || loading}
        initialValues={{ serviceMode: "direct" }}
      >
        <Form.Item
          name="assigneeId"
          label="维修人员"
          rules={[{ required: true, message: "请选择维修人员" }]}
        >
          <Select
            aria-label="维修人员"
            loading={loading}
            placeholder="选择维修人员"
            options={technicians?.map((person) => ({
              value: person.id,
              label: person.name,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="serviceMode"
          label="服务方式"
          rules={[{ required: true }]}
        >
          <Select
            aria-label="服务方式"
            options={[
              { value: "direct", label: "直接处理" },
              { value: "quoted", label: "需报价" },
            ]}
          />
        </Form.Item>
      </Form>
      <p className="muted">
        首次分派后工单进入待接单，由对应维修人员确认接单；改派暂未开放。
      </p>
    </MutationModal>
  );
}
