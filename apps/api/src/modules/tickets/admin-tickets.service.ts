import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  AdminTicketPage,
  AdminTicketRecord,
  PublicUser,
  TicketPerson,
  TicketPhoto,
} from "@device-service-hub/contracts";
import { DatabaseService } from "../../database/database.service";
import { Prisma } from "../../generated/prisma/client";
import type { StatusTicketsQueryDto } from "./dto/status-tickets-query.dto";
import type { AssignTicketDto } from "./dto/assign-ticket.dto";
import { ADMIN_TICKET_SELECT } from "./tickets.select";
import { toAdminTicketRecord } from "./utils/ticket-payload";
import { TicketPhotosService } from "./attachments/ticket-photos.service";

@Injectable()
export class AdminTicketsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly photos: TicketPhotosService,
  ) {}

  listPhotos(actor: PublicUser, id: string): Promise<TicketPhoto[]> {
    this.requireAdmin(actor);
    return this.photos.list(actor, id);
  }

  photoContent(
    actor: PublicUser,
    id: string,
    photoId: string,
  ): Promise<Buffer> {
    this.requireAdmin(actor);
    return this.photos.content(actor, id, photoId);
  }

  private requireAdmin(actor: PublicUser): void {
    if (actor.role !== "admin")
      throw new ForbiddenException("仅管理员可以查看和分派工单");
  }

  async list(
    actor: PublicUser,
    query: StatusTicketsQueryDto,
  ): Promise<AdminTicketPage> {
    this.requireAdmin(actor);
    const where: Prisma.TicketWhereInput = query.status
      ? { status: query.status }
      : {};
    const [rows, total] = await this.database.$transaction(
      [
        this.database.ticket.findMany({
          where,
          select: ADMIN_TICKET_SELECT,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        this.database.ticket.count({ where }),
      ],
      { isolationLevel: "RepeatableRead" },
    );
    return {
      items: rows.map(toAdminTicketRecord),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  technicians(actor: PublicUser): Promise<TicketPerson[]> {
    this.requireAdmin(actor);
    return this.database.user.findMany({
      where: { role: "technician", active: true },
      select: { id: true, name: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
  }

  async detail(actor: PublicUser, id: string): Promise<AdminTicketRecord> {
    this.requireAdmin(actor);
    const row = await this.database.ticket.findUnique({
      where: { id },
      select: ADMIN_TICKET_SELECT,
    });
    if (!row) throw new NotFoundException("工单不存在");
    return toAdminTicketRecord(row);
  }

  private async replay(
    actor: PublicUser,
    id: string,
    input: AssignTicketDto,
  ): Promise<AdminTicketRecord | null> {
    const previous = await this.database.ticketAssignment.findUnique({
      where: {
        actorId_requestId: { actorId: actor.id, requestId: input.requestId },
      },
      select: { ticketId: true, assigneeId: true, expectedVersion: true },
    });
    if (!previous) return null;
    if (
      previous.ticketId !== id ||
      previous.assigneeId !== input.assigneeId ||
      previous.expectedVersion !== input.expectedVersion
    )
      throw new ConflictException("提交编号已用于不同分派，请刷新工单后重试");
    return this.detail(actor, id);
  }

  async assign(
    actor: PublicUser,
    id: string,
    input: AssignTicketDto,
  ): Promise<AdminTicketRecord> {
    this.requireAdmin(actor);
    const previous = await this.replay(actor, id, input);
    if (previous) return previous;
    try {
      const row = await this.database.$transaction(async (tx) => {
        const ticket = await tx.ticket.findUnique({
          where: { id },
          select: { status: true, version: true },
        });
        if (!ticket) throw new NotFoundException("工单不存在");
        if (
          ticket.status !== "pending" ||
          ticket.version !== input.expectedVersion
        )
          throw new ConflictException("工单已变化或已分派，请刷新后查看");
        // Hold the target row until commit so deactivation cannot race the assignment.
        const targets = await tx.$queryRaw<{ id: string }[]>`
          SELECT "id" FROM "User" WHERE "id" = ${input.assigneeId}
          AND "role" = 'technician' AND "active" = true FOR SHARE`;
        if (!targets.length)
          throw new ConflictException("维修人员不存在或已停用，请重新选择");
        const now = new Date();
        const updated = await tx.ticket.updateMany({
          where: {
            id,
            status: "pending",
            version: input.expectedVersion,
            assigneeId: null,
          },
          data: {
            status: "assigned",
            assigneeId: input.assigneeId,
            assignedAt: now,
            version: { increment: 1 },
          },
        });
        if (updated.count !== 1)
          throw new ConflictException("工单已变化或已分派，请刷新后查看");
        await tx.ticketAssignment.create({
          data: {
            ticketId: id,
            actorId: actor.id,
            assigneeId: input.assigneeId,
            requestId: input.requestId,
            expectedVersion: input.expectedVersion,
            createdAt: now,
          },
        });
        return tx.ticket.findUniqueOrThrow({
          where: { id },
          select: ADMIN_TICKET_SELECT,
        });
      });
      return toAdminTicketRecord(row);
    } catch (error) {
      // Same-intent races may lose at the conditional update or the unique audit key.
      if (
        error instanceof ConflictException ||
        (error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002")
      ) {
        const winner = await this.replay(actor, id, input);
        if (winner) return winner;
        if (!(error instanceof ConflictException))
          throw new ConflictException("工单已变化或已分派，请刷新后查看");
      }
      throw error;
    }
  }
}
