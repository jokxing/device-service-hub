import { ConflictException, Injectable } from "@nestjs/common";
import type {
  PublicUser,
  ReporterTicketRecord,
} from "@device-service-hub/contracts";
import { DatabaseService } from "../../database/database.service";
import { Prisma } from "../../generated/prisma/client";
import { TicketsService } from "./tickets.service";
import type { ConfirmTicketDto } from "./dto/confirm-ticket.dto";
import { REPORTER_TICKET_SELECT } from "./tickets.select";
import { toReporterTicketRecord } from "./utils/ticket-payload";
import { OrderFulfillmentService } from "../orders/order-fulfillment.service";

@Injectable()
export class TicketConfirmationsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly tickets: TicketsService,
    private readonly fulfillment: OrderFulfillmentService,
  ) {}

  private async replay(
    actor: PublicUser,
    id: string,
    input: ConfirmTicketDto,
  ): Promise<ReporterTicketRecord | null> {
    const previous = await this.database.ticketConfirmation.findUnique({
      where: {
        actorId_requestId: { actorId: actor.id, requestId: input.requestId },
      },
      select: { ticketId: true, expectedVersion: true },
    });
    if (!previous) return null;
    if (
      previous.ticketId !== id ||
      previous.expectedVersion !== input.expectedVersion
    )
      throw new ConflictException(
        "提交编号已用于不同确认，请刷新报修记录后重试",
      );
    return this.tickets.detail(actor, id);
  }

  async confirm(
    actor: PublicUser,
    id: string,
    input: ConfirmTicketDto,
  ): Promise<ReporterTicketRecord> {
    // Reporter role and current ownership are checked before reading any replay record.
    const current = await this.tickets.detail(actor, id);
    const previous = await this.replay(actor, id, input);
    if (previous) return previous;
    if (
      current.status !== "confirming" ||
      current.version !== input.expectedVersion ||
      !current.result ||
      current.confirmation
    )
      throw new ConflictException("工单已变化或不满足确认条件，请刷新后查看");
    try {
      const row = await this.database.$transaction(async (tx) => {
        const updated = await tx.ticket.updateMany({
          where: {
            id,
            reporterId: actor.id,
            status: "confirming",
            serviceMode: current.serviceMode,
            version: input.expectedVersion,
            result: { isNot: null },
            confirmation: { is: null },
          },
          data: { status: "completed", version: { increment: 1 } },
        });
        if (updated.count !== 1)
          throw new ConflictException(
            "工单已变化或不满足确认条件，请刷新后查看",
          );
        if (current.serviceMode === "quoted") {
          await this.fulfillment.confirmCompletion(tx, id);
        }
        await tx.ticketConfirmation.create({
          data: {
            ticketId: id,
            actorId: actor.id,
            requestId: input.requestId,
            expectedVersion: input.expectedVersion,
          },
        });
        return tx.ticket.findUniqueOrThrow({
          where: { id },
          select: REPORTER_TICKET_SELECT,
        });
      });
      return toReporterTicketRecord(row);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        (error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002")
      ) {
        const winner = await this.replay(actor, id, input);
        if (winner) return winner;
        if (!(error instanceof ConflictException))
          throw new ConflictException(
            "工单已变化或不满足确认条件，请刷新后查看",
          );
      }
      throw error;
    }
  }
}
