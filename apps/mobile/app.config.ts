import type { ExpoConfig } from "expo/config";
import app from "./app.json";

const config = app.expo as ExpoConfig;
export default (): ExpoConfig =>
  process.env.DSH_ANDROID_LOCAL_APK === "1"
    ? {
        ...config,
        name: "设备服务（内测）",
        android: { ...config.android, allowBackup: false },
        plugins: [
          ...(config.plugins ?? []),
          "./plugins/withLocalAndroidTest.cjs",
        ],
      }
    : config;
