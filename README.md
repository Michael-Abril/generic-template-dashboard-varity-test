# Varity Generic AI Dashboard

**Live:** https://app.varity.so
**Status:** Beta (Testnet)
**License:** MIT - "Powered by Varity" attribution required

---

## Overview

A company-specific AI dashboard with encrypted data storage on Filecoin/IPFS. Each business gets isolated data storage, AI assistant access, and software integrations.

### Key Features

- **AI Assistant** - Chat, RAG queries, document analysis, deep research
- **6 Priority Integrations** - QuickBooks, Google Workspace, Microsoft 365, Slack, Salesforce, HubSpot
- **Decentralized Storage** - Filecoin/IPFS via Pinata
- **Multi-Tenant Security** - Wallet-based encryption, isolated data
- **Professional Onboarding** - 6-step wizard with trust signals, time estimates, skip options, celebration animation, and AI preview

---

## Current Status (December 29, 2025)

### What Works

| Feature | Status |
|---------|--------|
| Frontend (Vercel) | ✅ Live |
| Backend (Railway) | ✅ Live |
| **CI/CD Pipeline** | ✅ GitHub Actions + Husky + Playwright |
| Google OAuth + Sync | ✅ Working |
| AI Assistant | ✅ Working |
| Onboarding | ✅ Working |
| Conversations | ✅ Working |
| Dashboard | ✅ Clean redesigned UI with AI insights |
| Marketplace | ✅ OAuth-only connections |
| Settings | ✅ All tabs functional |
| Data Export | ✅ JSON, CSV, Excel |
| Team Management | ✅ Frontend makes API calls |

### What's Blocked/Untested

| Feature | Status | Issue |
|---------|--------|-------|
| QuickBooks Sync | ✅ Working | Production credentials |
| Microsoft 365 | ❓ | Needs testing |
| Slack | ❓ | Needs testing |
| Salesforce | ❓ | Needs testing |
| HubSpot | ❓ | Needs testing |
| Data Import | ⏳ | Coming Soon |

---

## Quick Start

### Prerequisites

- Node.js 18+
- Git

### Development (No Docker Needed)

```bash
# Clone
git clone https://github.com/varity-labs/generic-template-dashboard.git
cd generic-template-dashboard

# Install
npm install --legacy-peer-deps

# Build (catches TypeScript errors)
npm run build

# Development server
npm run dev  # http://localhost:3001
```

### Deploy

Push to main branch triggers auto-deploy:

- **Frontend:** Vercel (https://app.varity.so)
- **Backend:** Railway

```bash
git add . && git commit -m "fix: description" && git push origin main
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 FRONTEND (Next.js 14)                        │
│               https://app.varity.so                          │
│         Privy Auth + thirdweb + Tailwind CSS                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                  BACKEND (FastAPI)                           │
│  https://generic-template-dashboard-production.up.railway.app│
│        OAuth + Encryption + Together.ai + Pinata             │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   INFRASTRUCTURE                             │
├────────────┬────────────┬────────────┬─────────────────────┤
│ PostgreSQL │   Redis    │  Qdrant    │  Pinata (Filecoin)  │
└────────────┴────────────┴────────────┴─────────────────────┘
```

---

## Integrations

### Priority 6 (For Launch)

| Integration | OAuth | Data Sync | Status |
|-------------|:-----:|:---------:|--------|
| **Google Workspace** | ✅ | ✅ | Working |
| **QuickBooks** | ✅ | ✅ | Production ready |
| **Microsoft 365** | ✅ | ❓ | Untested |
| **Slack** | ✅ | ❓ | Untested |
| **Salesforce** | ✅ | ❓ | Untested |
| **HubSpot** | ✅ | ❓ | Untested |

### Redirect URIs

```
https://app.varity.so/oauth/callback/google
https://app.varity.so/oauth/callback/quickbooks
https://app.varity.so/oauth/callback/microsoft
https://app.varity.so/oauth/callback/slack
https://app.varity.so/oauth/callback/salesforce
https://app.varity.so/oauth/callback/hubspot
```

---

## AI Assistant

### Modes

| Mode | Description |
|------|-------------|
| **Standard** | Quick answers from business data |
| **Deep Research** | Comprehensive analysis + optional web search |
| **Deep Analysis** | Executive-level reports |
| **Document** | Upload and analyze files |

### LLM Stack

- **Primary:** Together.ai (Llama 3.3 70B)
- **Fallback:** Ollama (TinyLlama)

---

## Security

### 4-Layer Multi-Tenant Architecture

1. **Authentication** - Privy (email → embedded wallet)
2. **Encryption** - AES-256-GCM with wallet-derived keys
3. **Storage** - Wallet-namespaced Filecoin/IPFS
4. **RAG** - Isolated Qdrant collections per wallet

**Guarantee:** Cross-business data access is mathematically impossible.

---

## Project Structure

```
├── src/                      # Next.js 14 frontend
│   ├── app/                  # App Router pages
│   ├── components/           # React components
│   └── ...
│
├── backend/                  # FastAPI backend
│   ├── app/api/v1/          # REST endpoints
│   ├── app/adapters/        # Integration sync adapters
│   ├── app/services/        # Business logic
│   └── ...
│
├── CLAUDE.md                # Development guide
├── src/CLAUDE.md            # Frontend guide
└── backend/CLAUDE.md        # Backend guide
```

---

## Known Issues

### Active Issues

| Issue | Impact | Status |
|-------|--------|--------|
| QuickBooks | Production credentials configured | Working |
| Document upload | AI Assistant file upload incomplete | Medium priority |

### ✅ Resolved (December 23, 2025)

| Issue | Resolution |
|-------|------------|
| Duplicate component files | Deleted 9 duplicate files |
| USDC purchases code | Removed from marketplace (OAuth-only now) |
| Data import broken | Changed to "Coming Soon" UI |
| Storage usage hardcoded | Replaced with decentralized storage info |
| Team invites simulated | Frontend now makes proper API calls |

---

## Environment Variables

### Vercel (Frontend)

```bash
NEXT_PUBLIC_API_URL=https://generic-template-dashboard-production.up.railway.app
NEXT_PUBLIC_PRIVY_APP_ID=cmhwbozxu004fjr0cicfz0tf8
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=acb17e07e34ab2b8317aa40cbb1b5e1d
```

### Railway (Backend)

```bash
DATABASE_URL=postgresql+asyncpg://...
TOGETHER_API_KEY=...
PINATA_API_KEY=...
FRONTEND_URL=https://app.varity.so
# + OAuth credentials for each provider
```

---

## CI/CD Guardrails (NEW - December 29, 2025)

Comprehensive guardrail system to prevent regressions:

### Pre-commit Hooks (Husky)
```bash
# Automatically runs on every commit:
npm run type-check  # TypeScript validation
npm run build       # Full build verification
# Commit is BLOCKED if either fails
```

### GitHub Actions CI Pipeline
- **Build & Type Check** - Runs on every push/PR
- **API Health Checks** - Verifies backend endpoints
- **E2E Tests (Playwright)** - Full browser testing
- **Blocks merge** if any check fails

### Running Tests Locally
```bash
npm run test:e2e        # Run E2E tests headless
npm run test:e2e:ui     # Run with Playwright UI
```

### Test Files
| File | Purpose |
|------|---------|
| `tests/e2e/api-health.spec.ts` | API endpoint validation |
| `tests/e2e/homepage.spec.ts` | Homepage/public pages |
| `tests/e2e/google-workspace.spec.ts` | Integration pages |
| `tests/e2e/data-sync.spec.ts` | Data pipeline health |

---

## Testing

### Manual Test URLs

```
https://app.varity.so/                   # Homepage
https://app.varity.so/onboarding         # 6-step wizard
https://app.varity.so/marketplace        # Connect integrations
https://app.varity.so/dashboard          # Main dashboard
https://app.varity.so/ai-assistant       # AI chat
https://app.varity.so/settings           # User settings
```

### Backend Health

```bash
curl https://generic-template-dashboard-production.up.railway.app/health
```

---

## Documentation

| Document | Purpose |
|----------|---------|
| [CLAUDE.md](./CLAUDE.md) | Main development guide |
| [src/CLAUDE.md](./src/CLAUDE.md) | Frontend guide |
| [backend/CLAUDE.md](./backend/CLAUDE.md) | Backend guide |

---

## Varity L3 Network

```
Chain ID: 33529
RPC: https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz
Explorer: https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz
USDC: 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d (6 decimals)
```

---

## Support

- **Issues:** https://github.com/varity-labs/generic-template-dashboard/issues
- **Docs:** `/docs` folder

---

## License

MIT License - "Powered by Varity" attribution required
