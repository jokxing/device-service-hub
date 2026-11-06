import type { PropsWithChildren } from "react";
import { Text } from "react-native";
import Screen from "../../../shared/components/Screen";
import { useNativeSession } from "../../auth/sessionContext";
import { ticketStyles as styles } from "../ticketStyles";
export default function ReporterAccess({ children }: PropsWithChildren) {
  const { user } = useNativeSession();
  return user?.role === "reporter" ? (
    children
  ) : (
    <Screen>
      <Text style={styles.text}>当前角色不能使用本人报修入口。</Text>
    </Screen>
  );
}
