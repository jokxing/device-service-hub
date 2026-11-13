import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import {
  ALIPAY_SANDBOX_GATEWAY,
  getAlipaySandboxConfig,
} from "../../../config/alipay-sandbox.config";
import {
  chinaTime,
  signParams,
  verifyResponse,
  responseObject,
} from "./sandbox-protocol";
import { verifyNotification } from "./sandbox-notification";

@Injectable()
export class AlipaySandboxGateway {
  checkout(
    id: string,
    amountCents: number,
    expiresAt: Date,
    orderId: string,
  ): string {
    const config = getAlipaySandboxConfig();
    const returnUrl = new URL(config.returnUrl);
    returnUrl.searchParams.set("orderId", orderId);
    const params = this.params(
      "alipay.trade.page.pay",
      {
        out_trade_no: id,
        total_amount: `${Math.floor(amountCents / 100)}.${String(amountCents % 100).padStart(2, "0")}`,
        subject: "设备维修服务（支付宝沙箱）",
        product_code: "FAST_INSTANT_TRADE_PAY",
        time_expire: chinaTime(expiresAt),
        seller_id: config.sellerId,
      },
      {
        return_url: returnUrl.href,
        ...(config.notifyUrl ? { notify_url: config.notifyUrl } : {}),
      },
    );
    return ALIPAY_SANDBOX_GATEWAY + "?" + new URLSearchParams(params);
  }
  notification(body: unknown): Record<string, string> {
    return verifyNotification(body, getAlipaySandboxConfig().publicKey);
  }
  private params(
    method: string,
    business: Record<string, string>,
    common: Record<string, string> = {},
  ): Record<string, string> {
    const config = getAlipaySandboxConfig();
    const params = {
      ...common,
      app_id: config.appId,
      method,
      format: "JSON",
      charset: "utf-8",
      sign_type: "RSA2",
      timestamp: chinaTime(new Date()),
      version: "1.0",
      biz_content: JSON.stringify(business),
    };
    return { ...params, sign: signParams(params, config.privateKey) };
  }
  async query(id: string): Promise<Record<string, unknown>> {
    return this.execute("query", id);
  }
  async close(id: string): Promise<Record<string, unknown>> {
    return this.execute("close", id);
  }
  async refund(id: string, refundId: string, amountCents: number) {
    return this.execute("refund", id, {
      out_request_no: refundId,
      refund_amount: `${Math.floor(amountCents / 100)}.${String(amountCents % 100).padStart(2, "0")}`,
      refund_reason: "设备维修服务全额退款（支付宝沙箱）",
    });
  }
  async queryRefund(id: string, refundId: string) {
    return this.execute("fastpay.refund.query", id, {
      out_request_no: refundId,
    });
  }
  private async execute(
    action: "query" | "close" | "refund" | "fastpay.refund.query",
    id: string,
    extra: Record<string, string> = {},
  ): Promise<Record<string, unknown>> {
    try {
      const config = getAlipaySandboxConfig();
      const response = await fetch(ALIPAY_SANDBOX_GATEWAY, {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(5000),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        },
        body: new URLSearchParams(
          this.params(`alipay.trade.${action}`, { out_trade_no: id, ...extra }),
        ),
      });
      if (!response.ok) throw new Error("HTTP failure");
      const text = await response.text();
      const parsed: unknown = JSON.parse(text);
      if (
        !parsed ||
        typeof parsed !== "object" ||
        !("sign" in parsed) ||
        typeof parsed.sign !== "string"
      )
        throw new Error("Missing signature");
      const name = `alipay_trade_${action.replaceAll(".", "_")}_response`;
      if (!verifyResponse(text, name, parsed.sign, config.publicKey))
        throw new Error("Bad signature");
      // Parse exactly the object whose original bytes were verified.
      const result: unknown = JSON.parse(responseObject(text, name));
      if (!result || typeof result !== "object" || Array.isArray(result))
        throw new Error("Bad response");
      return result as Record<string, unknown>;
    } catch {
      throw new ServiceUnavailableException(
        "支付宝沙箱请求失败或验签未通过，请刷新查单核对；本地状态未按失败结果变更",
      );
    }
  }
}
