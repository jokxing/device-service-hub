import { NativeReporterQuotesController } from "./native-reporter-quotes.controller";
import { NativeTaskQuotesController } from "./native-task-quotes.controller";
import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { QuotesController } from "./quotes.controller";
import { QuotesService } from "./quotes.service";
import { QuoteRejectionsService } from "./quote-rejections.service";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [
    QuotesController,
    NativeTaskQuotesController,
    NativeReporterQuotesController,
  ],
  providers: [QuotesService, QuoteRejectionsService],
})
export class QuotesModule {}
