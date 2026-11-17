import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Screen from "../../shared/components/Screen";
import ContentCard from "../../shared/components/ContentCard";
import ActionButton from "../../shared/components/ActionButton";
import LoadFeedback from "../../shared/components/LoadFeedback";
import { useNativeSession } from "../auth/sessionContext";
import { ROLE_LABELS } from "../../shared/constants/roles";
import { useDevices } from "./useDeviceResource";
import { deviceStyles as styles } from "./deviceStyles";

function SecondaryNav({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.secondaryChip, pressed && { opacity: 0.7 }]}
    >
      <Text style={styles.secondaryChipText}>{title}</Text>
    </Pressable>
  );
}

export default function DevicesScreen() {
  const router = useRouter();
  const { user } = useNativeSession();
  const { data, error, loading, reload } = useDevices();
  const devices = data ?? [];
  return (
    <Screen dense>
      <View style={styles.identityCard}>
        <Text style={styles.identityName}>{user?.name}</Text>
        <Text style={styles.identityRole}>
          {user ? ROLE_LABELS[user.role] : ""}
        </Text>
      </View>

      <View style={styles.primaryNav}>
        {user?.role !== "technician" && (
          <ActionButton
            title="扫码查看设备"
            onPress={() => router.push("/devices/scan")}
          />
        )}
        <View style={styles.secondaryNav}>
          {user?.role === "reporter" && (
            <SecondaryNav
              title="我的报修"
              onPress={() => router.push("/tickets")}
            />
          )}
          {user?.role === "reporter" && (
            <SecondaryNav
              title="我的订单"
              onPress={() => router.push("/orders")}
            />
          )}
          {user?.role === "technician" && (
            <SecondaryNav
              title="我的任务"
              onPress={() => router.push("/tasks")}
            />
          )}
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>授权设备</Text>
          {!loading && !error ? (
            <Text style={styles.sectionCount}>共 {devices.length} 台</Text>
          ) : null}
        </View>
        <ActionButton
          title="刷新设备"
          secondary
          compact
          disabled={loading}
          onPress={reload}
        />
      </View>

      <LoadFeedback
        loading={loading && devices.length === 0}
        error={error}
        loadingLabel="正在读取设备…"
        onRetry={reload}
        retryLabel="刷新设备"
      />

      {!loading && !error && devices.length === 0 && (
        <ContentCard title="暂无可访问设备">
          <Text style={styles.meta}>
            当前账号没有独立设备台账权限，请联系管理员确认授权。维修人员可通过“我的任务”查看当前分派工单。
          </Text>
        </ContentCard>
      )}

      {devices.length > 0 ? (
        <View style={styles.list}>
          {devices.map((device) => (
            <ContentCard
              key={device.id}
              eyebrow={device.code}
              title={device.name}
              extra={
                <View
                  style={[
                    styles.status,
                    device.enabled
                      ? styles.statusEnabled
                      : styles.statusDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      device.enabled
                        ? styles.statusEnabledText
                        : styles.statusDisabledText,
                    ]}
                  >
                    {device.enabled ? "启用" : "停用"}
                  </Text>
                </View>
              }
            >
              <Text style={styles.meta}>
                {device.category} · {device.location}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="查看设备详情"
                onPress={() =>
                  router.push(`/devices/${encodeURIComponent(device.id)}`)
                }
              >
                <Text style={styles.detailLink}>查看设备详情</Text>
              </Pressable>
            </ContentCard>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
