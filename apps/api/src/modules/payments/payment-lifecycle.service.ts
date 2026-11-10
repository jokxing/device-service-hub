import { Injectable } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client";
/** Caller owns the ticket row lock and transaction. No separate payment transaction. */
@Injectable()
export class PaymentLifecycleService {
  closeForOrderCancellation(tx: Prisma.TransactionClient, orderId: string) {
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
