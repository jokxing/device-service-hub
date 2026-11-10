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
import type { StartOrderDto } from "./dto/start-order.dto";
import { ORDER_SELECT } from "./orders.select";
import { toOrderRecord } from "./utils/order-payload";

@Injectable()
export class OrderStartsService {
  constructor(private readonly database: DatabaseService) {}

  private async replay(
    actor: PublicUser,
    orderId: string,
    input: StartOrderDto,
  ) {
    const previous = await this.database.serviceOrderStart.findUnique({
      where: {
        actorId_requestId: { actorId: actor.id, requestId: input.requestId },
      },
      select: { orderId: true, expectedVersion: true },
    });
    if (!previous) return null;
    if (
      previous.orderId !== orderId ||
      previous.expectedVersion !== input.expectedVersion
    )
      throw new ConflictException("提交编号已用于不同开工操作，请刷新后核对");
    const order = await this.database.serviceOrder.findFirst({
      where: { id: orderId, ticket: { assigneeId: actor.id } },
      select: ORDER_SELECT,
    });
    if (!order) throw new NotFoundException("订单不存在或无权访问");
    return toOrderRecord(order);
  }

  async start(
    actor: PublicUser,
    orderId: string,
    input: StartOrderDto,
  ): Promise<ServiceOrderRecord> {
    if (actor.role !== "technician")
      throw new ForbiddenException("仅当前维修人员可以开工");
    const source = await this.database.serviceOrder.findFirst({
      where: { id: orderId, ticket: { assigneeId: actor.id } },
      select: { ticketId: true },
    });
    if (!source) throw new NotFoundException("订单不存在或无权访问");
    const previous = await this.replay(actor, orderId, input);
    if (previous) return previous;
    try {
      return await this.database.$transaction(async (tx) => {
        // Cancellation and start compete on the same ticket version and row lock.
        const changed = await tx.ticket.updateMany({
          where: {
            id: source.ticketId,
            assigneeId: actor.id,
            version: input.expectedVersion,
            status: "processing",
            serviceMode: "quoted",
            result: { is: null },
            confirmation: { is: null },
            acceptance: { isNot: null },
            order: {
              is: {
                id: orderId,
                status: "awaiting_start",
                cancellation: { is: null },
                start: { is: null },
                quote: { status: "accepted" },
              },
            },
          },
          data: { version: { increment: 1 } },
        });
        if (changed.count !== 1)
          throw new ConflictException(
            "订单或工单已变化，当前不能开工，请刷新后核对",
          );
        const updated = await tx.serviceOrder.updateMany({
          where: {
            id: orderId,
            ticketId: source.ticketId,
            status: "awaiting_start",
            cancellation: { is: null },
            start: { is: null },
          },
          data: { status: "in_progress" },
        });
        if (updated.count !== 1)
          throw new ConflictException("订单已变化，请刷新后核对");
        await tx.serviceOrderStart.create({
          data: {
            orderId,
            actorId: actor.id,
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
          "订单或工单已变化，当前不能开工，请刷新后核对",
        );
      }
      throw error;
    }
  }
}
