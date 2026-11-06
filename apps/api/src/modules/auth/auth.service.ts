import { Injectable, UnauthorizedException } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import type { PublicUser } from "@device-service-hub/contracts";
import { DatabaseService } from "../../database/database.service";
import { hashPassword, verifyPassword } from "./utils/password";
import { PUBLIC_USER_SELECT } from "./auth.select";
import { SESSION_DURATION_MS } from "./constants/session.constants";
import { hashSessionToken } from "./utils/session-token";
import type { CreatedSession } from "./types/auth-session.type";

@Injectable()
export class AuthService {
  private readonly dummyHash = hashPassword(randomBytes(32).toString("hex"));
  constructor(private readonly database: DatabaseService) {}

  async login(
    username: string,
    password: string,
    previousToken?: string,
  ): Promise<CreatedSession> {
    const user = await this.database.user.findUnique({
      where: { username },
      select: { ...PUBLIC_USER_SELECT, active: true, passwordHash: true },
    });
    const valid = await verifyPassword(
      password,
      user?.passwordHash ?? (await this.dummyHash),
    );
    if (!user?.active || !valid)
      throw new UnauthorizedException("账号或密码错误");
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    await this.database.$transaction(async (transaction) => {
      if (previousToken)
        await transaction.session.deleteMany({
          where: { tokenHash: hashSessionToken(previousToken) },
        });
      await transaction.session.create({
        data: {
          tokenHash: hashSessionToken(token),
          userId: user.id,
          expiresAt,
        },
      });
    });
    const { passwordHash: _passwordHash, active: _active, ...actor } = user;
    return { token, actor, expiresAt };
  }

  async authenticate(token?: string): Promise<PublicUser> {
    if (!token) throw new UnauthorizedException("请先登录");
    const session = await this.database.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      select: {
        expiresAt: true,
        user: { select: { ...PUBLIC_USER_SELECT, active: true } },
      },
    });
    if (
      !session ||
      session.expiresAt.getTime() <= Date.now() ||
      !session.user.active
    )
      throw new UnauthorizedException("登录已过期，请重新登录");
    const { active: _active, ...actor } = session.user;
    return actor;
  }

  async logout(token?: string): Promise<void> {
    if (token)
      await this.database.session.deleteMany({
        where: { tokenHash: hashSessionToken(token) },
      });
  }
}
