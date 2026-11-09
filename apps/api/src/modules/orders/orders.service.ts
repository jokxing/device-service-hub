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
import { calculateQuote } from "@device-service-hub/contracts/quote-rules";
import { DatabaseService } from "../../database/database.service";
import { Prisma } from "../../generated/prisma/client";
import { ticketReadScope } from "../tickets/utils/ticket-read-scope";
import { QUOTE_SELECT } from "../quotes/quotes.select";
import type { AcceptQuoteDto } from "./dto/accept-quote.dto";
import { ORDER_SELECT } from "./orders.select";
import { toOrderRecord } from "./utils/order-payload";

@Injectable()
export class OrdersService {
  constructor(private readonly database: DatabaseService) {}

  private async accessibleTicket(actor: PublicUser, ticketId: string) {
    const ticket = await this.database.ticket.findFirst({
      where: { id: ticketId, ...ticketReadScope(actor) },
      select: { id: true },
    });
    if (!ticket) throw new NotFoundException("工单不存在或无权访问");
  }

  async byTicket(
    actor: PublicUser,
    ticketId: string,
  ): Promise<ServiceOrderRecord | null> {
    await this.accessibleTicket(actor, ticketId);
    const row = await this.database.serviceOrder.findFirst({
      where: { ticketId, ticket: ticketReadScope(actor) },
      select: ORDER_SELECT,
    });
    return row ? toOrderRecord(row) : null;
  }

  private async replay(
    actor: PublicUser,
    ticketId: string,
    input: AcceptQuoteDto,
  ) {
    const previous = await this.database.serviceOrder.findUnique({
      where: {
        actorId_requestId: { actorId: actor.id, requestId: input.requestId },
      },
      select: {
        ticketId: true,
        quoteId: true,
        quoteRevision: true,
        expectedVersion: true,
      },
    });
    if (!previous) return null;
    if (
      previous.ticketId !== ticketId ||
      previous.quoteId !== input.quoteId ||
      previous.quoteRevision !== input.quoteRevision ||
      previous.expectedVersion !== input.expectedVersion
    )
      throw new ConflictException("提交编号已用于不同报价确认，请刷新后核对");
    return this.byTicket(actor, ticketId);
  }

  async acceptQuote(
    actor: PublicUser,
    ticketId: string,
    input: AcceptQuoteDto,
  ): Promise<ServiceOrderRecord> {
    if (actor.role !== "reporter")
      throw new ForbiddenException("仅工单报修人可以确认报价");
    await this.accessibleTicket(actor, ticketId);
    const previous = await this.replay(actor, ticketId, input);
    if (previous) return previous;
    try {
      const row = await this.database.$transaction(async (tx) => {
        // One ticket row serializes confirmation with quote/result changes.
        const updated = await tx.ticket.updateMany({
          where: {
            id: ticketId,
            reporterId: actor.id,
            serviceMode: "quoted",
            status: "processing",
            version: input.expectedVersion,
            order: { is: null },
            result: { is: null },
            quotes: {
              some: {
                id: input.quoteId,
                revision: input.quoteRevision,
                status: "pending",
              },
              none: { revision: { gt: input.quoteRevision } },
            },
          },
          data: { version: { increment: 1 } },
        });
        if (updated.count !== 1)
          throw new ConflictException(
            "工单或报价已变化，或订单已生成，请刷新后核对",
          );
        const quote = await tx.ticketQuote.findFirstOrThrow({
          where: {
            id: input.quoteId,
            ticketId,
            revision: input.quoteRevision,
            status: "pending",
          },
          select: QUOTE_SELECT,
        });
        const computed = calculateQuote(quote.items);
        if (
          computed.totalCents !== quote.totalCents ||
          quote.items.some(
            (item, index) => item.amountCents !== computed.amounts[index],
          )
        )
          throw new ConflictException("报价金额记录不一致，请联系管理员核对");
        const accepted = await tx.ticketQuote.updateMany({
          where: {
            id: quote.id,
            ticketId,
            revision: input.quoteRevision,
            status: "pending",
          },
          data: { status: "accepted" },
        });
        if (accepted.count !== 1)
          throw new ConflictException("报价已变化，请刷新后核对");
        return tx.serviceOrder.create({
          data: {
            ticketId,
            quoteId: quote.id,
            quoteRevision: quote.revision,
            totalCents: quote.totalCents,
            actorId: actor.id,
            requestId: input.requestId,
            expectedVersion: input.expectedVersion,
            items: {
              create: quote.items.map((item, position) => ({
                ...item,
                position,
              })),
            },
          },
          select: ORDER_SELECT,
        });
      });
      return toOrderRecord(row);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        (error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002")
      ) {
        const winner = await this.replay(actor, ticketId, input);
        if (winner) return winner;
        throw new ConflictException("报价确认已变化或订单已生成，请刷新后核对");
      }
      throw error;
    }
  }
}
