# Koyeb Deployment Plan

## Overview

This document outlines the steps to deploy the `vesse-rentals-backend` NestJS application to Koyeb using a Docker-based deployment via GitHub.

---

## Prerequisites

- [ ] Koyeb account at [koyeb.com](https://www.koyeb.com)
- [ ] GitHub repository connected to Koyeb
- [ ] All required environment variables ready (see below)
- [ ] Stripe account with webhook endpoint configured

---

## Step 1 — Add a Dockerfile

Create a `Dockerfile` in the project root for a production-optimized build:

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 8000
CMD ["node", "dist/main"]
```

> **Why port 8000?** Koyeb's default health check expects port 8000. The app reads the port from the `PORT` environment variable (already wired in `src/main.ts`), and Koyeb will inject `PORT=8000` automatically.

---

## Step 2 — Add a `.dockerignore`

Create `.dockerignore` to keep the image lean:

```
node_modules
dist
coverage
.env*
service-account.json
.git
docs
*.md
```

---

## Step 3 — Create the Koyeb Service

### Option A: Deploy via Koyeb Dashboard (recommended for first deploy)

1. Log in to [app.koyeb.com](https://app.koyeb.com)
2. Click **Create Service**
3. Select **GitHub** as the deployment source
4. Choose the `vesse-rentals-backend` repository and `main` branch
5. Set **Builder** to **Dockerfile**
6. Leave Dockerfile path as `./Dockerfile`
7. Set **Run command** to leave blank (CMD in Dockerfile handles it)
8. Set **Port** to `8000`
9. Add all environment variables (see Step 4)
10. Click **Deploy**

### Option B: Deploy via Koyeb CLI

```bash
# Install the CLI
brew install koyeb/tap/koyeb

# Authenticate
koyeb login

# Create the service
koyeb service create vesse-rentals-backend \
  --app vesse-rentals \
  --git github.com/<your-org>/vesse-rentals-backend \
  --git-branch main \
  --ports 8000:http \
  --routes /:8000 \
  --checks 8000:http:/health \
  --env PORT=8000 \
  --env STRIPE_SECRET_KEY=sk_live_... \
  --env STRIPE_WEBHOOK_SECRET=whsec_... \
  --env FRONTEND_URL=https://your-frontend-url.com
```

---

## Step 4 — Environment Variables

Set the following environment variables in the Koyeb service settings. Never commit these to the repository.

| Variable | Required | Description |
|---|---|---|
| `PORT` | Yes | Set to `8000` (Koyeb default) |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key (`sk_live_...` or `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Yes | Webhook signing secret from Stripe dashboard |
| `FRONTEND_URL` | Yes | Frontend URL for Stripe onboarding redirect links |

---

## Step 5 — Configure the Stripe Webhook

After the first deploy, Koyeb will assign a public URL (e.g., `https://vesse-rentals-backend-<hash>.koyeb.app`).

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Set the endpoint URL to: `https://<your-koyeb-domain>/stripe/webhook`
4. Select the events your app handles (e.g., `payment_intent.succeeded`, `payment_intent.payment_failed`, `account.updated`)
5. Copy the **Signing secret** and update the `STRIPE_WEBHOOK_SECRET` environment variable in Koyeb

---

## Step 6 — Add a Health Check Endpoint

Koyeb requires a health check HTTP endpoint. Add one to the Stripe controller or create a dedicated health controller.

### Recommended: Add a `/health` endpoint to `app.module.ts` or a new `HealthController`

```typescript
// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}
```

Register it in `AppModule`:

```typescript
// src/app.module.ts
import { HealthController } from './health/health.controller';

@Module({
  controllers: [HealthController],
  // ...
})
```

Then configure the Koyeb health check to `GET /health` on port `8000`.

---

## Step 7 — Verify Continuous Deployment

Koyeb automatically redeploys on every push to the configured branch (`main`). Confirm this is working:

1. Push a small change to `main`
2. Go to Koyeb Dashboard → Service → **Deployments**
3. Confirm a new deployment triggered and succeeded

To deploy from a different branch (e.g., `staging`), create a second Koyeb service pointing to that branch.

---

## Deployment Checklist

- [ ] `Dockerfile` added to project root
- [ ] `.dockerignore` added to project root
- [ ] `/health` endpoint implemented and registered
- [ ] Koyeb service created and linked to GitHub repo
- [ ] All environment variables set in Koyeb (not committed to repo)
- [ ] `PORT=8000` set in Koyeb environment variables
- [ ] Stripe webhook endpoint updated to Koyeb public URL
- [ ] `STRIPE_WEBHOOK_SECRET` updated with new signing secret
- [ ] First deployment successful and health check passing
- [ ] Test a payment intent end-to-end against the live URL

---

## Rollback

If a deployment breaks production:

1. Go to Koyeb Dashboard → Service → **Deployments**
2. Find the last working deployment
3. Click **Redeploy** on that version

Or via CLI:
```bash
koyeb deployment redeploy <deployment-id>
```
