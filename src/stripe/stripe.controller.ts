import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  Headers,
  Delete,
  Param,
  Get,
} from '@nestjs/common';
import { StripeService } from './stripe.service';
import type { Request, Response } from 'express';

@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('create-account')
  async createAccount(@Body('email') email: string) {
    const account = await this.stripeService.createConnectedAccount(email);
    const link = await this.stripeService.createOnboardingLink(account.id);
    return { account, onboardingLink: link.url };
  }

  @Delete('delete-account/:id')
  async deleteAccount(@Param('id') id: string) {
    return await this.stripeService.deleteConnectedAccount(id);
  }

  @Post('create-payment-intent')
  async createPaymentIntent(
    @Body()
    body: {
      amount: number;
      currency: string;
      ownerStripeAccountId: string;
    },
  ) {
    const intent = await this.stripeService.createPaymentIntent(
      body.amount,
      body.currency,
      body.ownerStripeAccountId,
    );
    return { clientSecret: intent.client_secret };
  }

  @Post('account-link')
  async createAccountLink(@Body('accountId') accountId: string) {
    return await this.stripeService.createAccountLink(accountId);
  }

  @Get('balance/:accountId')
  async getBalance(@Param('accountId') accountId: string) {
    return await this.stripeService.getBalance(accountId);
  }

  @Post('webhook')
  handleWebhook(
    @Req() req: Request & { rawBody: Buffer },
    @Headers('stripe-signature') signature: string,
    @Res() res: Response,
  ) {
    try {
      const rawBody = req.rawBody;

      const event = this.stripeService.constructEventFromPayload(
        signature,
        rawBody,
      );

      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;

        return res
          .status(200)
          .send({ success: true, payment_intent_id: paymentIntent.id });
      }
    } catch (error: any) {
      console.error(error);

      return res.status(400).send(`Webhook Error: ${error}`);
    }
  }
}
