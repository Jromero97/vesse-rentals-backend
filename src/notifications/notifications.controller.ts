import { Body, Controller, Post } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('send')
  send(@Body() body: { token: string; title: string; body: string }) {
    console.log('Sending notification with body:', body);
    return this.notificationsService.send(body.token, body.title, body.body);
  }
}
