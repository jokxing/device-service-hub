import { useCallback, useState } from "react";
import { Alert, Button, Descriptions, Modal, Spin } from "antd";
import { canRequireQuote } from "@device-service-hub/contracts/quote-rules";
import { useApiResource } from "../../../shared/hooks/useApiResource";
import { formatDateTime } from "../../../shared/utils/date";
import { useSession } from "../../auth/sessionContext";
import { adminTicketsApi } from "../admin-api";
import TicketRecordDetails from "./TicketRecordDetails";
import AdminTicketPhotos from "../photos/AdminTicketPhotos";
import TicketQuoteSection from "../../quotes/components/TicketQuoteSection";
import TicketOrderSection from "../../orders/components/TicketOrderSection";
import RequireQuoteModal from "./RequireQuoteModal";

export default function AdminTicketDetail({
  id,
  onClose,
  onChanged,
}: {
  id: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { clearSession } = useSession();
  const load = useCallback(
    (signal: AbortSignal) => adminTicketsApi.detail(id, signal),
    [id],
  );
  const { data, error, loading, refresh } = useApiResource(load, clearSession);
  const [changeOpen, setChangeOpen] = useState(false);
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
                children: (
                  <div className="flex flex-wrap items-center gap-3">
                    <span>
                      {data.serviceMode === "quoted" ? "需报价" : "直接处理"}
                    </span>
                    {canRequireQuote(data) && (
                      <Button size="small" onClick={() => setChangeOpen(true)}>
                        改为需报价
                      </Button>
                    )}
                  </div>
                ),
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
          {data.serviceModeChange && (
            <p className="muted mb-5">
              服务方式调整：{data.serviceModeChange.actor.name}{" "}
              将直接处理改为需报价 ·{" "}
              {formatDateTime(new Date(data.serviceModeChange.createdAt))}
              <br />
              调整原因：{data.serviceModeChange.reason}
            </p>
          )}
          <TicketRecordDetails ticket={data} />
          {data.serviceMode === "quoted" && (
            <div className="mt-5">
              <TicketQuoteSection ticketId={data.id} />
              <TicketOrderSection ticketId={data.id} version={data.version} />
            </div>
          )}
          <AdminTicketPhotos key={data.id} ticketId={data.id} />
          {changeOpen && (
            <RequireQuoteModal
              key={`require-quote:${data.id}`}
              ticket={data}
              onClose={() => {
                setChangeOpen(false);
                refresh();
                onChanged();
              }}
            />
          )}
        </>
      )}
    </Modal>
  );
}
