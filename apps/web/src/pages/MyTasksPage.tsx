import { useCallback, useState } from "react";
import { Alert, Button, Spin } from "antd";
import type { TaskTicketRecord } from "@device-service-hub/contracts";
import { useSession } from "../features/auth/sessionContext";
import { useApiResource } from "../shared/hooks/useApiResource";
import ServicePageHeader from "../shared/components/ServicePageHeader";
import ContentCard from "../shared/components/ContentCard";
import { tasksApi } from "../features/tickets/tasks-api";
import { useTicketListQuery } from "../features/tickets/hooks/useTicketListQuery";
import TicketStatusFilter from "../features/tickets/components/TicketStatusFilter";
import TaskTicketsList from "../features/tickets/components/TaskTicketsList";
import AcceptTaskModal from "../features/tickets/components/AcceptTaskModal";

function MyTasksContent() {
  const { clearSession } = useSession();
  const { page, status, setPage, setStatus } = useTicketListQuery();
  const load = useCallback(
    (signal: AbortSignal) => tasksApi.list(page, status, signal),
    [page, status],
  );
  const { data, error, loading, refresh } = useApiResource(load, clearSession);
  const [taskToAccept, setTaskToAccept] = useState<TaskTicketRecord>();
  return (
    <>
      <ServicePageHeader
        title="我的任务"
        description="查看分派给你的工单，确认接单后进入处理中。"
      />
      <ContentCard
        title="维修任务"
        count={data?.total}
        extra={
          <Button loading={loading} onClick={refresh}>
            刷新
          </Button>
        }
      >
        <TicketStatusFilter
          label="任务状态"
          value={status}
          onChange={setStatus}
          description="仅显示当前分派给你的工单"
        />
        {error ? (
          <Alert type="error" showIcon title={error} className="m-5" />
        ) : loading || !data ? (
          <Spin tip="正在读取任务">
            <div className="min-h-32" />
          </Spin>
        ) : (
          <TaskTicketsList
            data={data}
            onAccept={setTaskToAccept}
            onPageChange={setPage}
          />
        )}
      </ContentCard>
      {taskToAccept && (
        <AcceptTaskModal
          key={taskToAccept.id}
          task={taskToAccept}
          onClose={() => setTaskToAccept(undefined)}
          onAccepted={() => {
            setTaskToAccept(undefined);
            refresh();
          }}
        />
      )}
    </>
  );
}
export default function MyTasksPage() {
  const { user } = useSession();
  if (user?.role !== "technician")
    return <Alert type="warning" showIcon title="当前角色无权访问维修任务" />;
  return <MyTasksContent />;
}
