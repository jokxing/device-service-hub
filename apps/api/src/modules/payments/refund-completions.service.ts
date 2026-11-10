import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import type { PublicUser, PaymentRecord } from "@device-service-hub/contracts";
import { DatabaseService } from "../../database/database.service";
import { Prisma } from "../../generated/prisma/client";
import type { CreateMockPaymentDto } from "./dto/create-mock-payment.dto";
import { PAYMENT_SELECT } from "./payments.select";
import { toPaymentRecord } from "./utils/payment-payload";
@Injectable()
export class RefundCompletionsService {
  constructor(private readonly database: DatabaseService) {}
  async complete(
    actor: PublicUser,
    orderId: string,
    paymentId: string,
    input: CreateMockPaymentDto,
  ): Promise<PaymentRecord> {
    if (actor.role !== "admin")
      throw new ForbiddenException("仅管理员可以记录模拟退款成功");
    const source = await this.database.serviceOrder.findUnique({
      where: { id: orderId },
      select: { ticketId: true },
    });
    if (!source) throw new NotFoundException("订单不存在");
    try {
      return await this.database.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Ticket" WHERE "id"=${source.ticketId} FOR UPDATE`;
        const payment = await tx.paymentAttempt.findFirst({
          where: { id: paymentId, orderId },
          select: PAYMENT_SELECT,
        });
        if (!payment?.refund) throw new NotFoundException("退款申请不存在");
        const previous = await tx.mockRefundCompletion.findUnique({
          where: {
            actorId_requestId: {
              actorId: actor.id,
              requestId: input.requestId,
            },
          },
        });
        if (previous) {
          if (previous.refundId !== payment.refund.id)
            throw new ConflictException("提交编号已用于其他退款结果");
          return toPaymentRecord(payment);
        }
        const ticket = await tx.ticket.findUniqueOrThrow({
          where: { id: source.ticketId },
          select: { version: true, status: true, serviceMode: true },
        });
        const order = await tx.serviceOrder.findUniqueOrThrow({
          where: { id: orderId },
          select: {
            status: true,
            totalCents: true,
            currency: true,
            start: { select: { id: true } },
            cancellation: { select: { id: true } },
          },
        });
        if (
          payment.refund.completion ||
          payment.status !== "succeeded" ||
          payment.channel !== "mock" ||
          payment.amountCents !== payment.refund.amountCents ||
          payment.amountCents !== order.totalCents ||
          payment.currency !== order.currency ||
          order.status !== "awaiting_start" ||
          order.start ||
          order.cancellation ||
          ticket.status !== "processing" ||
          ticket.serviceMode !== "quoted"
        )
          throw new ConflictException("退款申请或订单已变化，请刷新核对");
        await tx.mockRefundCompletion.create({
          data: {
            refundId: payment.refund.id,
            actorId: actor.id,
            requestId: input.requestId,
          },
        });
        await tx.ticket.update({
          where: { id: source.ticketId },
          data: { status: "cancelled", version: { increment: 1 } },
        });
        await tx.serviceOrder.update({
          where: { id: orderId },
          data: { status: "cancelled" },
        });
        await tx.serviceOrderCancellation.create({
          data: {
            orderId,
            actorId: actor.id,
            requestId: input.requestId,
            expectedVersion: ticket.version,
            reason: "全额模拟退款处理成功，结束未开工服务",
          },
        });
        return toPaymentRecord(
          await tx.paymentAttempt.findUniqueOrThrow({
            where: { id: paymentId },
            select: PAYMENT_SELECT,
          }),
        );
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new ConflictException("结果已记录或提交编号已被使用，请刷新核对");
      throw error;
    }
  }
}
