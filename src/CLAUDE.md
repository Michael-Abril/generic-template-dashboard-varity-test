# CLAUDE.md - Frontend (Next.js 14)

**Last Updated:** December 13, 2025
**Framework:** Next.js 14 (App Router)
**Language:** TypeScript
**Styling:** Tailwind CSS
**Production:** Vercel (https://app.varity.so)
**Local Port:** 3001

---

## 🚨 PRODUCTION DEPLOYMENT (Vercel)

### Live URL

| Service | URL |
|---------|-----|
| **Frontend** | https://app.varity.so |

### Critical Vercel Environment Variables

These are set in Vercel Dashboard → Project → Settings → Environment Variables:

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=https://generic-template-dashboard-production.up.railway.app

# Privy Authentication
NEXT_PUBLIC_PRIVY_APP_ID=cmhwbozxu004fjr0cicfz0tf8

# thirdweb Web3
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=acb17e07e34ab2b8317aa40cbb1b5e1d

# Varity L3 Network
NEXT_PUBLIC_VARITY_CHAIN_ID=33529
NEXT_PUBLIC_VARITY_RPC_URL=https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz
```

### Deployment Workflow

```bash
# All changes deploy automatically via GitHub
# 1. Make changes locally
# 2. Test build locally
npm run build

# 3. Commit and push to main branch
git add .
git commit -m "fix: description"
git push origin main

# 4. Vercel auto-deploys in 2-3 minutes
# 5. Check https://app.varity.so
```

---

## 🔴 PRIORITY TESTING CHECKLIST

### 1. OAuth Integrations (PRIORITY 1)

Test at https://app.varity.so/marketplace

- [ ] Click "Connect" on QuickBooks
- [ ] Click "Connect" on Google Workspace
- [ ] Click "Connect" on Microsoft 365
- [ ] Click "Connect" on Slack
- [ ] Verify redirects to provider's auth page
- [ ] Verify callback redirects back to /integrations

### 2. AI Assistant (PRIORITY 2)

Test at https://app.varity.so/ai-assistant

- [ ] Send a chat message
- [ ] Verify response returns from Together.ai (not error)
- [ ] Test with business data after OAuth is working

### 3. Filecoin Storage (PRIORITY 3)

After OAuth is working:

- [ ] Connect an integration
- [ ] Trigger data sync
- [ ] Verify data appears on Dashboard page
- [ ] Verify data appears on Integrations page
- [ ] Verify data appears on Analytics page

### 4. Settings Page (PRIORITY 4)

Test at https://app.varity.so/settings

- [ ] Profile settings save/update works
- [ ] Notification preferences work
- [ ] Security settings work
- [ ] All buttons are functional

### 5. 100% Integration (PRIORITY 5)

Test EVERY page:

| Page | URL | What to Test |
|------|-----|--------------|
| Dashboard | /dashboard | KPIs load, recent activity shows |
| Marketplace | /marketplace | Products display, Connect buttons work |
| Integrations | /integrations | Connected apps show, data displays |
| AI Assistant | /ai-assistant | Chat works, responses return |
| Analytics | /analytics | Charts load with data |
| Settings | /settings | All buttons/features work |
| Onboarding | /onboarding | Flow completes |

---

## CRITICAL RULES FOR FRONTEND DEVELOPMENT

### Code Quality (MUST FOLLOW)
```markdown
- ALWAYS run `npm run build` after editing files
- Fix ALL TypeScript errors before completing tasks
- Fix ALL ESLint warnings where possible
- Use proper TypeScript types (no `any` unless absolutely necessary)
- This step must NEVER be skipped
```

### After Making Frontend Changes
```bash
# 1. Build to check for errors
npm run build

# 2. If build fails, fix TypeScript errors

# 3. Run type check
npm run type-check

# 4. Test in browser
npm run dev
# Visit http://localhost:3001
```

---

## DIRECTORY STRUCTURE

```
src/
├── app/                           # Next.js App Router pages
│   ├── layout.tsx                 # Root layout (providers, fonts)
│   ├── page.tsx                   # Homepage (/)
│   ├── providers.tsx              # Context providers (Privy, thirdweb)
│   ├── globals.css                # Global styles
│   ├── error.tsx                  # Error boundary
│   ├── not-found.tsx              # 404 page
│   │
│   ├── dashboard/                 # Dashboard page (/dashboard)
│   │   └── page.tsx
│   │
│   ├── integrations/              # Integrations page (/integrations)
│   │   └── page.tsx               # OAuth provider connection UI
│   │
│   ├── marketplace/               # Marketplace page (/marketplace)
│   │   └── page.tsx
│   │
│   ├── ai-assistant/              # AI Chat page (/ai-assistant)
│   │   └── page.tsx
│   │
│   ├── analytics/                 # Analytics page (/analytics)
│   │   └── page.tsx
│   │
│   ├── settings/                  # Settings page (/settings)
│   │   └── page.tsx
│   │
│   ├── onboarding/                # Onboarding flow (/onboarding)
│   │   └── page.tsx
│   │
│   └── oauth/                     # OAuth callback handlers
│       └── callback/
│           └── [provider]/        # Dynamic route for all providers
│               └── page.tsx       # Callback handler (CRITICAL)
│
├── components/                    # React components
│   ├── ui/                        # Reusable UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── ...
│   │
│   ├── dashboard/                 # Dashboard-specific components
│   │   ├── DashboardStats.tsx
│   │   ├── RecentActivity.tsx
│   │   └── QuickActions.tsx
│   │
│   ├── marketplace/               # Marketplace components
│   │   ├── ProductCard.tsx
│   │   └── CategoryFilter.tsx
│   │
│   └── integrations/              # Integration components
│       ├── IntegrationCard.tsx
│       └── ConnectButton.tsx
│
├── hooks/                         # React hooks
│   ├── useWallet.ts               # Wallet connection hook
│   ├── useApi.ts                  # API client hook
│   └── useIntegrations.ts         # Integration status hook
│
├── lib/                           # Utility libraries
│   ├── errorHandling.ts           # Error handling utilities
│   ├── logger.ts                  # Logging utilities
│   ├── varity-chain.ts            # Varity L3 chain config
│   └── utils.ts                   # General utilities
│
├── services/                      # API client
│   └── apiClient.ts               # Backend API client (port 8002)
│
├── types/                         # TypeScript types
│   ├── index.ts                   # Main types export
│   ├── api.ts                     # API response types
│   └── integration.ts             # Integration types
│
├── contexts/                      # React contexts
│   └── WalletContext.tsx          # Wallet state context
│
├── constants/                     # Constants
│   └── index.ts                   # App constants
│
└── utils/                         # Additional utilities
    └── index.ts
```

---

## CRITICAL FILES AND PATTERNS

### app/oauth/callback/[provider]/page.tsx (CRITICAL FOR OAUTH)
```typescript
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function OAuthCallbackPage({
  params
}: {
  params: { provider: string }
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState("processing");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (code && state) {
      // Send to backend for token exchange
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/oauth/callback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: params.provider,
          code,
          state,
          wallet_address: localStorage.getItem("wallet_address"),
          redirect_uri: `${window.location.origin}/oauth/callback/${params.provider}`
        })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            router.push("/integrations?success=true");
          } else {
            router.push(`/integrations?error=${data.error}`);
          }
        })
        .catch(err => {
          router.push(`/integrations?error=${err.message}`);
        });
    }
  }, [searchParams, params.provider, router]);

  return <div>Processing OAuth callback...</div>;
}
```

### services/apiClient.ts - Backend API Client
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002";

export const apiClient = {
  async get(endpoint: string, params?: Record<string, string>) {
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    const response = await fetch(url.toString());
    return response.json();
  },

  async post(endpoint: string, data: unknown) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return response.json();
  }
};
```

### lib/varity-chain.ts - Varity L3 Configuration
```typescript
export const varietyChain = {
  id: 33529,
  name: "Varity L3 Testnet",
  network: "varity-testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH"
  },
  rpcUrls: {
    default: {
      http: ["https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz"]
    }
  },
  blockExplorers: {
    default: {
      name: "Explorer",
      url: "https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz"
    }
  }
};

// USDC on Varity L3 (6 decimals, NOT 18!)
export const USDC_ADDRESS = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";
export const USDC_DECIMALS = 6;
```

---

## ENVIRONMENT VARIABLES

### .env.local (Frontend)
```bash
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8002

# Privy Authentication
NEXT_PUBLIC_PRIVY_APP_ID=cmhwbozxu004fjr0cicfz0tf8

# thirdweb Web3
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=acb17e07e34ab2b8317aa40cbb1b5e1d

# Varity L3 Network
NEXT_PUBLIC_VARITY_CHAIN_ID=33529
NEXT_PUBLIC_VARITY_RPC_URL=https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz
```

---

## COMPONENT PATTERNS

### Page Component
```typescript
"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/services/apiClient";

export default function PageName() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get("/api/v1/endpoint")
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="p-6">
      {/* Page content */}
    </div>
  );
}
```

### Reusable Component
```typescript
interface ComponentProps {
  title: string;
  onClick?: () => void;
  children?: React.ReactNode;
}

export function Component({ title, onClick, children }: ComponentProps) {
  return (
    <div className="rounded-lg border p-4" onClick={onClick}>
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </div>
  );
}
```

---

## STYLING WITH TAILWIND

### Common Patterns
```typescript
// Card
<div className="rounded-lg border bg-white p-6 shadow-sm">

// Button
<button className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">

// Input
<input className="w-full rounded-md border px-3 py-2 focus:border-blue-500 focus:outline-none">

// Grid
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">

// Flex
<div className="flex items-center justify-between">
```

---

## OAUTH INTEGRATION FLOW

### 1. User clicks "Connect" on /integrations page
```typescript
// src/app/integrations/page.tsx
const handleConnect = async (provider: string) => {
  const walletAddress = // get from Privy/thirdweb

  const response = await apiClient.post(`/api/v1/oauth/start/${provider}`, {
    wallet_address: walletAddress
  });

  if (response.authorization_url) {
    // Redirect to provider's auth page
    window.location.href = response.authorization_url;
  }
};
```

### 2. Provider redirects back to /oauth/callback/[provider]
```typescript
// src/app/oauth/callback/[provider]/page.tsx
// This page extracts code and state from URL
// Sends to backend for token exchange
// Redirects to /integrations with success/error
```

### 3. Success redirect to /integrations
```typescript
// Check URL params for success/error
const success = searchParams.get("success");
const error = searchParams.get("error");

if (success) {
  showToast("Integration connected successfully!");
}
if (error) {
  showToast(`Error: ${error}`, "error");
}
```

---

## ERROR HANDLING

### lib/errorHandling.ts
```typescript
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function handleApiError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}
```

### lib/logger.ts
```typescript
class Logger {
  info(message: string, data?: unknown) {
    console.log(`[INFO] ${message}`, data || "");
  }

  error(message: string, error?: unknown) {
    console.error(`[ERROR] ${message}`, error || "");
  }

  warn(message: string, data?: unknown) {
    console.warn(`[WARN] ${message}`, data || "");
  }

  debug(message: string, data?: unknown) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[DEBUG] ${message}`, data || "");
    }
  }
}

export const logger = new Logger();
```

---

## TYPESCRIPT TYPES

### types/api.ts
```typescript
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface Integration {
  provider: string;
  connected: boolean;
  lastSync?: string;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  price_usdc: number;
  description: string;
}

export interface DashboardKpis {
  total_revenue: number;
  active_integrations: number;
  data_synced: number;
}
```

---

## TESTING

### Run Tests
```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# E2E tests (Playwright)
npm run test:e2e
```

### Test File Pattern
```typescript
// __tests__/component.test.tsx
import { render, screen } from "@testing-library/react";
import { Component } from "@/components/Component";

describe("Component", () => {
  it("renders correctly", () => {
    render(<Component title="Test" />);
    expect(screen.getByText("Test")).toBeInTheDocument();
  });
});
```

---

## COMMON ERRORS AND FIXES

### Error: "Module not found: Can't resolve '@/...'"
**Fix:** Check tsconfig.json has correct path aliases
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Error: "Hydration mismatch"
**Fix:** Wrap client-only code in useEffect or add "use client" directive

### Error: "Type 'X' is not assignable to type 'Y'"
**Fix:** Define proper TypeScript interfaces for all data

### Error: "Cannot read properties of undefined"
**Fix:** Add optional chaining and null checks
```typescript
const value = data?.nested?.property ?? "default";
```

---

## QUICK COMMANDS

```bash
# Development server
npm run dev                    # http://localhost:3001

# Production build
npm run build

# Type check
npm run type-check

# Lint
npm run lint

# Format code
npx prettier --write src/

# Install dependency
npm install package-name

# Run specific test
npm test -- --testPathPattern="filename"
```

---

## WHEN ADDING NEW PAGES

1. Create folder in `src/app/{page-name}/`
2. Add `page.tsx` with "use client" if needed
3. Create components in `src/components/{page-name}/`
4. Add types in `src/types/`
5. Add API calls to `services/apiClient.ts` if needed
6. Test in browser
7. Run `npm run build` to verify

---

## CRITICAL: Frontend Build Dependencies (FIXED Dec 7, 2025)

If `npm run build` fails with missing dependencies, here are the common fixes:

### Error: ESLint must be installed

```bash
# Symptom:
# "ESLint must be installed in order to run during builds"

# Fix:
npm install --save-dev eslint --legacy-peer-deps
```

### Error: Cannot find module '@mui/material'

```bash
# Symptom:
# "Module not found: Can't resolve '@mui/material'"

# Fix:
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled --legacy-peer-deps
```

### Why --legacy-peer-deps?

Some packages have conflicting peer dependencies. Using `--legacy-peer-deps` allows npm to install
despite these conflicts. This is safe for development and doesn't affect runtime behavior.

### After Installing Dependencies

Always verify the build passes:
```bash
npm run build

# If successful, you'll see:
# ✓ Compiled successfully
# ✓ Generating static pages
# ✓ Finalizing page optimization
```

---

## MULTI-TENANT SECURITY (CRITICAL)

**Full Documentation:** See main `/CLAUDE.md` for complete 4-layer security architecture.

### Quick Reference: How Authentication Binds to Storage

Each business owner that signs in gets a **unique wallet address** that becomes their identity for ALL storage operations:

```
Business Owner → Privy Login → Embedded Wallet → Storage/Encryption Key
ceo@acme.com  → Email/Google → 0x742d35Cc...   → All data encrypted with this wallet
```

### Critical Security Files in Frontend

| File | Purpose | Key Pattern |
|------|---------|-------------|
| `app/providers.tsx` | Wallet binding | `WalletSyncProvider` extracts wallet address |
| `components/OAuthButton.tsx` | Requires wallet | `wallet_address` sent with OAuth requests |
| `hooks/useWallet.ts` | Wallet state | Provides wallet to all components |

### How Frontend Ensures Security

**1. Wallet Required for OAuth** (`components/OAuthButton.tsx`):
```typescript
if (!walletConnected || !walletAddress) {
  setError('Please connect your wallet first to securely store OAuth credentials');
  return;
}

// Wallet address sent with ALL OAuth requests
body: JSON.stringify({ wallet_address: walletAddress }),
```

**2. Wallet Sync Provider** (`app/providers.tsx`):
```typescript
// Extracts wallet address for all operations
const primaryWallet = wallets[0];
if (authenticated && primaryWallet?.address) {
  setSyncState({ address: primaryWallet.address });  // Universal identity key
}
```

**3. All API Calls Include Wallet**:
```typescript
// Dashboard, integrations, AI - all require wallet_address
apiClient.get(`/api/v1/integrations/installed?wallet_address=${walletAddress}`);
apiClient.get(`/api/v1/dashboard/kpis?wallet_address=${walletAddress}`);
```

### Security Flow Summary

```
1. User signs in with email (ceo@company.com)
2. Privy creates embedded wallet (0x742d35Cc...)
3. All API calls include wallet_address parameter
4. Backend encrypts/stores data with wallet-derived key
5. Only this wallet can decrypt this business's data
```

---

## WEB3 INTEGRATION (Privy + thirdweb)

### Get Wallet Address
```typescript
import { usePrivy } from "@privy-io/react-auth";

function Component() {
  const { user, authenticated } = usePrivy();

  const walletAddress = user?.wallet?.address;

  return authenticated ? (
    <div>Connected: {walletAddress}</div>
  ) : (
    <button onClick={() => login()}>Connect Wallet</button>
  );
}
```

### Use thirdweb for Contracts
```typescript
import { useContract, useContractRead } from "@thirdweb-dev/react";

function Component() {
  const { contract } = useContract(USDC_ADDRESS);
  const { data: balance } = useContractRead(contract, "balanceOf", [walletAddress]);

  // Remember: USDC has 6 decimals, not 18!
  const formattedBalance = Number(balance) / 10**6;

  return <div>Balance: ${formattedBalance}</div>;
}
```
