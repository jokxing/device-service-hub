import type { PropsWithChildren } from "react";
import { Text } from "react-native";
import Screen from "../../shared/components/Screen";
import { useNativeSession } from "../auth/sessionContext";
import { typography as styles } from "../../shared/styles/typography";
export default function TechnicianAccess({ children }: PropsWithChildren) {
  const { user } = useNativeSession();
  return user?.role === "technician" ? (
    children
  ) : (
    <Screen>
      <Text style={styles.text}>仅维修人员可以访问本人任务与接单。</Text>
    </Screen>
  );
}
