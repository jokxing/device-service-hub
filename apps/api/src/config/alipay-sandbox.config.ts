import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";
import { ServiceUnavailableException } from "@nestjs/common";

const file = resolve(
  __dirname,
  "../../../../.local/payments/alipay-sandbox.env",
);
export const ALIPAY_SANDBOX_GATEWAY =
  "https://openapi-sandbox.dl.alipaydev.com/gateway.do";
export function alipaySandboxEnabled(): boolean {
  return existsSync(file);
}
export function getAlipaySandboxConfig() {
  if (!existsSync(file))
    throw new ServiceUnavailableException("支付宝沙箱未配置");
  const env = parseEnv(readFileSync(file, "utf8"));
  const appId = env.ALIPAY_SANDBOX_APP_ID;
  const sellerId = env.ALIPAY_SANDBOX_SELLER_ID;
  const notifyUrl = env.ALIPAY_SANDBOX_NOTIFY_URL || "";
  if (notifyUrl) {
    let url: URL;
    try {
      url = new URL(notifyUrl);
    } catch {
      throw new ServiceUnavailableException("沙箱通知地址格式无效");
    }
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/api/payments/alipay-sandbox/notify"
    )
      throw new ServiceUnavailableException(
        "沙箱通知地址须为 HTTPS 固定通知路径",
      );
  }
  const returnUrl =
    env.ALIPAY_SANDBOX_RETURN_URL ||
    "http://127.0.0.1:3000/payments/alipay-return";
  if (returnUrl !== "http://127.0.0.1:3000/payments/alipay-return")
    throw new ServiceUnavailableException(
      "当前沙箱仅允许返回本地门户的固定支付返回页",
    );
  if (
    env.ALIPAY_SANDBOX_GATEWAY !== ALIPAY_SANDBOX_GATEWAY ||
    !appId ||
    !/^\d+$/.test(appId) ||
    !sellerId ||
    !/^\d+$/.test(sellerId) ||
    !env.ALIPAY_SANDBOX_APP_PRIVATE_KEY ||
    !env.ALIPAY_SANDBOX_ALIPAY_PUBLIC_KEY
  )
    throw new ServiceUnavailableException("支付宝沙箱配置不完整");
  return {
    appId,
    sellerId,
    returnUrl,
    notifyUrl,
    privateKey: env.ALIPAY_SANDBOX_APP_PRIVATE_KEY,
    publicKey: env.ALIPAY_SANDBOX_ALIPAY_PUBLIC_KEY,
  };
}
