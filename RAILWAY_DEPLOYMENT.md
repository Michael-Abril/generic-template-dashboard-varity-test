# Railway + Vercel Production Deployment Guide

**Last Updated:** December 11, 2025
**Purpose:** Deploy the Generic Template Dashboard to Railway (backend) + Vercel (frontend) for production

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PRODUCTION DEPLOYMENT                            │
│              (Railway + Vercel - Testnet Launch)                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐         ┌─────────────────┐                  │
│  │   FRONTEND      │         │    BACKEND      │                  │
│  │   (Vercel)      │ ─────▶  │   (Railway)     │                  │
│  │   Next.js 14    │         │   FastAPI       │                  │
│  └─────────────────┘         └────────┬────────┘                  │
│                                       │                            │
│                              ┌────────┴────────┐                  │
│                              │                 │                  │
│                         ┌────▼────┐     ┌─────▼─────┐            │
│                         │PostgreSQL│     │   Redis   │            │
│                         │ (Plugin) │     │ (Plugin)  │            │
│                         └──────────┘     └───────────┘            │
│                                                                     │
│  External Services:                                                │
│  - Pinata (Filecoin/IPFS Storage)                                 │
│  - Varity L3 Testnet (Blockchain)                                 │
│  - Privy (Authentication)                                         │
│  - thirdweb (Web3 SDK)                                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Railway Backend Setup

### 1.1 Create Railway Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select `varity-labs/generic-template-dashboard` repository
4. **CRITICAL Settings:**
   - **Root Directory:** `/backend`
   - **Start Command:** `bash start.sh`

### 1.2 Add PostgreSQL Plugin

1. In your Railway project, click "+ New"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically set `DATABASE_URL` for you

### 1.3 Add Redis Plugin

1. In your Railway project, click "+ New"
2. Select "Database" → "Redis"
3. Railway will automatically set `REDIS_URL` for you

### 1.4 Add ALL Environment Variables

In Railway dashboard → Your service → Variables tab, add these variables.

**Copy the values exactly as shown below:**

```bash
# ============================================================
# REQUIRED - App will fail without these
# ============================================================

# Environment
ENVIRONMENT=production
LOG_LEVEL=INFO

# Varity L3 Chain
VARITY_CHAIN_ID=33529
VARITY_RPC_URL=https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz
VARITY_L3_RPC=https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz

# Pinata (Filecoin/IPFS Storage) - REQUIRED
PINATA_API_KEY=85129e92e21e7b51cb44
PINATA_SECRET_KEY=35b44fb64bd61a1683fddf0154ed545be0c248f793a371abd4f8e16955cd1f05
PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI5MmI3MWNjOC00ODhiLTQxNWQtODk4Ny1jNWM2M2I5ODEyOGMiLCJlbWFpbCI6InNpcmVuaWMuY3NAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6Ijg1MTI5ZTkyZTIxZTdiNTFjYjQ0Iiwic2NvcGVkS2V5U2VjcmV0IjoiMzViNDRmYjY0YmQ2MWExNjgzZmRkZjAxNTRlZDU0NWJlMGMyNDhmNzkzYTM3MWFiZDRmOGUxNjk1NWNkMWYwNSIsImV4cCI6MTc5NjI2OTQ0M30.XIgJYgWVPSSaIxVAPMpCY5mtXlmg5ZKHsR_W39QOt1o

# Lit Protocol
LIT_NETWORK=cayenne

# Frontend URL (UPDATE AFTER VERCEL DEPLOY!)
FRONTEND_URL=https://your-app.vercel.app
OAUTH_REDIRECT_BASE_URL=https://your-app.vercel.app

# ============================================================
# AUTHENTICATION & WEB3 SERVICES
# ============================================================

# Privy Authentication
PRIVY_APP_ID=cmhwbozxu004fjr0cicfz0tf8
PRIVY_APP_SECRET=2BuR8Ro1oRrhsxjTCK1riCqRQnuGrbAQi22FNEHptfaraQykAnXjYvu24Khx6XxomSzw9s5Vc2mb49qXvneBXYWK

# thirdweb
THIRDWEB_CLIENT_ID=acb17e07e34ab2b8317aa40cbb1b5e1d

# ZeroDev Smart Wallets
ZERODEV_PROJECT_ID=88173d8e-c975-49e2-aa94-3e857c5aaf48
ZERODEV_BUNDLER_URL=https://bundler-varity-testnet-rroe52pwjp.t.conduit.xyz
ZERODEV_PAYMASTER_URL=https://rpc.zerodev.app/api/v3/88173d8e-c975-49e2-aa94-3e857c5aaf48/chain/33529?selfFunded=true

# Decent Cross-Chain
DECENT_API_KEY=be3083b99654290beea78d52d1ed95c6

# ============================================================
# OAUTH PROVIDERS (QuickBooks configured, others pending)
# ============================================================

# QuickBooks - CONFIGURED
QUICKBOOKS_CLIENT_ID=ABX6u8d2g40ZFuGCMcaR6KNGQ0J4GWGukB1oTKtHQqkElbyYuL
QUICKBOOKS_CLIENT_SECRET=E184srbFxJhtrpSC4SfCZosXk3N8VqG16qk1Yqup

# Google Workspace - NEEDS SETUP
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Microsoft 365 - NEEDS SETUP
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=

# Slack - NEEDS SETUP
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=

# Stripe - NEEDS SETUP
STRIPE_CLIENT_ID=
STRIPE_CLIENT_SECRET=

# Salesforce - NEEDS SETUP
SALESFORCE_CLIENT_ID=
SALESFORCE_CLIENT_SECRET=

# Shopify - NEEDS SETUP
SHOPIFY_CLIENT_ID=
SHOPIFY_CLIENT_SECRET=

# HubSpot - NEEDS SETUP
HUBSPOT_CLIENT_ID=
HUBSPOT_CLIENT_SECRET=

# Zendesk - NEEDS SETUP
ZENDESK_CLIENT_ID=
ZENDESK_CLIENT_SECRET=

# Monday.com - NEEDS SETUP
MONDAY_CLIENT_ID=
MONDAY_CLIENT_SECRET=

# GitHub - NEEDS SETUP
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

### 1.5 Deploy

After adding ALL variables, Railway will automatically redeploy. Wait for:
- Build to complete (green checkmark)
- Health check to pass

---

## Step 2: Vercel Frontend Setup

### 2.1 Create Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import `varity-labs/generic-template-dashboard` repository
4. **CRITICAL Settings:**
   - **Framework Preset:** Next.js
   - **Root Directory:** `.` (root, NOT /backend)

### 2.2 Add Environment Variables

In Vercel → Your project → Settings → Environment Variables:

```bash
# Backend API URL (get from Railway after deploy)
NEXT_PUBLIC_API_URL=https://generic-template-dashboard-production.up.railway.app

# Varity L3 Chain
NEXT_PUBLIC_VARITY_CHAIN_ID=33529
NEXT_PUBLIC_VARITY_RPC_URL=https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz

# Privy Authentication
NEXT_PUBLIC_PRIVY_APP_ID=cmhwbozxu004fjr0cicfz0tf8

# thirdweb Web3
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=acb17e07e34ab2b8317aa40cbb1b5e1d
```

### 2.3 Deploy

Click "Deploy" - Vercel will build and deploy the frontend.

---

## Step 3: Connect Frontend & Backend

### 3.1 Get Railway URL

After Railway deploys successfully:
1. Go to Railway → Your backend service → Settings
2. Find the generated URL (e.g., `generic-template-dashboard-production.up.railway.app`)

### 3.2 Update Vercel with Railway URL

1. Go to Vercel → Your project → Settings → Environment Variables
2. Set `NEXT_PUBLIC_API_URL` to your Railway URL

### 3.3 Update Railway with Vercel URL

1. Go to Railway → Your backend service → Variables
2. Update these two variables:
   ```
   FRONTEND_URL=https://your-app.vercel.app
   OAUTH_REDIRECT_BASE_URL=https://your-app.vercel.app
   ```

### 3.4 Update QuickBooks OAuth

1. Go to [QuickBooks Developer Portal](https://developer.intuit.com)
2. Find your app → Keys & OAuth
3. Add production redirect URI:
   ```
   https://your-app.vercel.app/oauth/callback/quickbooks
   ```

---

## Step 4: Verify Deployment

### 4.1 Check Backend Health

```bash
curl https://your-railway-url.up.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "pinata": "connected",
  "arbitrum_rpc": "connected"
}
```

### 4.2 Test API Endpoints

```bash
# Test marketplace
curl https://your-railway-url.up.railway.app/api/v1/marketplace/products

# Test dashboard (with wallet)
curl "https://your-railway-url.up.railway.app/api/v1/dashboard/kpis?wallet_address=0x20B7d1426649D9a573ba7Fd10592456264220cbF"
```

### 4.3 Test Frontend

1. Visit your Vercel URL
2. Verify pages load: Dashboard, Marketplace, Settings
3. Test login with Privy
4. Test QuickBooks OAuth connection

---

## Local Docker vs Railway

| Component | Local Development | Railway Production |
|-----------|------------------|-------------------|
| Backend | generic-template-backend:8002 | Railway service |
| PostgreSQL | generic-template-postgres:5433 | Railway PostgreSQL plugin (auto) |
| Redis | generic-template-redis:6380 | Railway Redis plugin (auto) |
| Ollama | generic-template-ollama:11435 | Not needed (using Together.ai API) |
| Qdrant | generic-template-qdrant:6334 | Not needed for MVP |

**Important:** Your 5 local Docker containers are for LOCAL DEVELOPMENT only. Railway provides PostgreSQL and Redis as managed plugins - you don't migrate containers.

---

## Troubleshooting

### "pinata_api_key Field required" Error

The app requires Pinata credentials. Ensure these are set in Railway Variables:
- `PINATA_API_KEY`
- `PINATA_SECRET_KEY`

### Build Fails with Import Errors

1. Verify root directory is `/backend`
2. Check Railway logs for specific import errors
3. Ensure `requirements.txt` is up to date

### Health Check Fails

1. Check Railway logs: Deployments → Latest → View Logs
2. Verify `DATABASE_URL` is set (automatic from PostgreSQL plugin)
3. Verify `REDIS_URL` is set (automatic from Redis plugin)
4. Verify `PINATA_API_KEY` and `PINATA_SECRET_KEY` are set

### OAuth Redirect Error

1. Verify `FRONTEND_URL` in Railway matches your Vercel URL exactly
2. Verify redirect URI is registered in OAuth provider dashboard
3. No trailing slash on URLs

### CORS Errors

The backend auto-allows the `FRONTEND_URL`. If you see CORS errors:
1. Check `FRONTEND_URL` matches your actual Vercel URL
2. Redeploy Railway after changing `FRONTEND_URL`

---

## Environment Variables Quick Reference

### Railway (Backend)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Auto | Set by PostgreSQL plugin |
| `REDIS_URL` | Auto | Set by Redis plugin |
| `PINATA_API_KEY` | Yes | Filecoin storage |
| `PINATA_SECRET_KEY` | Yes | Filecoin storage |
| `FRONTEND_URL` | Yes | Vercel URL for CORS/OAuth |
| `VARITY_CHAIN_ID` | Yes | 33529 |
| `VARITY_RPC_URL` | Yes | L3 RPC endpoint |
| `PRIVY_APP_ID` | Yes | Authentication |
| `THIRDWEB_CLIENT_ID` | Yes | Web3 SDK |

### Vercel (Frontend)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Railway URL |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Yes | Authentication |
| `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` | Yes | Web3 SDK |
| `NEXT_PUBLIC_VARITY_CHAIN_ID` | Yes | 33529 |
| `NEXT_PUBLIC_VARITY_RPC_URL` | Yes | L3 RPC endpoint |

---

## Production Checklist

- [ ] Railway PostgreSQL plugin added
- [ ] Railway Redis plugin added
- [ ] All Railway environment variables set
- [ ] Railway health check passing
- [ ] Vercel environment variables set
- [ ] Vercel deployment successful
- [ ] `FRONTEND_URL` in Railway matches Vercel URL
- [ ] `NEXT_PUBLIC_API_URL` in Vercel matches Railway URL
- [ ] QuickBooks redirect URI updated for production
- [ ] Health endpoint returns all services "connected"
- [ ] Dashboard pages load correctly
- [ ] OAuth flow works (QuickBooks test)
