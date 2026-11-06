import { useCallback, useState } from "react";
import { Alert, Button, Space, Spin } from "antd";
import type { ReporterTicketRecord } from "@device-service-hub/contracts";
import { useParams } from "react-router-dom";
import { ROUTES } from "../app/routes";
import { useSession } from "../features/auth/sessionContext";
import { useApiResource } from "../shared/hooks/useApiResource";

import ContentCard from "../shared/components/ContentCard";
import ServicePageHeader from "../shared/components/ServicePageHeader";
import { connectedTicketsApi } from "../features/tickets/api";

import TicketRecordDetails from "../features/tickets/components/TicketRecordDetails";
import ConfirmTicketModal from "../features/tickets/components/ConfirmTicketModal";
import { canConfirmTicket } from "../features/tickets/reporterRules";
import styles from "../features/tickets/connected.module.css";

function MyTicketDetailContent() {
  const { id = "" } = useParams();
  const { clearSession } = useSession();
  const load = useCallback(
    (signal: AbortSignal) => connectedTicketsApi.detail(id, signal),
    [id],
  );
  const { data, error, loading, refresh } = useApiResource(load, clearSession);
  const [ticketToConfirm, setTicketToConfirm] =
    useState<ReporterTicketRecord>();
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
          <Space wrap>
            <Button onClick={refresh} loading={loading}>
              刷新
            </Button>
            {data && canConfirmTicket(data) && (
              <Button
                type="primary"
                aria-label="确认完成"
                onClick={() => setTicketToConfirm(data)}
              >
                确认完成
              </Button>
            )}
          </Space>
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
      {ticketToConfirm && (
        <ConfirmTicketModal
          key={ticketToConfirm.id}
          ticket={ticketToConfirm}
          onClose={() => setTicketToConfirm(undefined)}
          onConfirmed={() => {
            setTicketToConfirm(undefined);
            refresh();
          }}
        />
      )}
    </>
  );
}

export default function MyTicketDetailPage() {
  const { id } = useParams();
  return <MyTicketDetailContent key={id} />;
}
