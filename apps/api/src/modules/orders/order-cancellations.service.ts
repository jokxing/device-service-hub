import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  PublicUser,
  ServiceOrderRecord,
} from "@device-service-hub/contracts";
import { DatabaseService } from "../../database/database.service";
import { Prisma } from "../../generated/prisma/client";
import type { CancelOrderDto } from "./dto/cancel-order.dto";
import { ORDER_SELECT } from "./orders.select";
import { toOrderRecord } from "./utils/order-payload";

@Injectable()
export class OrderCancellationsService {
  constructor(private readonly database: DatabaseService) {}

  private async replay(
    actor: PublicUser,
    orderId: string,
    input: CancelOrderDto,
  ) {
    const previous = await this.database.serviceOrderCancellation.findUnique({
      where: {
        actorId_requestId: { actorId: actor.id, requestId: input.requestId },
      },
      select: { orderId: true, reason: true, expectedVersion: true },
    });
    if (!previous) return null;
    if (
      previous.orderId !== orderId ||
      previous.reason !== input.reason ||
      previous.expectedVersion !== input.expectedVersion
    )
      throw new ConflictException("提交编号已用于不同取消操作，请刷新后核对");
    const order = await this.database.serviceOrder.findFirst({
      where: { id: orderId, ticket: { reporterId: actor.id } },
      select: ORDER_SELECT,
    });
    if (!order) throw new NotFoundException("订单不存在或无权访问");
    return toOrderRecord(order);
  }

  async cancel(
    actor: PublicUser,
    orderId: string,
    input: CancelOrderDto,
  ): Promise<ServiceOrderRecord> {
    if (actor.role !== "reporter")
      throw new ForbiddenException("仅工单报修人可以取消服务订单");
    const source = await this.database.serviceOrder.findFirst({
      where: { id: orderId, ticket: { reporterId: actor.id } },
      select: { ticketId: true },
    });
    if (!source) throw new NotFoundException("订单不存在或无权访问");
    const previous = await this.replay(actor, orderId, input);
    if (previous) return previous;
    try {
      return await this.database.$transaction(async (tx) => {
        // All current order commands serialize on the associated ticket row.
        const changed = await tx.ticket.updateMany({
          where: {
            id: source.ticketId,
            reporterId: actor.id,
            version: input.expectedVersion,
            serviceMode: "quoted",
            status: "processing",
            result: { is: null },
            confirmation: { is: null },
            order: {
              is: {
                id: orderId,
                status: "awaiting_start",
                cancellation: { is: null },
                quote: { status: "accepted" },
              },
            },
          },
          data: { status: "cancelled", version: { increment: 1 } },
        });
        if (changed.count !== 1)
          throw new ConflictException(
            "订单或工单已变化，当前不能取消，请刷新后核对",
          );
        const updated = await tx.serviceOrder.updateMany({
          where: {
            id: orderId,
            ticketId: source.ticketId,
            status: "awaiting_start",
            cancellation: { is: null },
          },
          data: { status: "cancelled" },
        });
        if (updated.count !== 1)
          throw new ConflictException("订单已变化，请刷新后核对");
        await tx.serviceOrderCancellation.create({
          data: {
            orderId,
            actorId: actor.id,
            reason: input.reason,
            requestId: input.requestId,
            expectedVersion: input.expectedVersion,
          },
        });
        return toOrderRecord(
          await tx.serviceOrder.findUniqueOrThrow({
            where: { id: orderId },
            select: ORDER_SELECT,
          }),
        );
      });
    } catch (error) {
      if (
        error instanceof ConflictException ||
        (error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002")
      ) {
        const winner = await this.replay(actor, orderId, input);
        if (winner) return winner;
        throw new ConflictException(
          "订单或工单已变化，当前不能取消，请刷新后核对",
        );
      }
      throw error;
    }
  }
}
