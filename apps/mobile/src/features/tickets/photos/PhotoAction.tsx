import { Text } from "react-native";
import { typography } from "../../../shared/styles/typography";
export default function PhotoAction(_props: {
  ticketId: string;
  reload: () => void;
}) {
  return <Text style={typography.muted}>请在原生客户端补充照片。</Text>;
}
