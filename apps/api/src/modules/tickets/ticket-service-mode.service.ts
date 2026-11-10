import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  AdminTicketRecord,
  PublicUser,
} from "@device-service-hub/contracts";
import { canRequireQuote } from "@device-service-hub/contracts/quote-rules";
import { DatabaseService } from "../../database/database.service";
import { Prisma } from "../../generated/prisma/client";
import type { RequireQuoteDto } from "./dto/require-quote.dto";
import { ADMIN_TICKET_SELECT } from "./tickets.select";
import { toAdminTicketRecord } from "./utils/ticket-payload";

@Injectable()
export class TicketServiceModeService {
  constructor(private readonly database: DatabaseService) {}

  private async replay(
    actor: PublicUser,
    id: string,
    input: RequireQuoteDto,
  ): Promise<AdminTicketRecord | null> {
    const previous = await this.database.ticketServiceModeChange.findUnique({
      where: {
        actorId_requestId: { actorId: actor.id, requestId: input.requestId },
      },
    });
    if (!previous) return null;
    if (
      previous.ticketId !== id ||
      previous.expectedVersion !== input.expectedVersion ||
      previous.reason !== input.reason
    )
      throw new ConflictException(
        "提交编号已用于不同服务方式调整，请刷新后核对",
      );
    const row = await this.database.ticket.findUnique({
      where: { id },
      select: ADMIN_TICKET_SELECT,
    });
    if (!row) throw new NotFoundException("工单不存在");
    return toAdminTicketRecord(row);
  }

  async requireQuote(
    actor: PublicUser,
    id: string,
    input: RequireQuoteDto,
  ): Promise<AdminTicketRecord> {
    if (actor.role !== "admin")
      throw new ForbiddenException("仅管理员可以调整服务方式");
    const previous = await this.replay(actor, id, input);
    if (previous) return previous;
    try {
      const row = await this.database.$transaction(async (tx) => {
        // Same ticket serialization boundary as acceptance, result and quote commands.
        await tx.$queryRaw`SELECT "id" FROM "Ticket" WHERE "id" = ${id} FOR UPDATE`;
        const ticket = await tx.ticket.findUnique({
          where: { id },
          select: {
            ...ADMIN_TICKET_SELECT,
            quotes: { select: { id: true }, take: 1 },
            order: { select: { id: true } },
          },
        });
        if (!ticket) throw new NotFoundException("工单不存在");
        if (
          ticket.version !== input.expectedVersion ||
          !canRequireQuote(ticket) ||
          ticket.quotes.length ||
          ticket.order ||
          ticket.serviceModeChange
        )
          throw new ConflictException(
            "工单已变化或已有报价、订单或处理结果，不能改为需报价，请刷新后核对",
          );
        const updated = await tx.ticket.updateMany({
          where: {
            id,
            version: input.expectedVersion,
            serviceMode: "direct",
            status: { in: ["assigned", "processing"] },
            result: null,
            confirmation: null,
            order: null,
            quotes: { none: {} },
          },
          data: { serviceMode: "quoted", version: { increment: 1 } },
        });
        if (updated.count !== 1)
          throw new ConflictException("工单已变化，请刷新后核对");
        await tx.ticketServiceModeChange.create({
          data: {
            ticketId: id,
            actorId: actor.id,
            requestId: input.requestId,
            expectedVersion: input.expectedVersion,
            reason: input.reason,
          },
        });
        return tx.ticket.findUniqueOrThrow({
          where: { id },
          select: ADMIN_TICKET_SELECT,
        });
      });
      return toAdminTicketRecord(row);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        (error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002")
      ) {
        const winner = await this.replay(actor, id, input);
        if (winner) return winner;
        if (!(error instanceof ConflictException))
          throw new ConflictException("工单已变化，请刷新后核对");
      }
      throw error;
    }
  }
}
