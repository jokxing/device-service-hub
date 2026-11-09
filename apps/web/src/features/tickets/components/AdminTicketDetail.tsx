import { useCallback } from "react";
import { Alert, Descriptions, Modal, Spin } from "antd";
import { useApiResource } from "../../../shared/hooks/useApiResource";
import { formatDateTime } from "../../../shared/utils/date";
import { useSession } from "../../auth/sessionContext";
import { adminTicketsApi } from "../admin-api";
import TicketRecordDetails from "./TicketRecordDetails";
import AdminTicketPhotos from "../photos/AdminTicketPhotos";
import TicketQuoteSection from "../../quotes/components/TicketQuoteSection";

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
      style={{ top: 24 }}
      styles={{
        body: { maxHeight: "calc(100dvh - 140px)", overflowY: "auto" },
      }}
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
                key: "serviceMode",
                label: "服务方式",
                children: data.serviceMode === "quoted" ? "需报价" : "直接处理",
              },
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
          {data.serviceMode === "quoted" && (
            <div className="mt-5">
              <TicketQuoteSection ticketId={data.id} />
            </div>
          )}
          <AdminTicketPhotos key={data.id} ticketId={data.id} />
        </>
      )}
    </Modal>
  );
}
