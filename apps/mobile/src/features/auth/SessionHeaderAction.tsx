import { useEffect } from "react";
import { Alert, Pressable, StyleSheet, Text } from "react-native";
import { useAction } from "../../shared/hooks/useAction";
import {
  colors,
  controlSizes,
  fontSizes,
  radii,
  spacing,
} from "../../shared/theme";
import { useNativeSession } from "./sessionContext";

export default function SessionHeaderAction() {
  const { signOut } = useNativeSession();
  const action = useAction();
  useEffect(() => {
    if (action.error) Alert.alert("退出失败", action.error);
  }, [action.error]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="退出登录"
      accessibilityState={{ disabled: action.pending, busy: action.pending }}
      disabled={action.pending}
      onPress={() => void action.run(signOut)}
      style={({ pressed }) => [
        styles.button,
        (pressed || action.pending) && styles.faded,
      ]}
    >
      <Text style={styles.text}>{action.pending ? "退出中…" : "退出登录"}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    minHeight: controlSizes.minHeight,
    paddingHorizontal: spacing.xs,
    marginRight: spacing.xs,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.input,
  },
  text: { color: colors.primary, fontSize: fontSizes.body },
  faded: { opacity: 0.65 },
});
