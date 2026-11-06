import { useCallback } from "react";
import { Alert, Button, Spin } from "antd";
import { useSearchParams } from "react-router-dom";
import { useSession } from "../features/auth/sessionContext";
import { useApiResource } from "../shared/hooks/useApiResource";
import ContentCard from "../shared/components/ContentCard";
import ServicePageHeader from "../shared/components/ServicePageHeader";
import { connectedTicketsApi } from "../features/tickets/api";
import MyTicketsTable from "../features/tickets/components/MyTicketsTable";

export default function MyTicketsPage() {
  const [params, setParams] = useSearchParams();
  const rawPage = Number(params.get("page") ?? 1);
  const page =
    Number.isSafeInteger(rawPage) && rawPage > 0 && rawPage <= 100000
      ? rawPage
      : 1;
  const { clearSession } = useSession();
  const load = useCallback(
    (signal: AbortSignal) => connectedTicketsApi.mine(page, signal),
    [page],
  );
  const { data, loading, error, refresh } = useApiResource(load, clearSession);
  return (
    <>
      <ServicePageHeader
        title="我的报修"
        description="查看本人提交的报修，跟进处理状态与问题详情。"
      />
      <ContentCard
        title="报修记录"
        count={data?.total}
        extra={
          <Button loading={loading} onClick={refresh}>
            刷新
          </Button>
        }
      >
        {error ? (
          <Alert type="error" title={error} showIcon className="m-5" />
        ) : loading || !data ? (
          <Spin tip="正在读取报修">
            <div className="min-h-32" />
          </Spin>
        ) : (
          <MyTicketsTable
            data={data}
            onPageChange={(next) =>
              setParams(next === 1 ? {} : { page: String(next) })
            }
          />
        )}
      </ContentCard>
    </>
  );
}
