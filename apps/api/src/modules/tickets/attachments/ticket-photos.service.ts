import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import type { PublicUser, TicketPhoto } from "@device-service-hub/contracts";
import { DatabaseService } from "../../../database/database.service";
import { PhotoStore } from "./photo-store.service";
import { PHOTO_LIMITS, PHOTO_PUBLIC_SELECT } from "./photo.constants";
import { Prisma } from "../../../generated/prisma/client";

@Injectable()
export class TicketPhotosService {
  constructor(
    private readonly database: DatabaseService,
    private readonly store: PhotoStore,
  ) {}
  private async authorize(actor: PublicUser, ticketId: string) {
    const scope =
      actor.role === "admin"
        ? {}
        : actor.role === "reporter"
          ? { reporterId: actor.id }
          : { assigneeId: actor.id };
    const ticket = await this.database.ticket.findFirst({
      where: { id: ticketId, ...scope },
      select: { id: true, status: true },
    });
    if (!ticket) throw new NotFoundException("工单不存在或无权访问");
    return ticket;
  }
  async list(actor: PublicUser, ticketId: string): Promise<TicketPhoto[]> {
    await this.authorize(actor, ticketId);
    return (
      await this.database.ticketPhoto.findMany({
        where: { ticketId },
        select: PHOTO_PUBLIC_SELECT,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      })
    ).map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
  }
  async content(
    actor: PublicUser,
    ticketId: string,
    id: string,
  ): Promise<Buffer> {
    await this.authorize(actor, ticketId);
    const photo = await this.database.ticketPhoto.findFirst({
      where: { id, ticketId },
      select: { storageKey: true },
    });
    if (!photo) throw new NotFoundException("图片不存在或无权访问");
    return this.store.read(photo.storageKey);
  }
  async upload(
    actor: PublicUser,
    ticketId: string,
    id: string,
    file: Express.Multer.File | undefined,
  ): Promise<TicketPhoto> {
    if (actor.role !== "reporter")
      throw new ForbiddenException("仅报修人可以补充现场照片");
    await this.authorize(actor, ticketId);
    const image = await this.store.normalize(file);
    const inputHash = createHash("sha256").update(file!.buffer).digest("hex");
    const storageKey = randomUUID() + ".webp";
    await this.store.write(storageKey, image.data);
    let retained = false;
    try {
      const result = await this.database.$transaction(async (tx) => {
        // Serialize photo count with assignment/status changes on this ticket row.
        await tx.$queryRaw`SELECT "id" FROM "Ticket" WHERE "id"=${ticketId} FOR UPDATE`;
        const ticket = await tx.ticket.findFirst({
          where: { id: ticketId, reporterId: actor.id },
          select: { status: true },
        });
        if (!ticket) throw new NotFoundException("工单不存在或无权访问");
        const existing = await tx.ticketPhoto.findUnique({ where: { id } });
        if (existing) {
          if (
            existing.ticketId !== ticketId ||
            existing.uploaderId !== actor.id ||
            existing.inputHash !== inputHash
          )
            throw new ConflictException("图片提交编号已用于不同内容");
          return { photo: existing, created: false };
        }
        if (ticket.status !== "pending")
          throw new ConflictException("工单已分派或结束，不能再追加照片");
        if (
          (await tx.ticketPhoto.count({ where: { ticketId } })) >=
          PHOTO_LIMITS.count
        )
          throw new ConflictException("每单最多上传 3 张照片");
        const photo = await tx.ticketPhoto.create({
          data: {
            id,
            ticketId,
            uploaderId: actor.id,
            inputHash,
            storageKey,
            width: image.width,
            height: image.height,
            bytes: image.bytes,
          },
          select: PHOTO_PUBLIC_SELECT,
        });
        return { photo, created: true };
      });
      retained = result.created;
      const { photo } = result;
      return {
        id: photo.id,
        width: photo.width,
        height: photo.height,
        bytes: photo.bytes,
        createdAt: photo.createdAt.toISOString(),
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new ConflictException("图片提交编号已用于其他内容");
      throw error;
    } finally {
      if (!retained) await this.store.remove(storageKey);
    }
  }
}
