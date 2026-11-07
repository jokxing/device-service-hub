import SessionFooter from "../auth/SessionFooter";
import { Text } from "react-native";
import { useRouter } from "expo-router";
import Screen from "../../shared/components/Screen";
import ContentCard from "../../shared/components/ContentCard";
import ActionButton from "../../shared/components/ActionButton";
import { useNativeSession } from "../auth/sessionContext";
import { ROLE_LABELS } from "../../shared/constants/roles";
import { useDevices } from "./useDeviceResource";
import { deviceStyles as styles } from "./deviceStyles";

export default function DevicesScreen() {
  const router = useRouter();
  const { user } = useNativeSession();
  const { data, error, loading, reload } = useDevices();
  return (
    <Screen footer={<SessionFooter />}>
      <Text style={styles.identity}>
        {user?.name} · {user ? ROLE_LABELS[user.role] : ""}
      </Text>
      {user?.role !== "technician" && (
        <ActionButton
          title="扫码查看设备"
          onPress={() => router.push("/devices/scan")}
        />
      )}
      {user?.role === "reporter" && (
        <ActionButton
          title="我的报修"
          secondary
          onPress={() => router.push("/tickets")}
        />
      )}
      {user?.role === "technician" && (
        <ActionButton
          title="我的任务"
          secondary
          onPress={() => router.push("/tasks")}
        />
      )}
      {loading && <Text style={styles.text}>正在读取设备…</Text>}
      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      {!loading && data?.length === 0 && (
        <ContentCard title="暂无可访问设备">
          <Text style={styles.text}>
            当前账号没有独立设备台账权限，请联系管理员确认授权。维修人员可通过“我的任务”查看当前分派工单。
          </Text>
        </ContentCard>
      )}
      {data?.map((device) => (
        <ContentCard key={device.id} title={device.name}>
          <Text style={styles.code}>{device.code}</Text>
          <Text style={styles.text}>
            {device.category} · {device.enabled ? "启用" : "停用"}
          </Text>
          <Text style={styles.text}>{device.location}</Text>
          <ActionButton
            title="查看设备详情"
            secondary
            onPress={() =>
              router.push(`/devices/${encodeURIComponent(device.id)}`)
            }
          />
        </ContentCard>
      ))}
      <ActionButton
        title="刷新设备"
        secondary
        disabled={loading}
        onPress={reload}
      />
    </Screen>
  );
}
