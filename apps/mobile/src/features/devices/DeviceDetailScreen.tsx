import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import type { DeviceSummary } from "@device-service-hub/contracts";
import Screen from "../../shared/components/Screen";
import ContentCard from "../../shared/components/ContentCard";
import ActionButton from "../../shared/components/ActionButton";
import { useDeviceResource } from "./useDeviceResource";
import { deviceStyles as styles } from "./deviceStyles";
export default function DeviceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, reload } = useDeviceResource<DeviceSummary>(
    "/mobile/devices/" + encodeURIComponent(id),
  );
  return (
    <Screen>
      {loading && <Text style={styles.text}>正在读取设备…</Text>}
      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      {data && (
        <ContentCard title={data.name}>
          <View style={styles.fields}>
            <Text style={styles.code}>{data.code}</Text>
            <Text style={styles.text}>类别：{data.category}</Text>
            <Text style={styles.text}>型号：{data.model || "未填写"}</Text>
            <Text style={styles.text}>位置：{data.location}</Text>
            <Text style={styles.text}>
              状态：{data.enabled ? "启用" : "停用"}
            </Text>
          </View>
        </ContentCard>
      )}
      <ActionButton
        title="刷新详情"
        secondary
        disabled={loading}
        onPress={reload}
      />
    </Screen>
  );
}
