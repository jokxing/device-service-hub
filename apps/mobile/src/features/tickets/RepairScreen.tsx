import { Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import Screen from "../../shared/components/Screen";
import ActionButton from "../../shared/components/ActionButton";
import { useDevice } from "../devices/useDeviceResource";
import ReporterAccess from "./components/ReporterAccess";
import LoadFeedback from "../../shared/components/LoadFeedback";
import RepairForm from "./components/RepairForm";
import { ticketStyles as styles } from "./ticketStyles";
function Repair() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, reload } = useDevice(id);
  return (
    <Screen>
      <LoadFeedback loading={loading} error={error} />
      {!!error && (
        <ActionButton title="重新读取设备" secondary onPress={reload} />
      )}
      {data &&
        (data.enabled ? (
          <RepairForm key={data.id} device={data} />
        ) : (
          <Text style={styles.text}>设备已停用，不能新增报修。</Text>
        ))}
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
