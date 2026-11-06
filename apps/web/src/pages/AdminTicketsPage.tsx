import { useCallback, useState } from "react";
import { Alert, Button, Spin } from "antd";
import type { AdminTicketRecord } from "@device-service-hub/contracts";
import { useSession } from "../features/auth/sessionContext";
import { useApiResource } from "../shared/hooks/useApiResource";
import ServicePageHeader from "../shared/components/ServicePageHeader";
import ContentCard from "../shared/components/ContentCard";
import { adminTicketsApi } from "../features/tickets/admin-api";
import { useTicketListQuery } from "../features/tickets/hooks/useTicketListQuery";
import TicketStatusFilter from "../features/tickets/components/TicketStatusFilter";
import AdminTicketsList from "../features/tickets/components/AdminTicketsList";
import AdminTicketDetail from "../features/tickets/components/AdminTicketDetail";
import AssignConnectedTicketModal from "../features/tickets/components/AssignConnectedTicketModal";

function AdminTicketsContent() {
  const { clearSession } = useSession();
  const { page, status, setPage, setStatus } = useTicketListQuery();
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
        <TicketStatusFilter
          label="工单状态"
          value={status}
          onChange={setStatus}
          description="首次分派后，由维修人员在“我的任务”确认接单"
        />
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
            onPageChange={setPage}
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
