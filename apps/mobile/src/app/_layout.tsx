import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "../shared/theme";
import SessionProvider from "../features/auth/SessionProvider";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerTintColor: colors.text,
            headerStyle: { backgroundColor: colors.background },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ title: "账号登录" }} />
          <Stack.Screen name="(service)" options={{ headerShown: false }} />
          <Stack.Screen
            name="guide"
            options={{ title: "报修须知", headerBackTitle: "返回" }}
          />
        </Stack>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
