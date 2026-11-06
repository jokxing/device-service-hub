import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  PublicUser,
  TaskTicketPage,
  TaskTicketRecord,
} from "@device-service-hub/contracts";
import { DatabaseService } from "../../database/database.service";
import { Prisma } from "../../generated/prisma/client";
import type { AcceptTicketDto } from "./dto/accept-ticket.dto";
import type { StatusTicketsQueryDto } from "./dto/status-tickets-query.dto";
import { TASK_TICKET_SELECT } from "./tickets.select";
import { toTaskTicketRecord } from "./utils/ticket-payload";

@Injectable()
export class TaskTicketsService {
  constructor(private readonly database: DatabaseService) {}

  private requireTechnician(actor: PublicUser): void {
    if (actor.role !== "technician")
      throw new ForbiddenException("仅维修人员可以访问本人任务与接单");
  }

  async list(
    actor: PublicUser,
    query: StatusTicketsQueryDto,
  ): Promise<TaskTicketPage> {
    this.requireTechnician(actor);
    const where: Prisma.TicketWhereInput = {
      assigneeId: actor.id,
      ...(query.status ? { status: query.status } : {}),
    };
    const [rows, total] = await this.database.$transaction(
      [
        this.database.ticket.findMany({
          where,
          select: TASK_TICKET_SELECT,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        this.database.ticket.count({ where }),
      ],
      { isolationLevel: "RepeatableRead" },
    );
    return {
      items: rows.map(toTaskTicketRecord),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async detail(actor: PublicUser, id: string): Promise<TaskTicketRecord> {
    this.requireTechnician(actor);
    const row = await this.database.ticket.findFirst({
      where: { id, assigneeId: actor.id },
      select: TASK_TICKET_SELECT,
    });
    if (!row) throw new NotFoundException("任务不存在或无权访问");
    return toTaskTicketRecord(row);
  }

  private async replay(
    actor: PublicUser,
    id: string,
    input: AcceptTicketDto,
  ): Promise<TaskTicketRecord | null> {
    const previous = await this.database.ticketAcceptance.findUnique({
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
      throw new ConflictException("提交编号已用于不同接单，请刷新任务后重试");
    // Re-check current ownership even when the command was accepted previously.
    return this.detail(actor, id);
  }

  async accept(
    actor: PublicUser,
    id: string,
    input: AcceptTicketDto,
  ): Promise<TaskTicketRecord> {
    this.requireTechnician(actor);
    const current = await this.detail(actor, id);
    const previous = await this.replay(actor, id, input);
    if (previous) return previous;
    if (
      current.status !== "assigned" ||
      current.version !== input.expectedVersion
    )
      throw new ConflictException("任务已变化或已接单，请刷新后查看");
    try {
      const row = await this.database.$transaction(async (tx) => {
        const updated = await tx.ticket.updateMany({
          where: {
            id,
            assigneeId: actor.id,
            status: "assigned",
            version: input.expectedVersion,
          },
          data: { status: "processing", version: { increment: 1 } },
        });
        if (updated.count !== 1)
          throw new ConflictException("任务已变化或已接单，请刷新后查看");
        await tx.ticketAcceptance.create({
          data: {
            ticketId: id,
            actorId: actor.id,
            requestId: input.requestId,
            expectedVersion: input.expectedVersion,
          },
        });
        return tx.ticket.findUniqueOrThrow({
          where: { id },
          select: TASK_TICKET_SELECT,
        });
      });
      return toTaskTicketRecord(row);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        (error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002")
      ) {
        const winner = await this.replay(actor, id, input);
        if (winner) return winner;
        if (!(error instanceof ConflictException))
          throw new ConflictException("任务已变化或已接单，请刷新后查看");
      }
      throw error;
    }
  }
}
