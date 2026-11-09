import { ConflictException, Injectable } from "@nestjs/common";
import type {
  PublicUser,
  TaskTicketRecord,
} from "@device-service-hub/contracts";
import { DatabaseService } from "../../database/database.service";
import { Prisma } from "../../generated/prisma/client";
import { TaskTicketsService } from "./task-tickets.service";
import type { SubmitTicketResultDto } from "./dto/submit-ticket-result.dto";
import { TASK_TICKET_SELECT } from "./tickets.select";
import { toTaskTicketRecord } from "./utils/ticket-payload";

@Injectable()
export class TaskResultsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly tasks: TaskTicketsService,
  ) {}

  private async replay(
    actor: PublicUser,
    id: string,
    input: SubmitTicketResultDto,
  ): Promise<TaskTicketRecord | null> {
    const previous = await this.database.ticketResult.findUnique({
      where: {
        actorId_requestId: { actorId: actor.id, requestId: input.requestId },
      },
      select: { ticketId: true, expectedVersion: true, description: true },
    });
    if (!previous) return null;
    if (
      previous.ticketId !== id ||
      previous.expectedVersion !== input.expectedVersion ||
      previous.description !== input.description
    )
      throw new ConflictException(
        "提交编号已用于不同处理结果，请刷新任务后重试",
      );
    return this.tasks.detail(actor, id);
  }

  async submit(
    actor: PublicUser,
    id: string,
    input: SubmitTicketResultDto,
  ): Promise<TaskTicketRecord> {
    // This performs role and current-ownership checks before any idempotency lookup.
    const current = await this.tasks.detail(actor, id);
    const previous = await this.replay(actor, id, input);
    if (previous) return previous;
    if (current.serviceMode === "quoted")
      throw new ConflictException(
        "需报价任务须完成报价确认及订单开工，当前不能提交处理结果",
      );
    if (
      current.status !== "processing" ||
      current.version !== input.expectedVersion
    )
      throw new ConflictException("任务已变化或结果已提交，请刷新后查看");
    try {
      const row = await this.database.$transaction(async (tx) => {
        const updated = await tx.ticket.updateMany({
          where: {
            id,
            assigneeId: actor.id,
            status: "processing",
            serviceMode: "direct",
            version: input.expectedVersion,
          },
          data: { status: "confirming", version: { increment: 1 } },
        });
        if (updated.count !== 1)
          throw new ConflictException("任务已变化或结果已提交，请刷新后查看");
        await tx.ticketResult.create({
          data: {
            ticketId: id,
            actorId: actor.id,
            description: input.description,
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
          throw new ConflictException("任务已变化或结果已提交，请刷新后查看");
      }
      throw error;
    }
  }
}
