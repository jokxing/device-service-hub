import { useEffect, useState } from "react";
import { Alert, Button, Empty, Space, Spin, message } from "antd";
import { Link, Navigate } from "react-router-dom";
import type { DeviceSummary } from "@device-service-hub/contracts";
import { ROUTES } from "../app/routes";
import { ROLE_LABELS } from "../shared/constants/roles";
import { ApiError } from "../shared/api/http";
import ContentCard from "../shared/components/ContentCard";
import { useSession } from "../features/auth/sessionContext";
import SessionFeedback from "../features/auth/components/SessionFeedback";
import { devicesApi } from "../features/devices/api";
import DeviceTable from "../features/devices/components/DeviceTable";
import ConnectedDeviceDetail from "../features/devices/components/ConnectedDeviceDetail";
import styles from "../features/devices/connected.module.css";

export default function ConnectedDevicesPage() {
  const { user, status, signOut, clearSession } = useSession();
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState<string>();
  const [leaving, setLeaving] = useState(false);
  const [msg, contextHolder] = message.useMessage();
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    setDevices([]);
    setSelectedId(undefined);
    setError("");
    setLoading(true);
    devicesApi
      .list(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setDevices(result);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 401) clearSession();
        else setError(error instanceof Error ? error.message : "设备加载失败");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [userId, attempt, clearSession]);
  if (status === "loading" || status === "unavailable")
    return <SessionFeedback />;
  if (!user) return <Navigate to={ROUTES.login} replace />;
  async function logout() {
    setLeaving(true);
    try {
      await signOut();
    } catch {
      msg.error("退出失败，请稍后重试");
      setLeaving(false);
    }
  }
  return (
    <div className={styles.page}>
      {contextHolder}
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>DEVICE SERVICE HUB</span>
          <h1>设备台账</h1>
          <p>当前仅显示此账号有权访问的设备。</p>
        </div>
        <Space wrap>
          <span>
            {user.name} · {ROLE_LABELS[user.role]}
          </span>
          <Button onClick={logout} loading={leaving}>
            退出登录
          </Button>
        </Space>
      </header>
      <Alert
        showIcon
        type="info"
        title="已连接本地服务与数据库"
        description={
          <>
            当前开放登录和设备查询。工单流程可前往{" "}
            <Link to={ROUTES.tickets}>演示工作台</Link>{" "}
            体验，其演示角色与当前登录账号相互独立。
          </>
        }
        className="mb-5"
      />
      <ContentCard
        title="我的可见设备"
        count={devices.length}
        extra={
          <Button
            onClick={() => setAttempt((value) => value + 1)}
            loading={loading}
          >
            刷新
          </Button>
        }
      >
        {error ? (
          <Alert type="error" showIcon title={error} className="m-5" />
        ) : loading ? (
          <Spin tip="正在读取设备">
            <div className="min-h-32" />
          </Spin>
        ) : devices.length ? (
          <DeviceTable visibleDevices={devices} onView={setSelectedId} />
        ) : (
          <Empty description="当前账号暂无可访问的设备" className="my-10" />
        )}
      </ContentCard>
      {selectedId && (
        <ConnectedDeviceDetail
          key={user.id + ":" + selectedId}
          id={selectedId}
          onClose={() => setSelectedId(undefined)}
        />
      )}
    </div>
  );
}
