# Payment Methods Integration Guide

This guide covers how to integrate the customer payment method management endpoints into an Ionic app that already has a service connected to the Vesse Rentals API.

## Overview

The flow has three main parts:

1. **Create a Stripe customer** when a user registers or first accesses payments
2. **Add a payment method** using Stripe.js to tokenize card details, then attach via the API
3. **Manage payment methods** — list, set default, or remove

---

## Prerequisites

Install the Stripe.js SDK in your Ionic project:

```bash
npm install @stripe/stripe-js
```

Your backend base URL should already be configured in your API service. These examples assume it is available as `this.apiUrl`.

---

## Step 1 — Create a Stripe Customer

Call this once per user, typically on registration or first time they reach a payments screen. Store the returned `id` as the user's `stripeCustomerId` in your app (e.g., in your user profile or local storage).

```typescript
// In your existing API service

async createStripeCustomer(email: string, name?: string): Promise<{ id: string }> {
  return this.http
    .post<{ id: string }>(`${this.apiUrl}/stripe/customers`, { email, name })
    .toPromise();
}
```

---

## Step 2 — Add a Payment Method

Adding a card is a two-step process: tokenize on the client with Stripe.js, then attach via your backend.

### 2a — Load Stripe.js

```typescript
import { loadStripe, Stripe } from '@stripe/stripe-js';

// In your component or service
private stripe: Stripe | null = null;

async initStripe() {
  this.stripe = await loadStripe('your_stripe_publishable_key');
}
```

### 2b — Collect Card Details

Use Stripe Elements to securely collect card details. Add a container in your component template:

```html
<div id="card-element"></div>
<button (click)="addCard()">Add Card</button>
```

Mount the card element in your component:

```typescript
import { Component, OnInit } from '@angular/core';
import { loadStripe, Stripe, StripeCardElement } from '@stripe/stripe-js';

export class AddCardPage implements OnInit {
  private stripe: Stripe | null = null;
  private cardElement: StripeCardElement | null = null;

  async ngOnInit() {
    this.stripe = await loadStripe('your_stripe_publishable_key');
    const elements = this.stripe!.elements();
    this.cardElement = elements.create('card');
    this.cardElement.mount('#card-element');
  }

  async addCard() {
    if (!this.stripe || !this.cardElement) return;

    const { paymentMethod, error } = await this.stripe.createPaymentMethod({
      type: 'card',
      card: this.cardElement,
    });

    if (error) {
      console.error(error.message);
      return;
    }

    await this.paymentService.attachPaymentMethod(
      this.currentUser.stripeCustomerId,
      paymentMethod!.id,
    );
  }
}
```

### 2c — Attach via API

```typescript
// In your existing API service

async attachPaymentMethod(customerId: string, paymentMethodId: string) {
  return this.http
    .post(`${this.apiUrl}/stripe/customers/${customerId}/payment-methods`, {
      paymentMethodId,
    })
    .toPromise();
}
```

---

## Step 3 — List Payment Methods

Fetch all saved cards for a customer to display in a payment method selection screen.

```typescript
// In your existing API service

async getPaymentMethods(customerId: string) {
  return this.http
    .get<{ data: any[] }>(`${this.apiUrl}/stripe/customers/${customerId}/payment-methods`)
    .toPromise();
}
```

Each item in `data` includes:

| Field | Description |
|-------|-------------|
| `id` | The `paymentMethodId` — use this for all subsequent operations |
| `card.brand` | e.g. `"visa"`, `"mastercard"` |
| `card.last4` | Last 4 digits of the card |
| `card.exp_month` / `card.exp_year` | Expiry |

---

## Step 4 — Set Default Payment Method

Update the customer's default payment method. The default is used for `invoice_settings` and can be used to pre-select a card in your UI.

```typescript
// In your existing API service

async setDefaultPaymentMethod(customerId: string, paymentMethodId: string) {
  return this.http
    .put(`${this.apiUrl}/stripe/customers/${customerId}/payment-methods/default`, {
      paymentMethodId,
    })
    .toPromise();
}
```

---

## Step 5 — Remove a Payment Method

Detach a card from the customer. The card will no longer be usable.

```typescript
// In your existing API service

async removePaymentMethod(customerId: string, paymentMethodId: string) {
  return this.http
    .delete(`${this.apiUrl}/stripe/customers/${customerId}/payment-methods/${paymentMethodId}`)
    .toPromise();
}
```

---

## API Reference

All routes are prefixed with `/stripe`.

| Method | Route | Body | Description |
|--------|-------|------|-------------|
| `POST` | `/customers` | `{ email, name? }` | Create a Stripe customer |
| `POST` | `/customers/:customerId/payment-methods` | `{ paymentMethodId }` | Attach a payment method |
| `GET` | `/customers/:customerId/payment-methods` | — | List saved payment methods |
| `PUT` | `/customers/:customerId/payment-methods/default` | `{ paymentMethodId }` | Set default payment method |
| `DELETE` | `/customers/:customerId/payment-methods/:paymentMethodId` | — | Remove a payment method |

---

## Notes

- **Never send raw card numbers to your backend.** Always use `stripe.createPaymentMethod()` on the client to get a `paymentMethodId` first.
- The `stripeCustomerId` (`cus_...`) should be persisted on your user record (backend database or user profile) so it can be reused across sessions.
- When creating a payment intent for a customer with saved cards, pass the `customer` and `payment_method` fields to the existing `POST /stripe/create-payment-intent` endpoint (backend update may be required).