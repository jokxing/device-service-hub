import { useCallback, useState } from "react";
import { Alert, Button, Select, Spin } from "antd";
import { useSearchParams } from "react-router-dom";
import type { AdminTicketRecord } from "@device-service-hub/contracts";
import { useSession } from "../features/auth/sessionContext";
import { useApiResource } from "../shared/hooks/useApiResource";
import { readPage } from "../shared/utils/pagination";
import ServicePageHeader from "../shared/components/ServicePageHeader";
import ContentCard from "../shared/components/ContentCard";
import { adminTicketsApi } from "../features/tickets/admin-api";
import { STATUS_OPTIONS } from "../features/tickets/constants";
import AdminTicketsList from "../features/tickets/components/AdminTicketsList";
import AdminTicketDetail from "../features/tickets/components/AdminTicketDetail";
import AssignConnectedTicketModal from "../features/tickets/components/AssignConnectedTicketModal";
import styles from "../features/tickets/connected.module.css";

function AdminTicketsContent() {
  const { clearSession } = useSession();
  const [params, setParams] = useSearchParams();
  const page = readPage(params.get("page"));
  const status = STATUS_OPTIONS.find(
    (option) => option.value === params.get("status"),
  )?.value;
  const load = useCallback(
    (signal: AbortSignal) => adminTicketsApi.list(page, status, signal),
    [page, status],
  );
  const { data, error, loading, refresh } = useApiResource(load, clearSession);
  const [detailId, setDetailId] = useState<string>();
  const [assignmentTicket, setAssignmentTicket] = useState<AdminTicketRecord>();
  return (
    <>
      <ServicePageHeader
        title="工单分派"
        description="查看真实报修，将待分派工单安排给启用中的维修人员。"
      />
      <ContentCard
        title="全部工单"
        count={data?.total}
        extra={
          <Button onClick={refresh} loading={loading}>
            刷新
          </Button>
        }
      >
        <div className={styles.toolbar}>
          <Select
            aria-label="工单状态"
            value={status ?? "all"}
            options={[{ value: "all", label: "全部状态" }, ...STATUS_OPTIONS]}
            onChange={(value) =>
              setParams(value === "all" ? {} : { status: value })
            }
          />
          <span className="muted">
            首次分派后，由维修人员在“我的任务”确认接单
          </span>
        </div>
        {error ? (
          <Alert type="error" showIcon title={error} className="m-5" />
        ) : loading || !data ? (
          <Spin tip="正在读取工单">
            <div className="min-h-32" />
          </Spin>
        ) : (
          <AdminTicketsList
            data={data}
            onView={setDetailId}
            onAssign={setAssignmentTicket}
            onPageChange={(next) => {
              const query = new URLSearchParams();
              if (status) query.set("status", status);
              if (next > 1) query.set("page", String(next));
              setParams(query);
            }}
          />
        )}
      </ContentCard>
      {detailId && (
        <AdminTicketDetail
          key={detailId}
          id={detailId}
          onClose={() => setDetailId(undefined)}
        />
      )}
      {assignmentTicket && (
        <AssignConnectedTicketModal
          key={assignmentTicket.id}
          ticket={assignmentTicket}
          onClose={() => setAssignmentTicket(undefined)}
          onAssigned={() => {
            setAssignmentTicket(undefined);
            refresh();
          }}
        />
      )}
    </>
  );
}

export default function AdminTicketsPage() {
  const { user } = useSession();
  if (user?.role !== "admin")
    return <Alert type="warning" showIcon title="当前角色无权访问工单分派" />;
  return <AdminTicketsContent />;
}
