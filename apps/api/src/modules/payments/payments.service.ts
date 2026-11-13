import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { PublicUser, PaymentRecord } from "@device-service-hub/contracts";
import { DatabaseService } from "../../database/database.service";
import { Prisma } from "../../generated/prisma/client";
import type { CreateMockPaymentDto } from "./dto/create-mock-payment.dto";
import { PaymentLifecycleService } from "./payment-lifecycle.service";
import { PAYMENT_SELECT } from "./payments.select";
import { toPaymentRecord } from "./utils/payment-payload";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly lifecycle: PaymentLifecycleService,
  ) {}

  async byOrder(actor: PublicUser, orderId: string): Promise<PaymentRecord[]> {
    if (actor.role !== "admin" && actor.role !== "reporter")
      throw new ForbiddenException("当前角色无权查看支付记录");
    const order = await this.database.serviceOrder.findFirst({
      where: {
        id: orderId,
        ...(actor.role === "reporter"
          ? { ticket: { reporterId: actor.id } }
          : {}),
      },
      select: { id: true, ticketId: true },
    });
    if (!order) throw new NotFoundException("订单不存在或无权访问");
    return this.database.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Ticket" WHERE "id"=${order.ticketId} FOR UPDATE`;
      const allowed = await tx.serviceOrder.findFirst({
        where: {
          id: orderId,
          ...(actor.role === "reporter"
            ? { ticket: { reporterId: actor.id } }
            : {}),
        },
        select: { id: true },
      });
      if (!allowed) throw new NotFoundException("订单不存在或无权访问");
      await this.lifecycle.closeExpired(tx, orderId);
      const rows = await tx.paymentAttempt.findMany({
        where: {
          orderId,
          order:
            actor.role === "reporter"
              ? { ticket: { reporterId: actor.id } }
              : {},
        },
        select: PAYMENT_SELECT,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      return rows.map(toPaymentRecord);
    });
  }

  async confirmMock(
    actor: PublicUser,
    orderId: string,
    paymentId: string,
  ): Promise<PaymentRecord> {
    if (actor.role !== "reporter")
      throw new ForbiddenException("仅报修用户可以确认模拟结果");
    const source = await this.database.serviceOrder.findFirst({
      where: { id: orderId, ticket: { reporterId: actor.id } },
      select: { ticketId: true },
    });
    if (!source) throw new NotFoundException("订单不存在或无权访问");
    const result = await this.database.$transaction(async (tx) => {
      await tx.$queryRaw(
        Prisma.sql`SELECT "id" FROM "Ticket" WHERE "id"=${source.ticketId} AND "reporterId"=${actor.id} FOR UPDATE`,
      );
      const order = await tx.serviceOrder.findFirst({
        where: { id: orderId, ticket: { reporterId: actor.id } },
        select: {
          status: true,
          totalCents: true,
          currency: true,
          cancellation: { select: { id: true } },
        },
      });
      await this.lifecycle.closeExpired(tx, orderId);
      const payment = await tx.paymentAttempt.findFirst({
        where: { id: paymentId, orderId, actorId: actor.id, channel: "mock" },
        select: PAYMENT_SELECT,
      });
      if (!order || !payment)
        throw new NotFoundException("模拟支付单不存在或无权访问");
      if (
        payment.amountCents !== order.totalCents ||
        payment.currency !== order.currency
      )
        throw new ConflictException("支付金额或币种与订单不一致");
      if (payment.closeReason === "expired") return null;
      if (payment.status === "succeeded") return toPaymentRecord(payment);
      if (
        payment.status !== "pending" ||
        order.status !== "awaiting_start" ||
        order.cancellation
      )
        throw new ConflictException("模拟支付单或订单已变化，请刷新核对");
      const changed =
        await tx.$executeRaw`UPDATE "PaymentAttempt" SET "status"='succeeded', "succeededAt"=clock_timestamp() AT TIME ZONE 'UTC' WHERE "id"=${payment.id} AND "status"='pending' AND "expiresAt" > clock_timestamp() AT TIME ZONE 'UTC'`;
      if (changed !== 1) {
        await this.lifecycle.closeExpired(tx, orderId);
        return null;
      }
      return toPaymentRecord(
        await tx.paymentAttempt.findUniqueOrThrow({
          where: { id: payment.id },
          select: PAYMENT_SELECT,
        }),
      );
    });
    if (!result)
      throw new ConflictException("模拟支付单已超时关闭，请刷新后重新创建");
    return result;
  }

  async createMock(
    actor: PublicUser,
    orderId: string,
    input: CreateMockPaymentDto,
  ): Promise<PaymentRecord> {
    if (actor.role !== "reporter")
      throw new ForbiddenException("仅工单报修人可以创建模拟支付单");
    const source = await this.database.serviceOrder.findFirst({
      where: { id: orderId, ticket: { reporterId: actor.id } },
      select: { ticketId: true },
    });
    if (!source) throw new NotFoundException("订单不存在或无权访问");
    try {
      return await this.database.$transaction(async (tx) => {
        // Same lock order as cancellation/start: ticket first, then order/payment.
        const locked = await tx.$queryRaw<{ id: string }[]>(
          Prisma.sql`SELECT "id" FROM "Ticket" WHERE "id"=${source.ticketId} AND "reporterId"=${actor.id} FOR UPDATE`,
        );
        if (!locked.length) throw new NotFoundException("订单不存在或无权访问");
        const order = await tx.serviceOrder.findFirst({
          where: { id: orderId, ticket: { reporterId: actor.id } },
          select: {
            id: true,
            status: true,
            totalCents: true,
            currency: true,
            ticket: { select: { status: true, serviceMode: true } },
            cancellation: { select: { id: true } },
            quote: { select: { status: true } },
          },
        });
        if (!order) throw new NotFoundException("订单不存在或无权访问");
        await this.lifecycle.closeExpired(tx, orderId);
        const previous = await tx.paymentAttempt.findUnique({
          where: {
            actorId_requestId: {
              actorId: actor.id,
              requestId: input.requestId,
            },
          },
          select: PAYMENT_SELECT,
        });
        if (previous) {
          if (previous.orderId !== orderId)
            throw new ConflictException(
              "提交编号已用于其他订单的模拟支付，请刷新核对",
            );
          return toPaymentRecord(previous);
        }
        if (
          order.status !== "awaiting_start" ||
          order.cancellation ||
          order.quote.status !== "accepted" ||
          order.ticket.status !== "processing" ||
          order.ticket.serviceMode !== "quoted"
        )
          throw new ConflictException("当前订单不能创建模拟支付单，请刷新核对");
        if (
          order.currency !== "CNY" ||
          !Number.isSafeInteger(order.totalCents) ||
          order.totalCents <= 0
        )
          throw new ConflictException("订单金额不满足支付条件，请核对订单");
        const active = await tx.paymentAttempt.findFirst({
          where: { orderId, status: { in: ["pending", "succeeded"] } },
          select: { id: true },
        });
        if (
          await tx.alipaySandboxPayment.findFirst({
            where: { orderId, status: { in: ["pending", "succeeded"] } },
            select: { id: true },
          })
        )
          throw new ConflictException(
            "订单已有支付宝沙箱记录，不能混用模拟支付，请先核对沙箱结果",
          );
        if (active)
          throw new ConflictException(
            "已有待支付的模拟支付单，请刷新查看，不能重复创建",
          );
        const createdAt = new Date();
        const expiresAt = new Date(createdAt.getTime() + 15 * 60 * 1000);
        return toPaymentRecord(
          await tx.paymentAttempt.create({
            data: {
              orderId,
              actorId: actor.id,
              requestId: input.requestId,
              channel: "mock",
              currency: "CNY",
              amountCents: order.totalCents,
              createdAt,
              expiresAt,
            },
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
          "提交编号已被使用或已有待支付记录，请刷新核对",
        );
      throw error;
    }
  }
}
