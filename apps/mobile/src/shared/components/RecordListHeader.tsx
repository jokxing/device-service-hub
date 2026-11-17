import { StyleSheet, Text, View } from "react-native";
import ActionButton from "./ActionButton";
import { colors, fontSizes, spacing } from "../theme";
export default function RecordListHeader({
  title,
  summary,
  refreshLabel,
  loading,
  onRefresh,
}: {
  title: string;
  summary?: string;
  refreshLabel: string;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {summary ? <Text style={styles.summary}>{summary}</Text> : null}
      </View>
      <ActionButton
        title={refreshLabel}
        secondary
        compact
        disabled={loading}
        onPress={onRefresh}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  copy: { flex: 1, minWidth: 0, gap: spacing.xxs },
  title: { color: colors.text, fontSize: fontSizes.body, fontWeight: "600" },
  summary: { color: colors.muted, fontSize: fontSizes.caption },
});
