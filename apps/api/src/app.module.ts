import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AuthModule } from "./modules/auth/auth.module";
import { OriginGuard } from "./modules/auth/guards/origin.guard";
import { DevicesModule } from "./modules/devices/devices.module";
import { TicketsModule } from "./modules/tickets/tickets.module";
import { QuotesModule } from "./modules/quotes/quotes.module";
import { OrdersModule } from "./modules/orders/orders.module";

@Module({
  imports: [
    AuthModule,
    DevicesModule,
    TicketsModule,
    QuotesModule,
    OrdersModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: OriginGuard }],
})
export class AppModule {}
