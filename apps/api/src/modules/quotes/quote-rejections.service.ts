import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { PublicUser, QuoteRecord } from "@device-service-hub/contracts";
import { DatabaseService } from "../../database/database.service";
import { Prisma } from "../../generated/prisma/client";
import type { RejectQuoteDto } from "./dto/reject-quote.dto";
import { QUOTE_SELECT } from "./quotes.select";
import { toQuoteRecord } from "./utils/quote-payload";

@Injectable()
export class QuoteRejectionsService {
  constructor(private readonly database: DatabaseService) {}

  private async replay(
    actor: PublicUser,
    ticketId: string,
    input: RejectQuoteDto,
  ) {
    const previous = await this.database.quoteRejection.findUnique({
      where: {
        actorId_requestId: { actorId: actor.id, requestId: input.requestId },
      },
      select: {
        quoteId: true,
        expectedVersion: true,
        reason: true,
        quote: { select: { ticketId: true, revision: true } },
      },
    });
    if (!previous) return null;
    if (
      previous.quoteId !== input.quoteId ||
      previous.quote.ticketId !== ticketId ||
      previous.quote.revision !== input.quoteRevision ||
      previous.expectedVersion !== input.expectedVersion ||
      previous.reason !== input.reason
    ) {
      throw new ConflictException("提交编号已用于不同拒绝操作，请刷新后核对");
    }
    // Re-check current ownership when returning an earlier intent.
    const quote = await this.database.ticketQuote.findFirst({
      where: {
        id: previous.quoteId,
        ticketId,
        ticket: { reporterId: actor.id },
      },
      select: QUOTE_SELECT,
    });
    if (!quote) throw new NotFoundException("工单不存在或无权访问");
    return toQuoteRecord(quote);
  }

  async reject(
    actor: PublicUser,
    ticketId: string,
    input: RejectQuoteDto,
  ): Promise<QuoteRecord> {
    if (actor.role !== "reporter")
      throw new ForbiddenException("仅工单报修人可以拒绝报价");
    const ticket = await this.database.ticket.findFirst({
      where: { id: ticketId, reporterId: actor.id },
      select: { id: true },
    });
    if (!ticket) throw new NotFoundException("工单不存在或无权访问");
    const previous = await this.replay(actor, ticketId, input);
    if (previous) return previous;
    try {
      return await this.database.$transaction(async (tx) => {
        // Same ticket row and version as acceptance: only one decision can win.
        const changed = await tx.ticket.updateMany({
          where: {
            id: ticketId,
            reporterId: actor.id,
            version: input.expectedVersion,
            status: "processing",
            serviceMode: "quoted",
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
        if (changed.count !== 1)
          throw new ConflictException("工单或报价已变化，请刷新后核对");
        const rejected = await tx.ticketQuote.updateMany({
          where: {
            id: input.quoteId,
            ticketId,
            revision: input.quoteRevision,
            status: "pending",
          },
          data: { status: "rejected" },
        });
        if (rejected.count !== 1)
          throw new ConflictException("报价已变化，请刷新后核对");
        await tx.quoteRejection.create({
          data: {
            quoteId: input.quoteId,
            actorId: actor.id,
            reason: input.reason,
            requestId: input.requestId,
            expectedVersion: input.expectedVersion,
          },
        });
        const quote = await tx.ticketQuote.findUniqueOrThrow({
          where: { id: input.quoteId },
          select: QUOTE_SELECT,
        });
        return toQuoteRecord(quote);
      });
    } catch (error) {
      if (
        error instanceof ConflictException ||
        (error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002")
      ) {
        const winner = await this.replay(actor, ticketId, input);
        if (winner) return winner;
        throw new ConflictException("报价决定已变化，请刷新后核对");
      }
      throw error;
    }
  }
}
