import { useCallback, useState } from "react";
import { Alert, Button, Select, Spin } from "antd";
import { useSearchParams } from "react-router-dom";
import type { TaskTicketRecord } from "@device-service-hub/contracts";
import { useSession } from "../features/auth/sessionContext";
import { useApiResource } from "../shared/hooks/useApiResource";
import { readPage } from "../shared/utils/pagination";
import ServicePageHeader from "../shared/components/ServicePageHeader";
import ContentCard from "../shared/components/ContentCard";
import { tasksApi } from "../features/tickets/tasks-api";
import { STATUS_OPTIONS } from "../features/tickets/constants";
import TaskTicketsList from "../features/tickets/components/TaskTicketsList";
import AcceptTaskModal from "../features/tickets/components/AcceptTaskModal";
import styles from "../features/tickets/connected.module.css";

function MyTasksContent() {
  const { clearSession } = useSession();
  const [params, setParams] = useSearchParams();
  const page = readPage(params.get("page"));
  const status = STATUS_OPTIONS.find(
    (option) => option.value === params.get("status"),
  )?.value;
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
        <div className={styles.toolbar}>
          <Select
            aria-label="任务状态"
            value={status ?? "all"}
            options={[{ value: "all", label: "全部状态" }, ...STATUS_OPTIONS]}
            onChange={(value) =>
              setParams(value === "all" ? {} : { status: value })
            }
          />
          <span className="muted">仅显示当前分派给你的工单</span>
        </div>
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
            onPageChange={(next) => {
              const query = new URLSearchParams();
              if (status) query.set("status", status);
              if (next > 1) query.set("page", String(next));
              setParams(query);
            }}
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
