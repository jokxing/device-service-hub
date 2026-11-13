import { Injectable, ConflictException } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client";
/** Caller owns the ticket row lock and transaction. No separate payment transaction. */
@Injectable()
export class PaymentLifecycleService {
  /** Caller holds the ticket lock. Database clock is read after lock acquisition. */
  async closeExpired(tx: Prisma.TransactionClient, orderId: string) {
    return tx.$executeRaw`UPDATE "PaymentAttempt" SET "status"='closed', "closedAt"=clock_timestamp() AT TIME ZONE 'UTC', "closeReason"='expired' WHERE "orderId"=${orderId} AND "status"='pending' AND "expiresAt" <= clock_timestamp() AT TIME ZONE 'UTC'`;
  }

  async closeForOrderCancellation(
    tx: Prisma.TransactionClient,
    orderId: string,
  ) {
    if (
      await tx.alipaySandboxPayment.findFirst({
        where: { orderId, status: { in: ["pending", "succeeded"] } },
        select: { id: true },
      })
    )
      throw new ConflictException(
        "订单存在待核实或已成功的支付宝沙箱记录，不能直接取消；请先查单，已成功记录的沙箱退款尚未接入",
      );
    if (
      await tx.paymentAttempt.findFirst({
        where: { orderId, status: "succeeded" },
        select: { id: true },
      })
    )
      throw new ConflictException(
        "订单已有模拟成功记录，不能直接取消；请在门户查看退款流程",
      );
    return tx.paymentAttempt.updateMany({
      where: { orderId, status: "pending" },
      data: {
        status: "closed",
        closedAt: new Date(),
        closeReason: "order_cancelled",
      },
    });
  }
}
