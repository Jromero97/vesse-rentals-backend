import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-08-27.basil',
    });
  }

  async createConnectedAccount(email: string) {
    return await this.stripe.accounts.create({
      type: 'express',
      country: 'US',
      email,
    });
  }

  async createOnboardingLink(accountId: string) {
    return await this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.FRONTEND_URL}/reauth`,
      return_url: `${process.env.FRONTEND_URL}/home/tab1`,
      type: 'account_onboarding',
    });
  }

  async deleteConnectedAccount(ownerStripeAccountId: string) {
    return await this.stripe.accounts.del(ownerStripeAccountId);
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
    ownerStripeAccountId: string,
  ) {
    return await this.stripe.paymentIntents.create({
      amount,
      currency,
      payment_method_types: ['card'],
      capture_method: 'manual',
      application_fee_amount: Math.floor(amount * 0.1),
      transfer_data: {
        destination: ownerStripeAccountId,
      },
    });
  }

  constructEventFromPayload(signature: string, payload: Buffer) {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  }

  async createAccountLink(accountId: string) {
    // const account = await this.stripe.accounts.retrieve(accountId);

    // console.log(account);
    const accountLink = await this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.FRONTEND_URL}/reauth`,
      return_url: `${process.env.FRONTEND_URL}/home/tab3`,
      type: 'account_onboarding',
    });

    return { url: accountLink.url };
  }

  async getBalance(accountId: string) {
    return await this.stripe.balance.retrieve({ stripeAccount: accountId });
  }

  async createCustomer(email: string, name?: string) {
    return await this.stripe.customers.create({ email, name });
  }

  async attachPaymentMethod(customerId: string, paymentMethodId: string) {
    await this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
    return await this.stripe.paymentMethods.retrieve(paymentMethodId);
  }

  async detachPaymentMethod(paymentMethodId: string) {
    return await this.stripe.paymentMethods.detach(paymentMethodId);
  }

  async listPaymentMethods(customerId: string) {
    return await this.stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
  }

  async setDefaultPaymentMethod(customerId: string, paymentMethodId: string) {
    return await this.stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
  }
}
