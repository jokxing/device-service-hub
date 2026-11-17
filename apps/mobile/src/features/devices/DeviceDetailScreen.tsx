import { useLayoutEffect } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useNativeSession } from "../auth/sessionContext";
import Screen from "../../shared/components/Screen";
import ContentCard from "../../shared/components/ContentCard";
import ActionButton from "../../shared/components/ActionButton";
import HeaderRefreshButton from "../../shared/components/HeaderRefreshButton";
import LoadFeedback from "../../shared/components/LoadFeedback";
import { useDevice } from "./useDeviceResource";
import { deviceStyles as styles } from "./deviceStyles";

export default function DeviceDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useNativeSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, reload } = useDevice(id);
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <HeaderRefreshButton
          accessibilityLabel="刷新详情"
          disabled={loading}
          onPress={reload}
        />
      ),
    });
  }, [navigation, loading, reload]);
  const canRepair =
    !!data?.enabled && user?.role === "reporter" && !!id;
  return (
    <Screen dense>
      <LoadFeedback
        loading={loading && !data}
        error={error}
        loadingLabel="正在读取设备…"
        onRetry={reload}
        retryLabel="刷新详情"
      />
      {data ? (
        <>
          <ContentCard
            eyebrow={data.code}
            title={data.name}
            extra={
              <View
                style={[
                  styles.status,
                  data.enabled ? styles.statusEnabled : styles.statusDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    data.enabled
                      ? styles.statusEnabledText
                      : styles.statusDisabledText,
                  ]}
                >
                  {data.enabled ? "启用" : "停用"}
                </Text>
              </View>
            }
          >
            <View style={styles.fields}>
              <Text style={styles.meta}>类别 · {data.category}</Text>
              <Text style={styles.meta}>型号 · {data.model || "未填写"}</Text>
              <Text style={styles.meta}>位置 · {data.location}</Text>
            </View>
          </ContentCard>

          {canRepair ? (
            <ActionButton
              title="发起文字报修"
              onPress={() =>
                router.push(`/devices/${encodeURIComponent(id)}/repair`)
              }
            />
          ) : null}

          {data && !data.enabled ? (
            <ContentCard title="暂不可报修">
              <Text style={styles.meta}>
                该设备已停用，仅可查看资料；启用后报修用户可从本页发起文字报修。
              </Text>
            </ContentCard>
          ) : null}

          {data?.enabled && user?.role !== "reporter" ? (
            <Text style={styles.meta}>
              当前账号可查看设备资料；文字报修入口仅对报修用户开放。
            </Text>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
