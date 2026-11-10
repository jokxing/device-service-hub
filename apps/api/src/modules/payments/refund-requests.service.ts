import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import type { PublicUser, PaymentRecord } from "@device-service-hub/contracts";
import { DatabaseService } from "../../database/database.service";
import { Prisma } from "../../generated/prisma/client";
import type { RequestMockRefundDto } from "./dto/request-mock-refund.dto";
import { PAYMENT_SELECT } from "./payments.select";
import { toPaymentRecord } from "./utils/payment-payload";
@Injectable()
export class RefundRequestsService {
  constructor(private readonly database: DatabaseService) {}
  async request(
    actor: PublicUser,
    orderId: string,
    paymentId: string,
    input: RequestMockRefundDto,
  ): Promise<PaymentRecord> {
    if (actor.role !== "reporter")
      throw new ForbiddenException("仅报修用户可以申请模拟退款");
    const source = await this.database.serviceOrder.findFirst({
      where: { id: orderId, ticket: { reporterId: actor.id } },
      select: { ticketId: true },
    });
    if (!source) throw new NotFoundException("订单不存在或无权访问");
    try {
      return await this.database.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Ticket" WHERE "id"=${source.ticketId} FOR UPDATE`;
        const payment = await tx.paymentAttempt.findFirst({
          where: {
            id: paymentId,
            orderId,
            actorId: actor.id,
            order: { ticket: { reporterId: actor.id } },
          },
          select: {
            ...PAYMENT_SELECT,
            order: {
              select: { status: true, totalCents: true, currency: true },
            },
          },
        });
        if (!payment) throw new NotFoundException("支付单不存在或无权访问");
        const previous = await tx.mockRefundRequest.findUnique({
          where: {
            actorId_requestId: {
              actorId: actor.id,
              requestId: input.requestId,
            },
          },
        });
        if (previous) {
          if (
            previous.paymentId !== paymentId ||
            previous.reason !== input.reason
          )
            throw new ConflictException("提交编号已用于不同退款申请");
          const { order, ...record } = payment;
          return toPaymentRecord(record);
        }
        if (
          payment.status !== "succeeded" ||
          payment.channel !== "mock" ||
          payment.order.status !== "awaiting_start" ||
          payment.refund ||
          payment.amountCents !== payment.order.totalCents ||
          payment.currency !== payment.order.currency
        )
          throw new ConflictException("当前支付单不能申请模拟退款，请刷新核对");
        await tx.mockRefundRequest.create({
          data: {
            paymentId,
            actorId: actor.id,
            requestId: input.requestId,
            reason: input.reason,
            amountCents: payment.amountCents,
          },
        });
        await tx.ticket.update({
          where: { id: source.ticketId },
          data: { version: { increment: 1 } },
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
        throw new ConflictException(
          "退款申请已存在或提交编号已被使用，请刷新核对",
        );
      throw error;
    }
  }
}
