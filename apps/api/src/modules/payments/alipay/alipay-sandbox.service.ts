import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type {
  PublicUser,
  AlipaySandboxPaymentRecord,
  AlipaySandboxCheckout,
  CreateAlipaySandboxInput,
} from "@device-service-hub/contracts";
import { DatabaseService } from "../../../database/database.service";
import { Prisma } from "../../../generated/prisma/client";
import type { AlipaySandboxPayment } from "../../../generated/prisma/client";
import {
  alipaySandboxEnabled,
  getAlipaySandboxConfig,
} from "../../../config/alipay-sandbox.config";
import { AlipaySandboxGateway } from "./alipay-sandbox.gateway";
import { yuanToCents } from "./sandbox-protocol";
import { toSandboxPayment as record } from "./alipay-payment-record";
@Injectable()
export class AlipaySandboxService {
  constructor(
    private readonly db: DatabaseService,
    private readonly gateway: AlipaySandboxGateway,
  ) {}
  private async own(actor: PublicUser, orderId: string) {
    if (actor.role !== "reporter")
      throw new ForbiddenException("支付宝沙箱仅向报修用户开放");
    const order = await this.db.serviceOrder.findFirst({
      where: { id: orderId, ticket: { reporterId: actor.id } },
      select: { ticketId: true },
    });
    if (!order) throw new NotFoundException("订单不存在或无权访问");
    return order;
  }
  async list(
    actor: PublicUser,
    orderId: string,
  ): Promise<{ enabled: boolean; payments: AlipaySandboxPaymentRecord[] }> {
    await this.own(actor, orderId);
    const rows = await this.db.alipaySandboxPayment.findMany({
      where: { orderId, actorId: actor.id },
      include: { refund: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    return { enabled: alipaySandboxEnabled(), payments: rows.map(record) };
  }
  async create(
    actor: PublicUser,
    orderId: string,
    input: CreateAlipaySandboxInput,
  ): Promise<AlipaySandboxCheckout> {
    const source = await this.own(actor, orderId);
    const config = getAlipaySandboxConfig();
    try {
      return await this.db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Ticket" WHERE "id"=${source.ticketId} FOR UPDATE`;
        const order = await tx.serviceOrder.findFirst({
          where: { id: orderId, ticket: { reporterId: actor.id } },
          select: {
            status: true,
            totalCents: true,
            currency: true,
            cancellation: true,
            quote: { select: { status: true } },
            ticket: { select: { status: true, serviceMode: true } },
          },
        });
        if (!order) throw new NotFoundException("订单不存在或无权访问");
        const previous = await tx.alipaySandboxPayment.findUnique({
          where: {
            actorId_requestId: {
              actorId: actor.id,
              requestId: input.requestId,
            },
          },
        });
        if (previous && previous.orderId !== orderId)
          throw new ConflictException("提交编号已用于其他订单");
        if (previous && previous.status !== "pending")
          return { payment: record(previous), checkoutUrl: null };
        if (
          order.status !== "awaiting_start" ||
          order.cancellation ||
          order.quote.status !== "accepted" ||
          order.ticket.status !== "processing" ||
          order.ticket.serviceMode !== "quoted"
        )
          throw new ConflictException("当前订单不能发起沙箱支付");
        if (
          order.currency !== "CNY" ||
          !Number.isSafeInteger(order.totalCents) ||
          order.totalCents <= 0
        )
          throw new ConflictException("订单金额不符合支付条件");
        if (
          await tx.paymentAttempt.findFirst({
            where: { orderId, status: { in: ["pending", "succeeded"] } },
            select: { id: true },
          })
        )
          throw new ConflictException(
            "此订单存在模拟支付记录，请使用另一笔订单验证沙箱",
          );
        if (
          !previous &&
          (await tx.alipaySandboxPayment.findFirst({
            where: { orderId, status: { in: ["pending", "succeeded"] } },
            select: { id: true },
          }))
        )
          throw new ConflictException(
            "已有沙箱支付记录，请刷新查看并继续原支付单",
          );
        const [{ now }] = await tx.$queryRaw<
          { now: Date }[]
        >`SELECT clock_timestamp() AT TIME ZONE 'UTC' AS now`;
        const row =
          previous ??
          (await tx.alipaySandboxPayment.create({
            data: {
              orderId,
              actorId: actor.id,
              requestId: input.requestId,
              amountCents: order.totalCents,
              appId: config.appId,
              sellerId: config.sellerId,
              createdAt: now,
              expiresAt: new Date(
                Math.floor(now.getTime() / 1000) * 1000 + 900000,
              ),
            },
          }));
        if (
          row.appId !== config.appId ||
          row.sellerId !== config.sellerId ||
          row.amountCents !== order.totalCents
        )
          throw new ConflictException(
            "沙箱应用或订单金额已变化，不能重用原支付单",
          );
        return {
          payment: record(row),
          checkoutUrl:
            row.expiresAt <= now
              ? null
              : this.gateway.checkout(
                  row.id,
                  row.amountCents,
                  row.expiresAt,
                  orderId,
                ),
        };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new ConflictException("已有支付记录或提交编号被占用，请刷新核对");
      throw error;
    }
  }
  async checkout(
    actor: PublicUser,
    orderId: string,
    id: string,
  ): Promise<AlipaySandboxCheckout> {
    await this.own(actor, orderId);
    const row = await this.db.alipaySandboxPayment.findFirst({
      where: { id, orderId, actorId: actor.id },
    });
    if (!row) throw new NotFoundException("沙箱支付单不存在");
    return this.create(actor, orderId, { requestId: row.requestId });
  }
  async query(
    actor: PublicUser,
    orderId: string,
    id: string,
    closeExpired = true,
  ): Promise<AlipaySandboxPaymentRecord> {
    await this.own(actor, orderId);
    const row = await this.db.alipaySandboxPayment.findFirst({
      where: { id, orderId, actorId: actor.id },
    });
    if (!row) throw new NotFoundException("沙箱支付单不存在");
    const config = getAlipaySandboxConfig();
    if (row.appId !== config.appId || row.sellerId !== config.sellerId)
      throw new ConflictException("沙箱配置已变化，无法核对原支付单");
    // Network outside transaction; the response cannot overwrite a newer terminal result.
    const [queryClock] = await this.db.$queryRaw<
      { now: Date }[]
    >`SELECT clock_timestamp() AT TIME ZONE 'UTC' AS now`;
    const result = await this.gateway.query(id);
    let status: "pending" | "succeeded" | "closed" = "pending";
    const missing =
      result.code === "40004" && result.sub_code === "ACQ.TRADE_NOT_EXIST";
    if (!missing) {
      try {
        // trade.query does not guarantee seller_id. The request is scoped to our pinned
        // app credentials (no third-party app_auth_token); validate extra identity fields if returned.
        if (
          result.code !== "10000" ||
          result.out_trade_no !== id ||
          (result.seller_id !== undefined &&
            result.seller_id !== row.sellerId) ||
          (result.app_id !== undefined && result.app_id !== row.appId) ||
          (result.trans_currency !== undefined &&
            result.trans_currency !== "CNY") ||
          yuanToCents(result.total_amount) !== row.amountCents ||
          typeof result.trade_no !== "string" ||
          !/^\d{10,64}$/.test(result.trade_no)
        )
          throw new Error("Mismatch");
      } catch {
        throw new ServiceUnavailableException(
          "沙箱查单的订单、商家或金额不匹配，本地状态保持不变",
        );
      }
      if (
        result.trade_status === "TRADE_SUCCESS" ||
        result.trade_status === "TRADE_FINISHED"
      )
        status = "succeeded";
      else if (result.trade_status === "TRADE_CLOSED") status = "closed";
      else if (result.trade_status !== "WAIT_BUYER_PAY")
        throw new ServiceUnavailableException(
          "未知沙箱交易状态，本地状态保持不变",
        );
    }
    if (
      missing &&
      !row.tradeNo &&
      queryClock.now > new Date(row.expiresAt.getTime() + 60000)
    )
      status = "closed";
    const updated = await this.applyResult(
      row,
      status,
      !missing ? (result.trade_no as string) : undefined,
      actor,
    );
    if (
      closeExpired &&
      !missing &&
      updated.status === "pending" &&
      queryClock.now >= row.expiresAt
    )
      return this.closePending(actor, row);
    return updated;
  }

  async close(
    actor: PublicUser,
    orderId: string,
    id: string,
  ): Promise<AlipaySandboxPaymentRecord> {
    // Read/verify first. Paid/closed replays do not send another close request.
    const current = await this.query(actor, orderId, id, false);
    if (current.status !== "pending") return current;
    const row = await this.db.alipaySandboxPayment.findUniqueOrThrow({
      where: { id },
    });
    if (!row.tradeNo)
      throw new ConflictException(
        "渠道尚无可关闭交易，原收银台链接仍可能有效；请在支付截止后查单核对，当前不能取消订单",
      );
    return this.closePending(actor, row);
  }

  private async closePending(
    actor: PublicUser,
    source: AlipaySandboxPayment,
  ): Promise<AlipaySandboxPaymentRecord> {
    const order = await this.own(actor, source.orderId);
    const current = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Ticket" WHERE "id"=${order.ticketId} FOR UPDATE`;
      const row = await tx.alipaySandboxPayment.findFirst({
        where: {
          id: source.id,
          actorId: actor.id,
          order: { ticket: { reporterId: actor.id } },
        },
        include: {
          order: { select: { status: true, totalCents: true, currency: true } },
        },
      });
      if (!row) throw new NotFoundException("沙箱支付单不存在或无权访问");
      if (row.status !== "pending") return row;
      if (
        row.order.status !== "awaiting_start" ||
        row.amountCents !== row.order.totalCents ||
        row.order.currency !== "CNY" ||
        row.appId !== source.appId ||
        row.sellerId !== source.sellerId
      )
        throw new ConflictException("订单或支付快照已变化，不能关闭支付");
      return row;
    });
    if (current.status !== "pending") return record(current);
    // Channel I/O stays outside the row lock. A timeout is NOT a local close result.
    try {
      const result = await this.gateway.close(source.id);
      if (
        (result.out_trade_no !== undefined &&
          result.out_trade_no !== source.id) ||
        (result.trade_no !== undefined &&
          current.tradeNo &&
          result.trade_no !== current.tradeNo)
      )
        throw new Error("Close response mismatch");
    } catch {
      // An uncertain close may have succeeded remotely. Query once; never retry this write automatically.
    }
    const verified = await this.query(actor, source.orderId, source.id, false);
    if (verified.status === "pending")
      throw new ConflictException(
        "渠道尚未确认关闭，当前不能取消订单；请刷新查单核对，不要重复付款",
      );
    return verified;
  }

  async notify(body: unknown): Promise<void> {
    let fields: Record<string, string>;
    try {
      fields = this.gateway.notification(body);
    } catch {
      throw new BadRequestException("沙箱通知验签未通过");
    }
    const config = getAlipaySandboxConfig();
    if (
      fields.app_id !== config.appId ||
      fields.seller_id !== config.sellerId ||
      (fields.auth_app_id !== undefined &&
        fields.auth_app_id !== config.appId) ||
      fields.notify_type !== "trade_status_sync" ||
      !fields.notify_id ||
      fields.notify_id.length > 128 ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        fields.out_trade_no ?? "",
      ) ||
      !/^\d{10,64}$/.test(fields.trade_no ?? "") ||
      (fields.trans_currency !== undefined && fields.trans_currency !== "CNY")
    )
      throw new BadRequestException("沙箱通知业务字段不匹配");
    const row = await this.db.alipaySandboxPayment.findUnique({
      where: { id: fields.out_trade_no },
    });
    if (!row) throw new BadRequestException("沙箱通知支付单不存在");
    try {
      if (
        row.appId !== fields.app_id ||
        row.sellerId !== fields.seller_id ||
        yuanToCents(fields.total_amount) !== row.amountCents
      )
        throw new Error("Mismatch");
    } catch {
      throw new BadRequestException("沙箱通知金额或商户不匹配");
    }
    let status: "pending" | "succeeded" | "closed";
    if (["TRADE_SUCCESS", "TRADE_FINISHED"].includes(fields.trade_status))
      status = "succeeded";
    else if (fields.trade_status === "TRADE_CLOSED") status = "closed";
    else if (fields.trade_status === "WAIT_BUYER_PAY") status = "pending";
    else throw new BadRequestException("未知沙箱通知状态");
    await this.applyResult(row, status, fields.trade_no);
  }

  /** Verified query and notification compete on the same lock and never downgrade success. */
  private async applyResult(
    source: AlipaySandboxPayment,
    status: "pending" | "succeeded" | "closed",
    tradeNo?: string,
    actor?: PublicUser,
  ): Promise<AlipaySandboxPaymentRecord> {
    const order = await this.db.serviceOrder.findUniqueOrThrow({
      where: { id: source.orderId },
      select: { ticketId: true },
    });
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Ticket" WHERE "id"=${order.ticketId} FOR UPDATE`;
      const current = await tx.alipaySandboxPayment.findFirst({
        where: {
          id: source.id,
          ...(actor
            ? { actorId: actor.id, order: { ticket: { reporterId: actor.id } } }
            : {}),
        },
        include: {
          order: { select: { totalCents: true, currency: true, status: true } },
        },
      });
      if (!current) throw new NotFoundException("沙箱支付单不存在或无权访问");
      if (
        current.appId !== source.appId ||
        current.sellerId !== source.sellerId ||
        current.amountCents !== source.amountCents ||
        current.amountCents !== current.order.totalCents ||
        current.order.currency !== "CNY" ||
        (tradeNo && current.tradeNo && tradeNo !== current.tradeNo)
      )
        throw new ConflictException("沙箱支付快照或交易号不匹配");
      // A refunded/cancelled service still preserves its original successful payment fact.
      if (current.status === "succeeded") return record(current);
      // Contradictory success after closure needs reconciliation, not a silent acknowledgement.
      if (
        status === "succeeded" &&
        (current.status === "closed" || current.order.status === "cancelled")
      )
        throw new ConflictException("沙箱终态冲突，请主动查单并核对记录");
      if (current.status !== "pending") return record(current);
      const [{ now }] = await tx.$queryRaw<
        { now: Date }[]
      >`SELECT clock_timestamp() AT TIME ZONE 'UTC' AS now`;
      return record(
        await tx.alipaySandboxPayment.update({
          where: { id: current.id },
          data: { status, checkedAt: now, ...(tradeNo ? { tradeNo } : {}) },
        }),
      );
    });
  }
}
