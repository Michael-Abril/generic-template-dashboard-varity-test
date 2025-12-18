# CLAUDE.md - Frontend (Next.js 14)

**Last Updated:** December 18, 2025
**Framework:** Next.js 14 (App Router)
**Language:** TypeScript
**Styling:** Tailwind CSS
**Production:** https://app.varity.so (Vercel)

---

## CRITICAL: KNOWN ISSUES

### Files to Delete (Duplicates)

```bash
# These duplicate files MUST be deleted:
rm "src/components/integrations/google/ContactsList 2.tsx"
rm "src/components/integrations/google/DriveExplorer 2.tsx"
rm "src/components/integrations/google/DriveExplorer 3.tsx"
rm "src/components/integrations/google/GmailInbox 2.tsx"
rm "src/components/integrations/google/GmailInbox 3.tsx"
rm "src/components/integrations/google/GmailInbox 4.tsx"
rm "src/components/onboarding/OnboardingWizard 2.tsx"
rm "src/components/onboarding/steps/CompleteStep 2.tsx"
rm "src/components/onboarding/steps/WelcomeStep 2.tsx"
```

### Incomplete Features

| Feature | Location | Issue |
|---------|----------|-------|
| **USDC Purchase** | `MarketplaceContent.tsx:13-15` | Intentionally disabled (post-GTM) |
| **Data Import** | `Settings page` | UI exists, no file handler |
| **Document Upload** | `AIChat.tsx` | File input hidden, no handler |
| **Team Invites** | `Settings:397-422` | Simulates success locally |
| **Storage Usage** | `Settings:1156` | Hardcoded 5% |

---

## PAGE STATUS

### Fully Working

| Page | Component | Notes |
|------|-----------|-------|
| `/` | `page.tsx` | Hero, FAQ, marketing |
| `/onboarding` | `OnboardingWizard.tsx` | 6-step complete |
| `/ai-assistant` | `AIChat.tsx` | Chat functional |

### Data-Dependent

| Page | Component | Requires |
|------|-----------|----------|
| `/dashboard` | `DashboardContent.tsx` | Synced integration data |
| `/analytics` | `AnalyticsContent.tsx` | Synced integration data |
| `/marketplace` | `MarketplaceContent.tsx` | Backend products API |
| `/integrations` | `page.tsx` | Connected OAuth tokens |
| `/dashboard/tools/[integration]` | Dynamic page | Synced data per integration |

### Partially Complete

| Page | Component | Issues |
|------|-----------|--------|
| `/settings` | `page.tsx` | Team invites simulated, import broken |

---

## CODE QUALITY RULES (MUST FOLLOW)

```bash
# After EVERY change:
npm run build

# This catches:
# - TypeScript errors
# - ESLint errors
# - Build-time issues

# NEVER skip this step
```

---

## COMPONENT ARCHITECTURE

### Integration Tools Page (`/dashboard/tools/[integration]`)

This is the most complex page. It handles all 6 integrations:

```
src/app/dashboard/tools/[integration]/page.tsx
├── Loads integration data from backend
├── Passes data to integration-specific component
└── Components:
    ├── GoogleWorkspacePage.tsx
    │   ├── GmailInbox.tsx      ✅ Working
    │   ├── CalendarView.tsx    ✅ Working
    │   ├── DriveExplorer.tsx   ✅ Working
    │   ├── ContactsList.tsx    ⚠️ Form incomplete
    │   └── Tasks tab           Coming Soon
    ├── QuickBooksPage.tsx      ⚠️ Blocked (403)
    ├── MicrosoftPage.tsx       ❓ Untested
    ├── SlackPage.tsx           ❓ Untested
    ├── SalesforcePage.tsx      ❓ Untested
    └── HubSpotPage.tsx         ❓ Untested
```

### AI Assistant (`/ai-assistant`)

```
src/components/AIChat.tsx (2200+ lines)
├── State Management
│   ├── messages, conversations
│   ├── AI modes (standard, deep_research, analyze, document)
│   ├── Action panel (email, document creation)
│   └── Export, feedback, editing
├── Backend Integration
│   ├── POST /api/v1/ai/chat/general
│   ├── POST /api/v1/ai/query/combined
│   ├── POST /api/v1/ai/research
│   ├── GET/POST /api/v1/conversations/
│   └── POST /api/v1/integrations/{provider}/send-email
└── Known Issues
    ├── Document upload has no handler
    └── sendMessage modified to accept override parameter
```

### Onboarding (`/onboarding`)

Professional 6-step wizard optimized for 30-60 year old business owners.

```
src/components/onboarding/
├── OnboardingWizard.tsx       # Main controller (state, navigation)
├── OnboardingProgress.tsx     # Progress indicator (mobile + desktop)
├── TrialBadge.tsx            # Trial tier badge ("Bonus" for 30-day)
└── steps/
    ├── WelcomeStep.tsx        # Step 1: Trust signals + time estimate (~2 min)
    ├── CompanyProfileStep.tsx # Step 2: Email + auto-save indicator
    ├── IntegrationSelectStep.tsx # Step 3: Industry-based recommendations
    ├── OAuthConnectStep.tsx   # Step 4: Permissions preview + skip option
    ├── SyncingStep.tsx        # Step 5: Visual progress + skip after 5s
    └── CompleteStep.tsx       # Step 6: Celebration animation + AI preview
```

**Key UX Features (December 2025):**
- Trust signals: SOC 2 Compliant, 256-bit Encryption badges
- Time estimates: "~2 min", "Only 3 fields required"
- Auto-save indicator: "Your progress is auto-saved"
- Skip options on all steps to reduce abandonment
- Celebration animation: Animated checkmark + PartyPopper
- AI preview: Interactive sample queries before dashboard

---

## RECENT FIXES (December 18, 2025)

### Google Workspace Page

1. **Data Sync Performance**
   - Added `latest_only=True` parameter
   - Load time: 6+ minutes → ~26 seconds

2. **DriveExplorer.tsx**
   - Added search filtering with `useMemo`
   - Implemented all modal handlers (Preview, Share, Star, Rename, Move, Copy)
   - Fixed text visibility (gray-500 → gray-700)
   - Added empty state UI

3. **GmailInbox.tsx**
   - Fixed Archive handler (was only console.log)
   - Fixed Reply All and Forward handlers
   - Added search filtering
   - Improved sidebar styling

4. **GoogleWorkspacePage.tsx**
   - Added clickable stat cards on Home tab
   - Added Quick Actions section
   - Improved Tasks tab "Coming Soon" design

### AI Assistant

1. **Endpoint Path Fixes**
   - Google: `/api/v1/integrations/google/send-email`
   - Microsoft: `/api/v1/integrations/microsoft/mail/send`
   - OneDrive: `/api/v1/integrations/microsoft/onedrive/upload`

2. **Regenerate Response Fix**
   - Now auto-sends instead of just setting input
   - `sendMessage` accepts optional `overrideMessage` parameter

---

## DIRECTORY STRUCTURE

```
src/
├── app/                           # Next.js App Router
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Homepage
│   ├── providers.tsx              # Privy + thirdweb providers
│   ├── globals.css                # Global styles
│   ├── dashboard/                 # Dashboard pages
│   │   ├── page.tsx
│   │   └── tools/[integration]/   # Dynamic integration pages
│   ├── ai-assistant/page.tsx
│   ├── analytics/page.tsx
│   ├── integrations/page.tsx
│   ├── marketplace/page.tsx
│   ├── onboarding/page.tsx
│   ├── settings/page.tsx
│   └── oauth/callback/[provider]/ # OAuth callbacks
│
├── components/
│   ├── AIChat.tsx                 # AI Assistant (2200+ lines)
│   ├── pages/                     # Page content components
│   │   ├── DashboardContent.tsx
│   │   ├── MarketplaceContent.tsx
│   │   ├── AnalyticsContent.tsx
│   │   └── AIAssistantContent.tsx
│   ├── integrations/              # Integration-specific
│   │   ├── google/
│   │   │   ├── GoogleWorkspacePage.tsx
│   │   │   ├── GmailInbox.tsx
│   │   │   ├── CalendarView.tsx
│   │   │   ├── DriveExplorer.tsx
│   │   │   ├── ContactsList.tsx
│   │   │   ├── EmailComposer.tsx
│   │   │   └── EventForm.tsx
│   │   ├── quickbooks/
│   │   ├── microsoft/
│   │   ├── slack/
│   │   ├── salesforce/
│   │   └── hubspot/
│   ├── onboarding/                # 6-step wizard
│   ├── feedback/                  # Feedback system
│   └── ui/                        # Reusable UI components
│
├── hooks/                         # React hooks
├── lib/                           # Utilities
│   ├── errorHandling.ts
│   ├── logger.ts
│   └── varity-chain.ts           # L3 chain config
├── services/
│   └── apiClient.ts              # Backend API client
└── types/                         # TypeScript types
```

---

## API CLIENT PATTERN

```typescript
// services/apiClient.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Always include wallet_address for authenticated endpoints
const response = await fetch(
  `${API_BASE_URL}/api/v1/endpoint?wallet_address=${walletAddress}`
);

// POST with body
const response = await fetch(`${API_BASE_URL}/api/v1/endpoint`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ wallet_address: walletAddress, ...data })
});
```

---

## AUTHENTICATION FLOW

```
1. User signs in via Privy (email/Google/wallet)
2. Privy creates embedded wallet
3. Wallet address used as universal identity
4. All API calls include wallet_address parameter
5. Backend encrypts data with wallet-derived key
```

### Key Files

| File | Purpose |
|------|---------|
| `app/providers.tsx` | Privy + thirdweb setup |
| `hooks/useWallet.ts` | Wallet state hook |

---

## OAUTH CALLBACK PATTERN

```typescript
// app/oauth/callback/[provider]/page.tsx

// CRITICAL: Prevent double execution
const [hasProcessed, setHasProcessed] = useState(false);

useEffect(() => {
  const handleCallback = async () => {
    if (hasProcessed) return;  // OAuth codes are single-use!
    setHasProcessed(true);

    const code = searchParams.get('code');
    const state = searchParams.get('state');

    // Send to backend for token exchange
    await fetch(`${API_URL}/api/v1/oauth/callback`, {
      method: 'POST',
      body: JSON.stringify({
        provider,
        code,
        state,
        wallet_address: localStorage.getItem('wallet_address'),
        redirect_uri: `${window.location.origin}/oauth/callback/${provider}`
      })
    });
  };
  handleCallback();
}, [hasProcessed, searchParams, provider]);
```

---

## ENVIRONMENT VARIABLES

```bash
# .env.local (development)
NEXT_PUBLIC_API_URL=http://localhost:8002

# Vercel (production)
NEXT_PUBLIC_API_URL=https://generic-template-dashboard-production.up.railway.app
NEXT_PUBLIC_PRIVY_APP_ID=cmhwbozxu004fjr0cicfz0tf8
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=acb17e07e34ab2b8317aa40cbb1b5e1d
```

---

## COMMON PATTERNS

### Loading State

```typescript
const [loading, setLoading] = useState(true);
const [data, setData] = useState(null);

useEffect(() => {
  fetchData()
    .then(setData)
    .finally(() => setLoading(false));
}, []);

if (loading) return <Skeleton />;
```

### Search Filtering with useMemo

```typescript
const filteredItems = useMemo(() => {
  if (!searchQuery.trim()) return items;
  const query = searchQuery.toLowerCase();
  return items.filter(item =>
    item.name.toLowerCase().includes(query)
  );
}, [items, searchQuery]);
```

### Optimistic Updates

```typescript
// Update UI immediately, then sync with backend
const handleAction = async (id: string) => {
  // Optimistic update
  setItems(prev => prev.filter(item => item.id !== id));

  try {
    await fetch(`/api/endpoint/${id}`, { method: 'DELETE' });
  } catch (error) {
    // Revert on failure
    setItems(prev => [...prev, originalItem]);
    alert('Action failed');
  }
};
```

---

## TESTING

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Build (catches all errors)
npm run build

# Development server
npm run dev  # http://localhost:3001
```

---

## VARITY L3 NETWORK

```typescript
// lib/varity-chain.ts
{
  id: 33529,
  name: "Varity L3 Testnet",
  rpcUrl: "https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz",
  explorer: "https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz",
  usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d" // 6 decimals!
}
```

---

## WHEN MAKING CHANGES

### Before

1. Read this file
2. Check main `/CLAUDE.md` for context
3. `npm run build` to verify current state

### After

1. `npm run build` - MUST pass
2. Fix ALL TypeScript errors
3. Test in browser
4. Commit with descriptive message
5. Push to trigger Vercel deploy

### Never

- Skip the build step
- Use `any` type without justification
- Add console.log (use logger.ts)
- Create new files without checking for duplicates
