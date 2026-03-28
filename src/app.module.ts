import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StripeModule } from './stripe/stripe.module';
import { NotificationsModule } from './notifications/notifications.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [StripeModule, NotificationsModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
