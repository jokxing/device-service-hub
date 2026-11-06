import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  PublicUser,
  TicketPage,
  TicketRecord,
  ReporterTicketRecord,
} from "@device-service-hub/contracts";
import { Prisma } from "../../generated/prisma/client";
import { DatabaseService } from "../../database/database.service";
import type { CreateTicketDto } from "./dto/create-ticket.dto";
import type { TicketsQueryDto } from "./dto/tickets-query.dto";
import { TICKET_PUBLIC_SELECT, REPORTER_TICKET_SELECT } from "./tickets.select";
import {
  ticketPayloadHash,
  toTicketRecord,
  toReporterTicketRecord,
} from "./utils/ticket-payload";

@Injectable()
export class TicketsService {
  constructor(private readonly database: DatabaseService) {}

  private requireReporter(actor: PublicUser): void {
    if (actor.role !== "reporter")
      throw new ForbiddenException("当前角色不能通过报修用户入口操作工单");
  }

  private async replay(
    reporterId: string,
    input: CreateTicketDto,
    hash: string,
  ): Promise<TicketRecord | null> {
    const existing = await this.database.ticket.findUnique({
      where: {
        reporterId_requestId: { reporterId, requestId: input.requestId },
      },
      select: { ...TICKET_PUBLIC_SELECT, requestHash: true },
    });
    if (!existing) return null;
    if (existing.requestHash !== hash)
      throw new ConflictException("提交编号已用于不同内容，请重新发起报修");
    const { requestHash: _hash, ...row } = existing;
    return toTicketRecord(row);
  }

  async create(
    actor: PublicUser,
    input: CreateTicketDto,
  ): Promise<{ ticket: TicketRecord; created: boolean }> {
    this.requireReporter(actor);
    const hash = ticketPayloadHash(input);
    const replay = await this.replay(actor.id, input, hash);
    if (replay) return { ticket: replay, created: false };
    try {
      const row = await this.database.$transaction(async (transaction) => {
        const device = await transaction.device.findFirst({
          where: { id: input.deviceId, access: { some: { userId: actor.id } } },
          select: { id: true, enabled: true },
        });
        if (!device) throw new NotFoundException("设备不存在或无权访问");
        if (!device.enabled)
          throw new ConflictException("设备已停用，不能新增报修");
        return transaction.ticket.create({
          data: {
            reporterId: actor.id,
            deviceId: device.id,
            title: input.title,
            description: input.description,
            priority: input.priority,
            requestId: input.requestId,
            requestHash: hash,
          },
          select: TICKET_PUBLIC_SELECT,
        });
      });
      return { ticket: toTicketRecord(row), created: true };
    } catch (error) {
      // Concurrent submissions race at the database unique constraint, not a UI flag.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const winner = await this.replay(actor.id, input, hash);
        if (winner) return { ticket: winner, created: false };
      }
      throw error;
    }
  }

  async mine(actor: PublicUser, query: TicketsQueryDto): Promise<TicketPage> {
    this.requireReporter(actor);
    const where = { reporterId: actor.id };
    const [rows, total] = await this.database.$transaction(
      [
        this.database.ticket.findMany({
          where,
          select: TICKET_PUBLIC_SELECT,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        this.database.ticket.count({ where }),
      ],
      { isolationLevel: "RepeatableRead" },
    );
    return {
      items: rows.map(toTicketRecord),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async detail(actor: PublicUser, id: string): Promise<ReporterTicketRecord> {
    this.requireReporter(actor);
    const row = await this.database.ticket.findFirst({
      where: { id, reporterId: actor.id },
      select: REPORTER_TICKET_SELECT,
    });
    if (!row) throw new NotFoundException("报修记录不存在或无权访问");
    return toReporterTicketRecord(row);
  }
}
