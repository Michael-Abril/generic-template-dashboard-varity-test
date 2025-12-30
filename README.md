# Varity Generic AI Dashboard

**Live:** https://app.varity.so
**Status:** Beta - 45% Working (see details below)
**License:** MIT - "Powered by Varity" attribution required

> **VERIFIED:** Status validated via live API testing on December 30, 2025

---

## Overview

A company-specific AI dashboard with encrypted data storage on Filecoin/IPFS. Each business gets isolated data storage, AI assistant access, and software integrations.

### Key Features

- **AI Assistant** - Chat, RAG queries, document analysis, deep research (90% WORKING)
- **Planning** - Tasks and Roadmap with RAG integration (95% WORKING)
- **6 Priority Integrations** - QuickBooks, Google, Microsoft, Slack, Salesforce, HubSpot
- **Decentralized Storage** - Filecoin/IPFS via Pinata
- **Multi-Tenant Security** - Wallet-based encryption, isolated data

---

## Current Status (December 30, 2025)

### What Actually Works (Verified)

| Feature | Status | Notes |
|---------|:------:|-------|
| **AI Assistant** | 90% | RAG queries, web search, conversations |
| **Planning (Tasks/Roadmap)** | 95% | Full CRUD, RAG indexed |
| **Slack Live API** | 100% | Backend returns data correctly |
| **Infrastructure** | 100% | Backend, Pinata, Qdrant all healthy |
| **Homepage** | 100% | Marketing pages complete |
| **Onboarding** | 100% | 6-step wizard complete |
| **Marketplace** | 100% | OAuth connections working |
| **Settings** | 90% | All tabs functional |

### What's Broken (Verified)

| Feature | Status | Issue |
|---------|:------:|-------|
| **Google OAuth** | EXPIRED | Expires within 24 hours |
| **Microsoft OAuth** | EXPIRED | Expires within 48 hours |
| **QuickBooks OAuth** | EXPIRED | Expires within 24 hours |
| **Integration Pages** | 80% BROKEN | Frontend doesn't use live API endpoints |
| **Analytics Page** | 0% REAL | Shows 100% mock/fake data |
| **Dashboard KPIs** | Misleading | Shows wrong numbers |

### Integration Status

| Integration | OAuth | Live API | Frontend | Overall |
|-------------|:-----:|:--------:|:--------:|:-------:|
| **Slack** | ACTIVE | Works | Doesn't use it | 50% |
| **Google** | EXPIRED | Untestable | - | 20% |
| **Microsoft** | EXPIRED | Untestable | - | 10% |
| **QuickBooks** | EXPIRED | Untestable | - | 5% |
| **Salesforce** | Unknown | Unknown | - | ? |
| **HubSpot** | Unknown | Unknown | - | ? |

---

## Quick Start

### Prerequisites

- Node.js 18+
- Git

### Development

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

## Critical Issues

### Priority 1: OAuth Token Refresh (CRITICAL)

OAuth tokens expire within 24-48 hours. Token refresh not working.

**Location:** `backend/app/api/v1/integrations.py` lines 66-129

### Priority 2: Frontend Live API Integration (CRITICAL)

Backend live API endpoints work but frontend doesn't call them.

**Location:** `src/app/dashboard/tools/[integration]/page.tsx`

### Priority 3: Dashboard KPIs

Shows wrong/fake data that doesn't match actual data counts.

**Location:** `backend/app/api/v1/dashboard.py`

---

## AI Assistant

### Modes

| Mode | Description | Status |
|------|-------------|:------:|
| **Standard** | Quick answers from business data | Working |
| **Deep Research** | Comprehensive analysis + web search | Working |
| **Deep Analysis** | Executive-level reports | Working |
| **Document** | Upload and analyze files | Working |

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

---

## CI/CD Guardrails

### Pre-commit Hooks (Husky)
```bash
# Automatically runs on every commit:
npm run type-check  # TypeScript validation
npm run build       # Full build verification
# Commit is BLOCKED if either fails
```

### GitHub Actions CI Pipeline
- Build & Type Check on every push/PR
- API Health Checks
- E2E Tests (Playwright)
- Blocks merge if any check fails

---

## Documentation

| Document | Purpose |
|----------|---------|
| [CLAUDE.md](./CLAUDE.md) | Main development guide (accurate status) |
| [KNOWN-ISSUES.md](./KNOWN-ISSUES.md) | Current issues and priorities |
| [COMPLETED-WORK.md](./COMPLETED-WORK.md) | Past work with corrections |
| [LIVE-UI-AUDIT-REPORT-DEC-30.md](./LIVE-UI-AUDIT-REPORT-DEC-30.md) | Full audit findings |

---

## Testing URLs

```
https://app.varity.so/                   # Homepage
https://app.varity.so/onboarding         # 6-step wizard
https://app.varity.so/ai-assistant       # AI chat (WORKING)
https://app.varity.so/dashboard          # Main dashboard
https://app.varity.so/marketplace        # Connect integrations
https://app.varity.so/settings           # User settings
```

---

## Support

- **Issues:** https://github.com/varity-labs/generic-template-dashboard/issues
- **Docs:** See documentation files above

---

## License

MIT License - "Powered by Varity" attribution required
