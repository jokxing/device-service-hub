import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { json } from "express";
import { AppModule } from "./app.module";
import { getConfig } from "./config/env.config";
import { responseHeaders } from "./common/middleware/response-headers.middleware";

async function bootstrap() {
  const config = getConfig();
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.setGlobalPrefix("api");
  app.use(json({ limit: "32kb" }));
  app.use(cookieParser());
  app.use(responseHeaders);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableShutdownHooks();
  await app.listen(config.port, "127.0.0.1");
}

bootstrap().catch(() => {
  console.error("API 启动失败，请检查数据库状态及本地环境配置。");
  process.exitCode = 1;
});
