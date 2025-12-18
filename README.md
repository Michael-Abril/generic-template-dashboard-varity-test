# Varity Generic AI Dashboard Template

**Status:** LIVE at https://app.varity.so - Final Sprint to 100% Launch
**Network:** Varity L3 Arbitrum Rollup (Testnet)
**License:** MIT - "Powered by Varity" attribution required
**Last Updated:** December 18, 2025

---

## 🚨 CURRENT STATUS (December 2025)

### Live Deployment

| Service | URL | Status |
|---------|-----|--------|
| **Frontend** | https://app.varity.so | ✅ Live on Vercel |
| **Backend** | https://generic-template-dashboard-production.up.railway.app | ✅ Live on Railway |
| **Health Check** | https://generic-template-dashboard-production.up.railway.app/health | ✅ Healthy |

### Sprint Focus: 6 Priority Integrations

| Integration | Credentials | OAuth Flow | Data Sync | Status |
|-------------|:-----------:|:----------:|:---------:|--------|
| **QuickBooks** | ✅ | ✅ Works | 🔴 403 | App in Dev Mode - needs Intuit approval |
| **Google Workspace** | ✅ | ❓ Test | ❓ Test | Verify redirect URI |
| **Microsoft 365** | ✅ | ❓ Test | ❓ Test | Verify redirect URI |
| **Slack** | ✅ | ❓ Test | ❓ Test | Verify redirect URI |
| **Salesforce** | ✅ | ❓ Test | ❓ Test | Verify redirect URI |
| **HubSpot** | ✅ | ❓ Test | ❓ Test | Verify redirect URI |

### Remaining Work (In Priority Order)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | **QuickBooks Production** | 🔴 BLOCKED | Submit app for Intuit review |
| 2 | **Test OAuth Flows** | 🟡 IN PROGRESS | All credentials in Railway, test each |
| 3 | **Test AI Assistant** | 🟡 PENDING | Verify Together.ai with synced data |
| 4 | **Test Data Sync** | 🟡 PENDING | After OAuth works |
| 5 | **100% Page Testing** | 🟡 PENDING | Every button on every page |
| 6 | **Onboarding Flow** | ✅ COMPLETE | 6-step wizard |
| 7 | **Feedback System** | ✅ COMPLETE | Day 7, 25, 30 milestones |

### Next Action: Verify Redirect URIs

Ensure these redirect URIs are registered in each provider's developer portal:

```
https://app.varity.so/oauth/callback/quickbooks   ← QuickBooks Developer Portal
https://app.varity.so/oauth/callback/google       ← Google Cloud Console
https://app.varity.so/oauth/callback/microsoft    ← Azure AD App Registration
https://app.varity.so/oauth/callback/slack        ← Slack API Apps
https://app.varity.so/oauth/callback/salesforce   ← Salesforce Connected App
https://app.varity.so/oauth/callback/hubspot      ← HubSpot Developer Portal
```

---

## INFRASTRUCTURE STRATEGY: Beta vs Mainnet

> **IMPORTANT:** This document clearly distinguishes between our **Beta (Testnet)** and **Mainnet** infrastructure strategies.

### Beta Launch Infrastructure (CURRENT)

For the beta launch with 10-100 businesses, we use **centralized providers** for speed and cost efficiency:

| Component | Beta Provider | Why |
|-----------|---------------|-----|
| **Frontend** | Vercel | Fast deployment, free tier, optimized for Next.js |
| **Backend** | Railway | Easy setup, managed PostgreSQL/Redis, $5-20/mo |
| **LLM/AI** | Together.ai API | Pay-per-use (~$0.88/1M tokens), no GPU management |
| **Storage** | Pinata (IPFS) | Simple API, Filecoin-backed, $20/mo |
| **Blockchain** | Varity L3 Testnet | Free transactions, same smart contracts |

**Beta Cost:** ~$50-150/month for 10-100 businesses

### Mainnet Infrastructure (FUTURE)

After beta validation, we migrate to **100% decentralized infrastructure (DePin)**:

| Component | Mainnet Provider | Why |
|-----------|------------------|-----|
| **Frontend** | Akash Network | Decentralized, censorship-resistant |
| **Backend** | Akash Network | Full control, no vendor lock-in |
| **LLM/AI** | Akash GPU (Self-hosted Llama 3.1 70B) | No API limits, predictable cost |
| **Storage** | Filecoin (Direct) | True decentralization, permanent storage |
| **Blockchain** | Varity L3 Mainnet | Production network via Conduit |

**Mainnet Cost:** ~$5,500/month (including $5,000 Conduit L3 fee)

### Why This Strategy?

1. **Speed to Market** - Railway/Vercel deploys in minutes, not days
2. **Cost Efficiency** - No $5,000/mo Conduit fee during validation
3. **Same Smart Contracts** - Testnet uses identical contract code
4. **Easy Migration** - Backend code is provider-agnostic
5. **Risk Mitigation** - Validate product-market fit before mainnet commitment

---

## Overview

The Generic AI Dashboard Template is Varity's flagship product - a company-specific AI dashboard that runs on 100% decentralized infrastructure (DePin). Each business gets their own isolated dashboard with AI assistant, software integrations, and encrypted data storage.

### Key Features

- **Professional Onboarding Flow** - 6-step wizard with GTM email collection
  - Welcome with trial badge and feature highlights
  - Company profile collection (name, industry, size)
  - Contact email for trial communications (GTM)
  - Industry-based integration recommendations
  - OAuth connection with visual sync progress
  - AI assistant preview before dashboard
- **Company-Specific AI Assistant** - 1,000 queries/month (Business plan)
  - General chat (works without integrations)
  - Business-specific RAG queries (powered by your integration data)
  - Document analysis (summary, key points, sentiment, extraction, action items)
  - Deep research mode (quick, standard, comprehensive)
  - Web search capability (real-time internet access)
- **25 Software Integrations** - QuickBooks, Google Workspace, Slack, Microsoft 365, etc.
- **100% Decentralized Storage** - Filecoin/IPFS via Pinata
- **RAG → Filecoin Architecture** - All business data stored as Filecoin CIDs, queried by AI
- **4-Layer Security** - Wallet-based encryption, multi-tenant isolation
- **Blockchain Settlement** - Varity L3 Arbitrum Rollup

### AI-Powered Intelligence

The dashboard's AI Assistant is **revolutionary** - it queries YOUR business data stored in Filecoin/IPFS:

```
Integration Data → Pinata (Filecoin) → Returns CID
         ↓
RAG Indexing → Qdrant (vectors + CID reference)
         ↓
AI Query → Retrieves YOUR data only → Generates business-specific response
```

**LLM Providers:**
- **Together.ai** (Llama 3.3 70B) - Primary production LLM
- **Ollama** (TinyLlama/Mistral) - Local fallback for development

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Git

### 1. Clone and Install
```bash
cd /varity/chains/arbitrum/deployments/testnet/testing/generic-company-dashboard
npm install
```

### 2. Start Backend Services
```bash
docker-compose up -d
# Wait for containers to be healthy
docker ps --filter "name=generic-template"
```

### 3. Start Frontend
```bash
npm run dev
# Visit: http://localhost:3001
```

### 4. Verify Health
```bash
curl http://localhost:8002/health
# Should return: {"status":"healthy","database":"connected",...}
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js 14)                       │
│                    Port: 3001 (localhost)                        │
│          Privy Auth + thirdweb Web3 + Tailwind CSS               │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                      BACKEND (FastAPI)                           │
│                    Port: 8002 (localhost)                        │
│         OAuth Handlers + Encryption + Filecoin Storage           │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                    INFRASTRUCTURE                                │
├──────────────┬──────────────┬──────────────┬───────────────────┤
│  PostgreSQL  │    Redis     │   Ollama     │     Qdrant        │
│  Port: 5433  │  Port: 6380  │ Port: 11435  │  Port: 6334       │
│   Database   │    Cache     │    LLM       │   Vector DB       │
└──────────────┴──────────────┴──────────────┴───────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                  EXTERNAL SERVICES                               │
├─────────────────┬─────────────────┬─────────────────────────────┤
│  Filecoin/IPFS  │  Varity L3      │  OAuth Providers            │
│    (Pinata)     │  (Arbitrum)     │  Google, Microsoft, Slack   │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

---

## Pricing Tiers

| Plan | Price | AI Queries | Storage | Users |
|------|-------|------------|---------|-------|
| **Business** | $99/mo | 1,000/month | 50GB | 1 |
| **Business Pro** | $199/mo | 2,000/month | 200GB | 10 |
| **Enterprise** | Custom | Unlimited | Unlimited | Unlimited |

---

## Beta Testing Strategy

### Phase 1: Testnet Beta (Current - 1 Month Free)
- **Network:** Varity L3 Testnet (Chain ID: 33529)
- **Target:** 10-100 businesses
- **Cost to Varity:** ~$300-500/month (Railway + Vercel + APIs)
- **Cost to Businesses:** FREE (1 month trial)
- **Goal:** Validate product-market fit, gather feedback

### Phase 2: Mainnet Launch (After Beta Validation)
- **Network:** Varity L3 Mainnet
- **Mainnet Cost:** $5,000/month (Conduit rollup fee)
- **Break-even:** ~50 Business plan customers ($99 × 50 = $4,950/mo)
- **Target:** 100+ paying customers before mainnet

### Beta Success Criteria
- [ ] 10+ businesses actively using dashboard
- [ ] At least 3 software integrations used per business
- [ ] Positive feedback on AI assistant value
- [ ] <5% churn during free trial
- [ ] At least 50% conversion intent to paid plan

---

## Infrastructure & Cost Analysis

### Beta Deployment (Railway + Vercel)

| Service | Provider | Cost/Month | Notes |
|---------|----------|------------|-------|
| Frontend | Vercel | $0-20 | Free tier sufficient for beta |
| Backend | Railway | $5-20 | Free tier → $20 at scale |
| PostgreSQL | Railway | Included | Managed database |
| Redis | Railway | Included | Managed cache |
| LLM API | Together.ai | ~$1-3/customer | Llama 3.1 70B API |
| Storage | Pinata | $20/month | 100GB included |
| **Total (10 customers)** | | **~$100-150/month** | |
| **Total (100 customers)** | | **~$400-600/month** | |

### Mainnet Deployment (Full DePin)

| Service | Provider | Cost/Month | Notes |
|---------|----------|------------|-------|
| Conduit L3 Rollup | Conduit | **$5,000** | Fixed monthly fee |
| Compute | Akash Network | $200-300 | Decentralized compute |
| GPU (LLM) | Akash Network | $150 | Llama 3.1 70B self-hosted |
| Storage | Filecoin | $50-100 | Decentralized storage |
| **Total** | | **~$5,500/month** | |

### Profit Margin Analysis

| Customers | Revenue | Beta Cost | Mainnet Cost | Beta Margin | Mainnet Margin |
|-----------|---------|-----------|--------------|-------------|----------------|
| 10 | $990 | $150 | N/A | 85% | N/A |
| 50 | $4,950 | $350 | $5,500 | 93% | -11% (loss) |
| 100 | $9,900 | $600 | $5,800 | 94% | 41% |
| 200 | $19,800 | $1,000 | $6,200 | 95% | 69% |

**Key Insight:** Need ~60 customers to break even on mainnet ($5,000 Conduit fee).

---

## Varity Corporate Treasury

### Required Token Holdings

To operate the DePin infrastructure, Varity must hold these cryptocurrency tokens:

| Token | Symbol | Use Case | Beta Need | Mainnet Need |
|-------|--------|----------|-----------|--------------|
| **Akash** | AKT | Compute hosting | $0 (Railway) | ~$500/month |
| **Filecoin** | FIL | Decentralized storage | $0 (Pinata) | ~$100/month |
| **Arbitrum** | ARB | L3 gas & settlement | ~$50 | ~$200/month |
| **Ethereum** | ETH | L1 settlement (rare) | ~$20 | ~$100 buffer |
| **USDC** | USDC | Bridge liquidity, payments | ~$500 | ~$2,000 |

### Treasury Recommendations

**For Beta Launch (Immediate):**
```
Total Treasury: ~$1,000-2,000
- $500 USDC (operational buffer)
- $50 ARB (testnet gas)
- $20 ETH (emergency L1)
- Rest in stablecoins
```

**For Mainnet Launch (After Beta):**
```
Total Treasury: ~$15,000-20,000
- $5,000 USDC (first month Conduit fee)
- $2,000 AKT (3-month Akash compute reserve)
- $500 FIL (6-month storage reserve)
- $500 ARB (3-month gas reserve)
- $200 ETH (L1 settlement buffer)
- $5,000 USDC (operational reserve)
```

### Token Acquisition Strategy
1. **USDC** - Purchase via Coinbase, bridge to Arbitrum
2. **AKT** - Purchase on KuCoin or Kraken, stake for rewards
3. **FIL** - Purchase via Coinbase, use Filecoin+ for free storage credits
4. **ARB** - Purchase on Coinbase, available on Arbitrum directly
5. **ETH** - Purchase on Coinbase, bridge as needed

---

## Deployment Guide

### Option 1: Railway Only (Recommended for Beta)

Railway can host everything except the frontend:

```bash
# 1. Create Railway project
railway login
railway init

# 2. Add services
railway add postgresql
railway add redis

# 3. Deploy backend
cd backend
railway up

# 4. Set environment variables
railway variables set DATABASE_URL=...
railway variables set REDIS_URL=...
# (See backend/.env for full list)

# 5. Deploy frontend to Vercel
cd ..
vercel
```

### Option 2: Vercel + Railway (Alternative)

```bash
# Frontend on Vercel (optimized for Next.js)
vercel

# Backend on Railway
cd backend
railway up
```

### Environment Variables for Production

```bash
# Frontend (.env.production)
NEXT_PUBLIC_API_URL=https://your-api.railway.app
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your-thirdweb-id

# Backend (Railway environment)
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
FRONTEND_URL=https://your-app.vercel.app
PINATA_JWT=your-pinata-jwt
# All OAuth credentials...
```

---

## OAuth Integration Status (6 Priority Integrations)

| Provider | Credentials | Redirect URI | OAuth Flow | Data Sync | Portal |
|----------|:-----------:|:------------:|:----------:|:---------:|--------|
| **QuickBooks** | ✅ | ✅ | ✅ | 🔴 403 | developer.intuit.com |
| **Google Workspace** | ✅ | ❓ Verify | ❓ Test | ❓ Test | console.cloud.google.com |
| **Microsoft 365** | ✅ | ❓ Verify | ❓ Test | ❓ Test | portal.azure.com |
| **Slack** | ✅ | ❓ Verify | ❓ Test | ❓ Test | api.slack.com |
| **Salesforce** | ✅ | ❓ Verify | ❓ Test | ❓ Test | developer.salesforce.com |
| **HubSpot** | ✅ | ❓ Verify | ❓ Test | ❓ Test | developers.hubspot.com |

### Production Redirect URIs

These must be registered in each provider's developer portal:

```
https://app.varity.so/oauth/callback/quickbooks
https://app.varity.so/oauth/callback/google
https://app.varity.so/oauth/callback/microsoft
https://app.varity.so/oauth/callback/slack
https://app.varity.so/oauth/callback/salesforce
https://app.varity.so/oauth/callback/hubspot
```

---

## Network Configuration

### Varity L3 Testnet
```
Chain ID: 33529
RPC URL: https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz
WebSocket: wss://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz
Explorer: https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz
USDC Address: 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
USDC Decimals: 6 (NOT 18!)
```

### Getting Testnet Tokens
1. Get Arbitrum Sepolia ETH: https://faucet.quicknode.com/arbitrum/sepolia
2. Bridge to Varity L3 via Superbridge
3. Request USDC from Varity team

---

## Documentation

| Document | Purpose |
|----------|---------|
| [CLAUDE.md](./CLAUDE.md) | AI assistant context for development |
| [backend/CLAUDE.md](./backend/CLAUDE.md) | Backend-specific development guide |
| [src/CLAUDE.md](./src/CLAUDE.md) | Frontend-specific development guide |
| [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) | Detailed infrastructure & cost analysis |
| [docs/guides/OAUTH_PROVIDER_SETUP_GUIDE.md](./docs/guides/OAUTH_PROVIDER_SETUP_GUIDE.md) | OAuth setup instructions |

---

## Support

- **Documentation:** /docs folder
- **Issues:** GitHub Issues
- **Enterprise:** Contact Varity team

---

## License

MIT License - "Powered by Varity" attribution required

---

**Ready for Beta Launch**
