import { Text } from "react-native";
import { useRouter } from "expo-router";
import Screen from "../../shared/components/Screen";
import ContentCard from "../../shared/components/ContentCard";
import ActionButton from "../../shared/components/ActionButton";
import { useAction } from "../../shared/hooks/useAction";
import { useNativeSession } from "../auth/sessionContext";
import { ROLE_LABELS } from "../../shared/constants/roles";
import { useDevices } from "./useDeviceResource";
import { deviceStyles as styles } from "./deviceStyles";

export default function DevicesScreen() {
  const router = useRouter();
  const { user, signOut } = useNativeSession();
  const action = useAction();
  const { data, error, loading, reload } = useDevices();
  return (
    <Screen
      footer={
        <>
          {action.error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {action.error}
            </Text>
          )}
          <ActionButton
            title="退出登录"
            secondary
            pending={action.pending}
            onPress={() => void action.run(signOut)}
          />
        </>
      }
    >
      <Text style={styles.identity}>
        {user?.name} · {user ? ROLE_LABELS[user.role] : ""}
      </Text>
      {user?.role === "reporter" && (
        <ActionButton
          title="我的报修"
          secondary
          onPress={() => router.push("/tickets")}
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
            当前账号没有独立设备台账权限，请联系管理员确认授权。维修人员的任务入口将在后续版本接入。
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
        disabled={loading || action.pending}
        onPress={reload}
      />
    </Screen>
  );
}
