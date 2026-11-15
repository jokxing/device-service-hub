import { StyleSheet, View } from "react-native";
import { spacing } from "../theme";
import ActionButton from "./ActionButton";

export default function Pagination({
  page,
  pagination,
  loading,
  onPageChange,
}: {
  page: number;
  pagination: { total: number; pageSize: number } | null;
  loading: boolean;
  onPageChange: (page: number) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.item}>
        <ActionButton
          title="上一页"
          secondary
          disabled={loading || page <= 1}
          onPress={() => onPageChange(page - 1)}
        />
      </View>
      <View style={styles.item}>
        <ActionButton
          title="下一页"
          secondary
          disabled={
            loading ||
            !pagination ||
            page * pagination.pageSize >= pagination.total
          }
          onPress={() => onPageChange(page + 1)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.sm },
  item: { flex: 1, minWidth: 0 },
});
