import { Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import Screen from "../../shared/components/Screen";
import ContentCard from "../../shared/components/ContentCard";
import LoadFeedback from "../../shared/components/LoadFeedback";
import { useDevice } from "../devices/useDeviceResource";
import ReporterAccess from "./components/ReporterAccess";
import RepairForm from "./components/RepairForm";
import { ticketStyles as styles } from "./ticketStyles";

function Repair() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, reload } = useDevice(id);
  return (
    <Screen dense>
      <LoadFeedback
        loading={loading && !data}
        error={error}
        loadingLabel="正在读取设备…"
        onRetry={reload}
        retryLabel="重新读取设备"
      />
      {data ? (
        data.enabled ? (
          <RepairForm key={data.id} device={data} />
        ) : (
          <ContentCard title="暂不可报修">
            <Text style={styles.muted}>设备已停用，不能新增报修。</Text>
          </ContentCard>
        )
      ) : null}
    </Screen>
  );
}

export default function RepairScreen() {
  return (
    <ReporterAccess>
      <Repair />
    </ReporterAccess>
  );
}
