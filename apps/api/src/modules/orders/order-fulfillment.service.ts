import { ConflictException, Injectable } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client";

/** Called inside the ticket command's transaction, after its ownership/version row lock. */
@Injectable()
export class OrderFulfillmentService {
  async recordResult(tx: Prisma.TransactionClient, ticketId: string) {
    const order = await tx.serviceOrder.updateMany({
      where: {
        ticketId,
        status: "in_progress",
        start: { isNot: null },
        cancellation: { is: null },
        quote: { status: "accepted" },
      },
      data: { status: "awaiting_confirmation" },
    });
    if (order.count !== 1)
      throw new ConflictException("订单尚未开工或状态已变化，请刷新后查看");
  }

  async confirmCompletion(tx: Prisma.TransactionClient, ticketId: string) {
    const order = await tx.serviceOrder.updateMany({
      where: {
        ticketId,
        status: "awaiting_confirmation",
        start: { isNot: null },
        cancellation: { is: null },
        quote: { status: "accepted" },
      },
      data: { status: "completed" },
    });
    if (order.count !== 1)
      throw new ConflictException("订单不满足完成条件或已变化，请刷新后查看");
  }
}
