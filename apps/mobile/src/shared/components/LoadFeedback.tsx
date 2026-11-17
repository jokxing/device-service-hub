import { StyleSheet, Text, View } from "react-native";
import ActionButton from "./ActionButton";
import { spacing } from "../theme";
import { typography as styles } from "../styles/typography";

export default function LoadFeedback({
  loading,
  error,
  loadingLabel = "正在读取…",
  onRetry,
  retryLabel = "重试",
}: {
  loading: boolean;
  error: string;
  loadingLabel?: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  if (!loading && !error) return null;
  return (
    <View style={layout.wrap}>
      {loading && <Text style={styles.text}>{loadingLabel}</Text>}
      {!!error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      {!!error && onRetry ? (
        <ActionButton
          title={retryLabel}
          secondary
          compact
          disabled={loading}
          onPress={onRetry}
        />
      ) : null}
    </View>
  );
}

const layout = StyleSheet.create({
  wrap: { gap: spacing.sm },
});
