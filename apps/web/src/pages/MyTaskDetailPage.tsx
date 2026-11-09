import { useCallback, useState } from "react";
import { Alert, Button, Space, Spin } from "antd";
import { useParams } from "react-router-dom";
import type { TaskTicketRecord } from "@device-service-hub/contracts";
import { ROUTES } from "../app/routes";
import { useSession } from "../features/auth/sessionContext";
import { useApiResource } from "../shared/hooks/useApiResource";
import ServicePageHeader from "../shared/components/ServicePageHeader";
import ContentCard from "../shared/components/ContentCard";
import TicketRecordDetails from "../features/tickets/components/TicketRecordDetails";
import AcceptTaskModal from "../features/tickets/components/AcceptTaskModal";
import SubmitTaskResultModal from "../features/tickets/components/SubmitTaskResultModal";
import {
  canAcceptTask,
  canSubmitTaskResult,
} from "../features/tickets/taskRules";
import { tasksApi } from "../features/tickets/tasks-api";
import styles from "../features/tickets/connected.module.css";
import TicketQuoteSection from "../features/quotes/components/TicketQuoteSection";

function MyTaskDetailContent() {
  const { id = "" } = useParams();
  const { clearSession } = useSession();
  const load = useCallback(
    (signal: AbortSignal) => tasksApi.detail(id, signal),
    [id],
  );
  const { data, error, loading, refresh } = useApiResource(load, clearSession);
  const [taskToAccept, setTaskToAccept] = useState<TaskTicketRecord>();
  const [taskToSubmit, setTaskToSubmit] = useState<TaskTicketRecord>();
  return (
    <>
      <ServicePageHeader
        title="任务详情"
        description="查看设备问题与任务进度，接单后提交处理结果。"
        back={{ to: ROUTES.serviceTasks, label: "返回我的任务" }}
      />
      <ContentCard
        title={data?.code ?? "维修任务"}
        extra={
          <Space wrap>
            <Button onClick={refresh} loading={loading}>
              刷新
            </Button>
            {data && canAcceptTask(data) && (
              <Button
                type="primary"
                aria-label="接单"
                onClick={() => setTaskToAccept(data)}
              >
                接单
              </Button>
            )}
            {data && canSubmitTaskResult(data) && (
              <Button type="primary" onClick={() => setTaskToSubmit(data)}>
                提交处理结果
              </Button>
            )}
          </Space>
        }
      >
        {error ? (
          <Alert type="error" showIcon title={error} className="m-5" />
        ) : loading || !data ? (
          <Spin tip="正在读取任务">
            <div className="min-h-32" />
          </Spin>
        ) : (
          <div className={styles.record}>
            <p className="muted">
              服务方式：{data.serviceMode === "quoted" ? "需报价" : "直接处理"}
            </p>
            <TicketRecordDetails ticket={data} />
          </div>
        )}
      </ContentCard>
      {data?.serviceMode === "quoted" && !loading && !error && (
        <div className="mt-5">
          <TicketQuoteSection
            key={data.id}
            ticketId={data.id}
            task={data}
            onSubmitted={refresh}
          />
        </div>
      )}
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
      {taskToSubmit && (
        <SubmitTaskResultModal
          key={taskToSubmit.id}
          task={taskToSubmit}
          onClose={() => setTaskToSubmit(undefined)}
          onSubmitted={() => {
            setTaskToSubmit(undefined);
            refresh();
          }}
        />
      )}
    </>
  );
}
export default function MyTaskDetailPage() {
  const { user } = useSession();
  const { id } = useParams();
  if (user?.role !== "technician")
    return <Alert type="warning" showIcon title="当前角色无权访问维修任务" />;
  return <MyTaskDetailContent key={id} />;
}
