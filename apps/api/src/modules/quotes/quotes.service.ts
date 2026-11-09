import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import type { PublicUser, QuoteRecord } from "@device-service-hub/contracts";
import { calculateQuote } from "@device-service-hub/contracts/quote-rules";
import { DatabaseService } from "../../database/database.service";
import { Prisma } from "../../generated/prisma/client";
import type { SubmitQuoteDto } from "./dto/submit-quote.dto";
import { QUOTE_SELECT } from "./quotes.select";

@Injectable()
export class QuotesService {
  constructor(private readonly database: DatabaseService) {}

  private async accessibleTicket(actor: PublicUser, ticketId: string) {
    if (actor.role !== "admin" && actor.role !== "technician")
      throw new ForbiddenException("仅管理员或当前维修人员可以查看报价");
    const ticket = await this.database.ticket.findFirst({
      where: {
        id: ticketId,
        ...(actor.role === "technician" ? { assigneeId: actor.id } : {}),
      },
      select: { id: true },
    });
    if (!ticket) throw new NotFoundException("工单不存在或无权访问");
  }

  async detail(
    actor: PublicUser,
    ticketId: string,
  ): Promise<QuoteRecord | null> {
    await this.accessibleTicket(actor, ticketId);
    // Keep ownership in the quote query as well, including when replaying an old command.
    const quote = await this.database.ticketQuote.findFirst({
      where: {
        ticketId,
        ...(actor.role === "technician"
          ? { ticket: { assigneeId: actor.id } }
          : {}),
      },
      orderBy: { revision: "desc" },
      select: QUOTE_SELECT,
    });
    return quote
      ? { ...quote, currency: "CNY", createdAt: quote.createdAt.toISOString() }
      : null;
  }

  private async replay(
    actor: PublicUser,
    ticketId: string,
    input: SubmitQuoteDto,
    hash: string,
  ) {
    const previous = await this.database.ticketQuote.findUnique({
      where: {
        actorId_requestId: { actorId: actor.id, requestId: input.requestId },
      },
      select: { ticketId: true, expectedVersion: true, requestHash: true },
    });
    if (!previous) return null;
    if (
      previous.ticketId !== ticketId ||
      previous.expectedVersion !== input.expectedVersion ||
      previous.requestHash !== hash
    )
      throw new ConflictException("提交编号已用于不同报价，请刷新后核对");
    return this.detail(actor, ticketId);
  }

  async submit(
    actor: PublicUser,
    ticketId: string,
    input: SubmitQuoteDto,
  ): Promise<QuoteRecord> {
    if (actor.role !== "technician")
      throw new ForbiddenException("仅当前维修人员可以提交报价");
    await this.accessibleTicket(actor, ticketId);
    const hash = createHash("sha256")
      .update(
        JSON.stringify(
          input.items.map((item) => [
            item.name,
            item.quantity,
            item.unitPriceCents,
            item.note,
          ]),
        ),
      )
      .digest("hex");
    const previous = await this.replay(actor, ticketId, input, hash);
    if (previous) return previous;
    let amount: ReturnType<typeof calculateQuote>;
    try {
      amount = calculateQuote(input.items);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : "报价金额无效",
      );
    }
    try {
      const quote = await this.database.$transaction(async (tx) => {
        // The conditional update locks the ticket row and serializes quote/result commands.
        const changed = await tx.ticket.updateMany({
          where: {
            id: ticketId,
            assigneeId: actor.id,
            status: "processing",
            serviceMode: "quoted",
            version: input.expectedVersion,
            result: { is: null },
            quotes: { none: {} },
          },
          data: { version: { increment: 1 } },
        });
        if (changed.count !== 1)
          throw new ConflictException(
            "任务已变化、无需报价或已有报价，请刷新后核对",
          );
        return tx.ticketQuote.create({
          data: {
            ticketId,
            actorId: actor.id,
            revision: 1,
            totalCents: amount.totalCents,
            requestId: input.requestId,
            expectedVersion: input.expectedVersion,
            requestHash: hash,
            items: {
              create: input.items.map((item, position) => ({
                ...item,
                position,
                amountCents: amount.amounts[position],
              })),
            },
          },
          select: QUOTE_SELECT,
        });
      });
      return {
        ...quote,
        currency: "CNY",
        createdAt: quote.createdAt.toISOString(),
      };
    } catch (error) {
      if (
        error instanceof ConflictException ||
        (error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002")
      ) {
        const winner = await this.replay(actor, ticketId, input, hash);
        if (winner) return winner;
        throw new ConflictException("报价已提交或任务已变化，请刷新后核对");
      }
      throw error;
    }
  }
}
