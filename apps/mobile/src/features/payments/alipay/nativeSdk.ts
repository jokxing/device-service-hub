import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

interface AlipayModule {
  environment: string;
  pay(orderString: string): Promise<{ resultStatus: string }>;
}
const sdk =
  Platform.OS === "android"
    ? requireOptionalNativeModule<AlipayModule>("AlipaySandbox")
    : null;
export const alipaySdkAvailable = sdk?.environment === "sandbox";
export function payWithAlipay(orderString: string) {
  if (!sdk || !alipaySdkAvailable)
    throw new Error(
      "请安装包含支付模块的 Android 安装包，Expo Go 不支持此能力。",
    );
  return sdk.pay(orderString);
}
