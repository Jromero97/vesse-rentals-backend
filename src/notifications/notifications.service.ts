import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class NotificationsService implements OnModuleInit {
  onModuleInit() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(
          process.env.FIREBASE_SERVICE_ACCOUNT_KEY!,
        ),
      });
    }
  }

  async send(token: string, title: string, body: string) {
    return await admin.messaging().send({
      token,
      notification: { title, body },
    });
  }
}
