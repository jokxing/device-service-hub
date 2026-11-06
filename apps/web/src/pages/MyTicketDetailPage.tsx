import { useCallback } from "react";
import { Alert, Button, Spin } from "antd";
import { useParams } from "react-router-dom";
import { ROUTES } from "../app/routes";
import { useSession } from "../features/auth/sessionContext";
import { useApiResource } from "../shared/hooks/useApiResource";

import ContentCard from "../shared/components/ContentCard";
import ServicePageHeader from "../shared/components/ServicePageHeader";
import { connectedTicketsApi } from "../features/tickets/api";

import TicketRecordDetails from "../features/tickets/components/TicketRecordDetails";
import styles from "../features/tickets/connected.module.css";

export default function MyTicketDetailPage() {
  const { id = "" } = useParams();
  const { clearSession } = useSession();
  const load = useCallback(
    (signal: AbortSignal) => connectedTicketsApi.detail(id, signal),
    [id],
  );
  const { data, error, loading, refresh } = useApiResource(load, clearSession);
  return (
    <>
      <ServicePageHeader
        title="报修详情"
        description="查看设备信息、问题描述与当前处理状态。"
        back={{ to: ROUTES.serviceTickets, label: "返回我的报修" }}
      />
      <ContentCard
        title={data?.code ?? "报修记录"}
        extra={
          <Button onClick={refresh} loading={loading}>
            刷新
          </Button>
        }
      >
        {error ? (
          <Alert type="error" title={error} showIcon className="m-5" />
        ) : loading || !data ? (
          <Spin tip="正在加载报修">
            <div className="min-h-32" />
          </Spin>
        ) : (
          <div className={styles.record}>
            <TicketRecordDetails ticket={data} />
          </div>
        )}
      </ContentCard>
    </>
  );
}
