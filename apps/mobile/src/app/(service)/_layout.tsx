import { Redirect, Stack } from "expo-router";
import { useNativeSession } from "../../features/auth/sessionContext";
import SessionFeedback from "../../features/auth/SessionFeedback";
export default function ServiceLayout() {
  const { status, user } = useNativeSession();
  if (status === "loading" || status === "unavailable")
    return <SessionFeedback />;
  if (!user) return <Redirect href="/login" />;
  return (
    <Stack key={user.id}>
      <Stack.Screen name="devices/index" options={{ title: "我的设备" }} />
      <Stack.Screen
        name="devices/[id]"
        options={{ title: "设备详情", headerBackTitle: "返回" }}
      />
    </Stack>
  );
}
