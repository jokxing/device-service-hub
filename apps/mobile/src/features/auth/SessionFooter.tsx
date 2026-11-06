import { Text } from "react-native";
import ActionButton from "../../shared/components/ActionButton";
import { useAction } from "../../shared/hooks/useAction";
import { typography as styles } from "../../shared/styles/typography";
import { useNativeSession } from "./sessionContext";
export default function SessionFooter() {
  const { signOut } = useNativeSession();
  const action = useAction();
  return (
    <>
      {!!action.error && (
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
  );
}
