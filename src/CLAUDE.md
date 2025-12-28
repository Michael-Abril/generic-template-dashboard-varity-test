# CLAUDE.md - Frontend (Next.js 14)

**Last Updated:** December 26, 2025
**Framework:** Next.js 14 (App Router)
**Language:** TypeScript
**Styling:** Tailwind CSS
**Production:** https://app.varity.so (Vercel)

---

## KNOWN ISSUES

### Incomplete Features

| Feature | Location | Issue |
|---------|----------|-------|
| **Data Import** | `Settings page` | Shows "Coming Soon" badge |
| **Analytics Mock Data** | `AnalyticsContent.tsx` | Uses mock generators instead of real API data |

### ✅ Resolved (December 26, 2025)

| Feature | Resolution |
|---------|------------|
| Document Upload | **WORKING** - Click-to-upload functional, drag-drop added |
| Pinata Gateway | Switched to dedicated gateway `varity.mypinata.cloud` (no rate limits) |
| Slack OAuth | Fixed token access (`oauth_token.access_token` property) |
| Deduplication | Removed 21 duplicate/dead files |

### ✅ Resolved (December 23, 2025)

| Feature | Resolution |
|---------|------------|
| Duplicate component files | Deleted 9 duplicate files |
| USDC Purchase code | Removed from marketplace (OAuth-only) |
| Storage usage hardcoded | Replaced with decentralized storage info |
| Team invites | Frontend makes proper API calls |

---

## PAGE STATUS

### Fully Working

| Page | Component | Notes |
|------|-----------|-------|
| `/` | `page.tsx` | Hero, FAQ, marketing |
| `/onboarding` | `OnboardingWizard.tsx` | 6-step complete |
| `/ai-assistant` | `AIChat.tsx` | Chat functional |
| `/dashboard` | `DashboardContent.tsx` | Clean redesigned UI with AI insights |
| `/marketplace` | `MarketplaceContent.tsx` | OAuth-only connections |
| `/settings` | `page.tsx` | All tabs work, data import "Coming Soon" |

### Data-Dependent

| Page | Component | Requires |
|------|-----------|----------|
| `/analytics` | `AnalyticsContent.tsx` | Synced integration data |
| `/integrations` | `page.tsx` | Connected OAuth tokens |
| `/dashboard/tools/[integration]` | Dynamic page | Synced data per integration |

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
    ├── QuickBooksPage.tsx      ✅ Production ready
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
│   ├── POST /api/v1/ai/upload/document (file extraction)
│   ├── POST /api/v1/ai/analyze/document (AI analysis)
│   └── POST /api/v1/integrations/{provider}/send-email
├── Document Upload (WORKING - Dec 26)
│   ├── handleFileUpload() - Validates & extracts text
│   ├── analyzeDocument() - Sends to AI for analysis
│   ├── Supports: PDF, DOCX, TXT, MD, CSV, JSON, XML, HTML
│   └── Analysis types: summary, key_points, sentiment, extraction, action_items
└── Notes
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

## RECENT FIXES (December 23, 2025)

### Dashboard Redesign
- Clean "Business Overview" UI with AI Insight widget
- KPI cards clickable (link to Analytics)
- Revenue Trend chart with Recharts
- Recent Activity feed (limited to 7 items)
- Single clean empty state when no integrations

### Marketplace Cleanup
- Removed all USDC purchase-related code
- OAuth-only connection flow
- Simplified state management (removed tier selection, purchase modals)
- Updated component description

### Settings Page Improvements
- Data Import: Changed to "Coming Soon" with disabled UI
- Storage: Replaced fake progress bar with decentralized storage info card
- Removed unused import-related state and handlers

### Code Cleanup
- Deleted 9 duplicate component files
- Fixed text visibility (`text-gray-900`) across multiple pages
- Added KPI data transformer in `dashboardService.ts`

---

## RECENT FIXES (December 26, 2025)

### Pinata Gateway Fix (CRITICAL)
- Switched from public gateway to dedicated gateway `varity.mypinata.cloud`
- Public gateway had rate limits causing 429 errors
- Added `PINATA_GATEWAY_URL` env var support in backend config
- Added retry logic with exponential backoff

### Slack OAuth Fix
- Fixed `'OAuthToken' object has no attribute 'encrypted_token'` error
- Changed all Slack endpoints to use `oauth_token.access_token` property
- Required scopes: channels:read, channels:history, groups:read, groups:history, users:read, files:read, chat:write

### Deduplication Phase (21 files removed)
- `src/components/integrations/quickbooks/_full/` (10 files) - Dead code
- `src/lib/analytics 2.ts` - Duplicate with space in name
- `src/components/integrations/hubspot/index.tsx` - Redundant (kept index.ts)
- Multiple backend adapter stubs and unused services

### Document Upload Verification
- **Status:** FULLY WORKING (not incomplete as previously documented)
- Click-to-upload: Working via hidden file input + button trigger
- Backend extraction: PDF (PyMuPDF), DOCX (python-docx), text files
- Analysis modes: summary, key_points, sentiment, extraction, action_items

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
