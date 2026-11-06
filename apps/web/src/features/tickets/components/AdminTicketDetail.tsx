import { useCallback } from "react";
import { Alert, Descriptions, Modal, Spin } from "antd";
import { useApiResource } from "../../../shared/hooks/useApiResource";
import { formatDateTime } from "../../../shared/utils/date";
import { useSession } from "../../auth/sessionContext";
import { adminTicketsApi } from "../admin-api";
import TicketRecordDetails from "./TicketRecordDetails";

export default function AdminTicketDetail({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const { clearSession } = useSession();
  const load = useCallback(
    (signal: AbortSignal) => adminTicketsApi.detail(id, signal),
    [id],
  );
  const { data, error, loading } = useApiResource(load, clearSession);
  return (
    <Modal
      open
      title={data?.code ?? "工单详情"}
      onCancel={onClose}
      footer={null}
      width={700}
    >
      {error ? (
        <Alert type="error" showIcon title={error} />
      ) : loading || !data ? (
        <Spin>
          <div className="min-h-32" />
        </Spin>
      ) : (
        <>
          <Descriptions
            column={1}
            items={[
              {
                key: "reporter",
                label: "报修用户",
                children: data.reporter.name,
              },
              ...(data.assignment
                ? [
                    {
                      key: "assignment",
                      label: "分派记录",
                      children: `${data.assignment.actor.name} 将工单分派给 ${data.assignment.assignee.name} · ${formatDateTime(new Date(data.assignment.createdAt))}`,
                    },
                  ]
                : []),
            ]}
          />
          <TicketRecordDetails ticket={data} />
        </>
      )}
    </Modal>
  );
}
