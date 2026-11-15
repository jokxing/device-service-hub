package expo.modules.alipaysandbox

import android.net.Uri
import com.alipay.sdk.app.EnvUtils
import com.alipay.sdk.app.PayTask
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.atomic.AtomicBoolean

class AlipaySandboxModule : Module() {
  private val paying = AtomicBoolean(false)

  override fun definition() = ModuleDefinition {
    Name("AlipaySandbox")
    Constant("environment") { "sandbox" }
    AsyncFunction("pay") { orderString: String ->
      val activity = appContext.currentActivity ?: error("当前页面不可用，请返回订单后重试")
      require(orderString.length in 100..16384) { "无效支付参数" }
      val params = Uri.parse("https://local.invalid/?$orderString")
      require(params.getQueryParameter("method") == "alipay.trade.app.pay" &&
        params.getQueryParameter("sign_type") == "RSA2" &&
        !params.getQueryParameter("sign").isNullOrBlank()) { "无效支付签名参数" }
      check(paying.compareAndSet(false, true)) { "支付正在进行，请勿重复操作" }
      try {
        // Fixed sandbox; never accept an environment switch from JavaScript.
        EnvUtils.setEnv(EnvUtils.EnvEnum.SANDBOX)
        val result = PayTask(activity).payV2(orderString, true)
        // Return only the transport hint. Raw result/order/signature are never logged or persisted.
        mapOf("resultStatus" to (result["resultStatus"] ?: "unknown"))
      } catch (_: Exception) {
        error("支付宝调用未完成，请返回订单查询支付结果")
      } finally {
        paying.set(false)
      }
    }
  }
}
