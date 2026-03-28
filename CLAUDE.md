# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run start:dev      # Development server with file watching
npm run build          # Compile TypeScript to dist/
npm run start:prod     # Run compiled production build
npm run lint           # ESLint with auto-fix
npm run format         # Prettier formatting
npm run test           # Unit tests (Jest)
npm run test:watch     # Unit tests in watch mode
npm run test:cov       # Unit tests with coverage
npm run test:e2e       # End-to-end tests
```

To run a single test file:
```bash
npx jest src/stripe/stripe.service.spec.ts
```

## Architecture

NestJS REST API backend for the Vesse Rentals platform. Currently stateless — no database, focused entirely on Stripe payment integration.

**Module structure:**
- `src/app.module.ts` — Root module, imports StripeModule
- `src/stripe/` — Stripe Connect + payment intent logic
- `src/main.ts` — Bootstrap: enables CORS (`*`), sets up raw body middleware for `/stripe/webhook`

**Stripe integration:**
- Uses Stripe Connect (Express accounts) to onboard rental owners as vendors
- Payment intents split funds: 90% to vendor, 10% platform fee to main account
- Webhook endpoint requires raw body for signature verification — `rawBody: true` is set on the NestJS app and a raw body parser is applied specifically to `/stripe/webhook` before the global JSON parser
- Stripe API version: `2025-08-27.basil`

**API routes** (all under `/stripe`):
- `POST /stripe/create-account` — Create Stripe Express account for a vendor
- `POST /stripe/account-link` — Generate onboarding link
- `GET /stripe/balance/:accountId` — Get vendor balance
- `POST /stripe/create-payment-intent` — Create payment intent with platform fee
- `DELETE /stripe/delete-account/:id` — Delete connected account
- `POST /stripe/webhook` — Stripe webhook receiver

## Environment Variables

| Variable | Purpose |
|---|---|
| `PORT` | Server port (default: 3000) |
| `STRIPE_SECRET_KEY` | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `FRONTEND_URL` | Frontend URL used in Stripe onboarding redirect links |
