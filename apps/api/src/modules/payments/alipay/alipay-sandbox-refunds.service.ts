import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { PublicUser } from "@device-service-hub/contracts";
import { DatabaseService } from "../../../database/database.service";
import { Prisma } from "../../../generated/prisma/client";
import { getAlipaySandboxConfig } from "../../../config/alipay-sandbox.config";
import { AlipaySandboxGateway } from "./alipay-sandbox.gateway";
import { toSandboxPayment } from "./alipay-payment-record";
import { yuanToCents } from "./sandbox-protocol";
import type { RequestAlipayRefundDto } from "../dto/request-alipay-refund.dto";

@Injectable()
export class AlipaySandboxRefundsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly gateway: AlipaySandboxGateway,
  ) {}

  private async scope(actor: PublicUser, orderId: string) {
    if (actor.role !== "admin" && actor.role !== "reporter")
      throw new ForbiddenException("无权访问沙箱退款");
    const order = await this.db.serviceOrder.findFirst({
      where: {
        id: orderId,
        ...(actor.role === "reporter"
          ? { ticket: { reporterId: actor.id } }
          : {}),
      },
      select: { ticketId: true },
    });
    if (!order) throw new NotFoundException("订单不存在或无权访问");
    return order;
  }
  async listAdmin(actor: PublicUser, orderId: string) {
    if (actor.role !== "admin")
      throw new ForbiddenException("仅管理员可查看此入口");
    await this.scope(actor, orderId);
    return {
      payments: (
        await this.db.alipaySandboxPayment.findMany({
          where: { orderId },
          include: { refund: true },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        })
      ).map(toSandboxPayment),
    };
  }
  private async payment(actor: PublicUser, orderId: string, id: string) {
    await this.scope(actor, orderId);
    const payment = await this.db.alipaySandboxPayment.findFirst({
      where: {
        id,
        orderId,
        ...(actor.role === "reporter" ? { actorId: actor.id } : {}),
      },
      include: {
        refund: true,
        order: { include: { ticket: true, start: true, cancellation: true } },
      },
    });
    if (!payment) throw new NotFoundException("支付单不存在或无权访问");
    return payment;
  }
  private checkSnapshot(
    payment: Awaited<ReturnType<AlipaySandboxRefundsService["payment"]>>,
  ) {
    const config = getAlipaySandboxConfig();
    if (
      payment.appId !== config.appId ||
      payment.sellerId !== config.sellerId ||
      payment.status !== "succeeded" ||
      !payment.tradeNo ||
      payment.amountCents !== payment.order.totalCents ||
      payment.order.currency !== "CNY" ||
      (payment.refund && payment.refund.amountCents !== payment.amountCents)
    )
      throw new ConflictException("沙箱支付身份或金额快照不匹配");
  }
  private checkUnstarted(
    payment: Awaited<ReturnType<AlipaySandboxRefundsService["payment"]>>,
  ) {
    if (
      payment.order.status !== "awaiting_start" ||
      payment.order.start ||
      payment.order.cancellation ||
      payment.order.ticket.status !== "processing" ||
      payment.order.ticket.serviceMode !== "quoted"
    )
      throw new ConflictException("仅未开工服务可以申请或处理全额沙箱退款");
  }
  async request(
    actor: PublicUser,
    orderId: string,
    id: string,
    input: RequestAlipayRefundDto,
  ) {
    if (actor.role !== "reporter")
      throw new ForbiddenException("仅报修用户可以申请沙箱退款");
    const source = await this.scope(actor, orderId);
    try {
      return await this.db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Ticket" WHERE "id"=${source.ticketId} FOR UPDATE`;
        const payment = await tx.alipaySandboxPayment.findFirst({
          where: {
            id,
            orderId,
            actorId: actor.id,
            order: { ticket: { reporterId: actor.id } },
          },
          include: {
            refund: true,
            order: {
              include: { ticket: true, start: true, cancellation: true },
            },
          },
        });
        if (!payment) throw new NotFoundException("支付单不存在或无权访问");
        const previous = await tx.alipaySandboxRefund.findUnique({
          where: {
            actorId_requestId: {
              actorId: actor.id,
              requestId: input.requestId,
            },
          },
        });
        if (previous) {
          if (previous.paymentId !== id || previous.reason !== input.reason)
            throw new ConflictException("提交编号已用于不同退款申请");
          return toSandboxPayment(payment);
        }
        this.checkSnapshot(payment);
        this.checkUnstarted(payment);
        if (payment.refund)
          throw new ConflictException("已有退款申请，请刷新查看原记录");
        await tx.alipaySandboxRefund.create({
          data: {
            paymentId: id,
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
        return toSandboxPayment(
          await tx.alipaySandboxPayment.findUniqueOrThrow({
            where: { id },
            include: { refund: true },
          }),
        );
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new ConflictException(
          "退款申请已存在或提交编号被占用，请刷新核对",
        );
      throw error;
    }
  }
  async submit(actor: PublicUser, orderId: string, id: string) {
    if (actor.role !== "admin")
      throw new ForbiddenException("仅管理员可执行沙箱退款");
    const source = await this.scope(actor, orderId);
    const payment = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Ticket" WHERE "id"=${source.ticketId} FOR UPDATE`;
      const row = await tx.alipaySandboxPayment.findFirst({
        where: { id, orderId },
        include: {
          refund: true,
          order: { include: { ticket: true, start: true, cancellation: true } },
        },
      });
      if (!row?.refund) throw new NotFoundException("退款申请不存在");
      this.checkSnapshot(row);
      if (row.refund.status === "succeeded") return row;
      this.checkUnstarted(row);
      await tx.alipaySandboxRefund.update({
        where: { id: row.refund.id },
        data: {
          status: "processing",
          handledById: row.refund.handledById ?? actor.id,
          submittedAt: row.refund.submittedAt ?? new Date(),
        },
      });
      return row;
    });
    if (payment.refund!.status === "succeeded")
      return toSandboxPayment(payment);
    // Persist the one refund ID before I/O. Every explicit retry uses this same ID and amount.
    const result = await this.gateway.refund(
      id,
      payment.refund!.id,
      payment.amountCents,
    );
    this.matchResult(payment, result, false);
    if (
      result.code !== "10000" ||
      !["Y", "N"].includes(String(result.fund_change))
    )
      throw new ServiceUnavailableException(
        "沙箱退款尚未确认，请先查询退款结果；重试将沿用原退款编号",
      );
    return this.complete(actor, orderId, id);
  }
  private matchResult(
    payment: Awaited<ReturnType<AlipaySandboxRefundsService["payment"]>>,
    result: Record<string, unknown>,
    query: boolean,
  ) {
    if (result.code !== "10000") return;
    try {
      if (
        result.out_trade_no !== payment.id ||
        result.trade_no !== payment.tradeNo ||
        (query && result.out_request_no !== payment.refund!.id) ||
        (!query &&
          result.out_request_no !== undefined &&
          result.out_request_no !== payment.refund!.id) ||
        yuanToCents(query ? result.refund_amount : result.refund_fee) !==
          payment.refund!.amountCents ||
        (result.total_amount !== undefined &&
          yuanToCents(result.total_amount) !== payment.amountCents)
      )
        throw new Error("Mismatch");
    } catch {
      throw new ServiceUnavailableException(
        "沙箱退款交易、请求编号或金额不匹配，本地结果保持待核实",
      );
    }
  }
  async query(actor: PublicUser, orderId: string, id: string) {
    const payment = await this.payment(actor, orderId, id);
    if (!payment.refund) throw new NotFoundException("退款申请不存在");
    this.checkSnapshot(payment);
    if (payment.refund.status !== "processing")
      return toSandboxPayment(payment);
    const result = await this.gateway.queryRefund(id, payment.refund.id);
    this.matchResult(payment, result, true);
    if (result.code === "10000" && result.refund_status === "REFUND_SUCCESS")
      return this.complete(actor, orderId, id);
    if (
      result.code !== "10000" &&
      !(
        result.code === "40004" &&
        ["ACQ.REFUND_NOT_EXIST", "ACQ.TRADE_NOT_EXIST"].includes(
          String(result.sub_code),
        )
      )
    )
      throw new ServiceUnavailableException("沙箱退款查询失败，请稍后重新核对");
    await this.db.alipaySandboxRefund.updateMany({
      where: { id: payment.refund.id, status: "processing" },
      data: { checkedAt: new Date() },
    });
    return toSandboxPayment(await this.payment(actor, orderId, id));
  }
  private async complete(actor: PublicUser, orderId: string, id: string) {
    const source = await this.scope(actor, orderId);
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Ticket" WHERE "id"=${source.ticketId} FOR UPDATE`;
      const payment = await tx.alipaySandboxPayment.findFirst({
        where: {
          id,
          orderId,
          ...(actor.role === "reporter"
            ? { actorId: actor.id, order: { ticket: { reporterId: actor.id } } }
            : {}),
        },
        include: {
          refund: true,
          order: { include: { ticket: true, start: true, cancellation: true } },
        },
      });
      if (!payment?.refund?.handledById)
        throw new ConflictException("退款尚未由管理员提交");
      this.checkSnapshot(payment);
      if (payment.refund.status === "succeeded")
        return toSandboxPayment(payment);
      this.checkUnstarted(payment);
      if (payment.refund.status !== "processing")
        throw new ConflictException("退款申请状态已变化");
      const [{ now }] = await tx.$queryRaw<
        { now: Date }[]
      >`SELECT clock_timestamp() AT TIME ZONE 'UTC' AS now`;
      await tx.alipaySandboxRefund.update({
        where: { id: payment.refund.id },
        data: { status: "succeeded", checkedAt: now, succeededAt: now },
      });
      await tx.serviceOrderCancellation.create({
        data: {
          orderId,
          actorId: payment.refund.handledById,
          requestId: payment.refund.id,
          expectedVersion: payment.order.ticket.version,
          reason: "全额支付宝沙箱退款成功，结束未开工服务",
        },
      });
      await tx.serviceOrder.update({
        where: { id: orderId },
        data: { status: "cancelled" },
      });
      await tx.ticket.update({
        where: { id: source.ticketId },
        data: { status: "cancelled", version: { increment: 1 } },
      });
      return toSandboxPayment(
        await tx.alipaySandboxPayment.findUniqueOrThrow({
          where: { id },
          include: { refund: true },
        }),
      );
    });
  }
}
