import { Text } from "react-native";
import { typography as styles } from "../styles/typography";
export default function LoadFeedback({
  loading,
  error,
}: {
  loading: boolean;
  error: string;
}) {
  return (
    <>
      {loading && <Text style={styles.text}>正在读取…</Text>}
      {!!error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
    </>
  );
}
