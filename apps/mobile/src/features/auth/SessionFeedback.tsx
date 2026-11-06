import { Text } from "react-native";
import Screen from "../../shared/components/Screen";
import ActionButton from "../../shared/components/ActionButton";
import { useNativeSession } from "./sessionContext";
export default function SessionFeedback() {
  const { status, restore } = useNativeSession();
  return (
    <Screen safeTop>
      <Text accessibilityRole="header">
        {status === "loading"
          ? "正在核对登录状态…"
          : "无法恢复登录状态，请检查服务连接后重试。"}
      </Text>
      {status !== "loading" && (
        <ActionButton title="重试连接" onPress={() => void restore()} />
      )}
    </Screen>
  );
}
