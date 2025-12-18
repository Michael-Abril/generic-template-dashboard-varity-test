# QUICK FIX GUIDE
## Top Priority Bugs - Fix These First

### 🔥 CRITICAL PRIORITY (Fix Before Any Deployment)

#### 1. Dashboard API Calls Missing Wallet Address (BUG-004, BUG-005)
**Impact**: Dashboard never shows real data
**Files**:
- `src/app/dashboard/page.tsx` (lines 72, 86, 100, 114)
- `src/services/dashboardService.ts` (lines 72-151)

**Fix**:
```typescript
// In dashboardService.ts - Update function signatures
export async function getKPIs(address: string): Promise<KPIResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/dashboard/kpis?wallet_address=${address}`);
  // ... rest
}

export async function getRevenueTrend(address: string): Promise<RevenueTrendResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/dashboard/revenue-trend?wallet_address=${address}`);
  // ... rest
}

export async function getRecentActivity(limit: number, address: string): Promise<RecentActivityResponse> {
  const params = new URLSearchParams();
  params.append('limit', limit.toString());
  params.append('wallet_address', address);
  const response = await fetch(`${API_BASE_URL}/api/v1/dashboard/recent-activity?${params}`);
  // ... rest
}

export async function getTopCustomers(limit: number, address: string): Promise<TopCustomersResponse> {
  const params = new URLSearchParams();
  params.append('limit', limit.toString());
  params.append('wallet_address', address);
  const response = await fetch(`${API_BASE_URL}/api/v1/dashboard/top-customers?${params}`);
  // ... rest
}

// In page.tsx - Update API calls
const kpisData = await getKPIs(address);
const trendData = await getRevenueTrend(address);
const activityData = await getRecentActivity(10, address);
const customersData = await getTopCustomers(5, address);
```

**Test**: Verify dashboard loads real data when wallet connected

---

#### 2. OAuth Callback Page Missing (BUG-034)
**Impact**: OAuth integration flow is completely broken
**File**: `src/app/oauth/callback/[provider]/page.tsx` (DOESN'T EXIST)

**Fix**: Create the file with this content:
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAddress } from '@thirdweb-dev/react';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export default function OAuthCallback({ params }: { params: { provider: string } }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const address = useAddress();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      // Check for error from OAuth provider
      const error = searchParams.get('error');
      if (error) {
        setStatus('error');
        setErrorMessage(`Authorization failed: ${error}`);
        setTimeout(() => router.push(`/integrations?error=${error}`), 3000);
        return;
      }

      // Get authorization code
      const code = searchParams.get('code');
      if (!code) {
        setStatus('error');
        setErrorMessage('No authorization code received');
        setTimeout(() => router.push('/integrations?error=no_code'), 3000);
        return;
      }

      if (!address) {
        setStatus('error');
        setErrorMessage('Wallet not connected');
        setTimeout(() => router.push('/integrations?error=no_wallet'), 3000);
        return;
      }

      try {
        // Exchange code for access token
        const response = await fetch(
          `${API_BASE_URL}/api/v1/oauth/callback/${params.provider}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code,
              wallet_address: address,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Callback failed: ${response.statusText}`);
        }

        const data = await response.json();

        setStatus('success');
        // Redirect to integrations page with success message
        setTimeout(() => {
          router.push(`/integrations?success=${params.provider}`);
        }, 2000);
      } catch (error: any) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setErrorMessage(error.message || 'Failed to complete authorization');
        setTimeout(() => router.push('/integrations?error=callback_failed'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, params.provider, address, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Completing Authorization...
            </h2>
            <p className="text-gray-600">
              Please wait while we securely store your credentials
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
              ✓
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Authorization Successful!
            </h2>
            <p className="text-gray-600">
              Redirecting you back to integrations...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
              ✗
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-2">
              Authorization Failed
            </h2>
            <p className="text-gray-600 mb-4">{errorMessage}</p>
            <p className="text-sm text-gray-500">
              Redirecting you back to integrations...
            </p>
          </>
        )}
      </div>
    </div>
  );
}
```

**Test**: Complete OAuth flow from integrations page

---

#### 3. Settings Don't Save (BUG-024, BUG-025)
**Impact**: Users can't save their settings
**File**: `src/app/settings/page.tsx` (lines 52-58, 32-44)

**Fix**:
```typescript
// Add settings load on mount
useEffect(() => {
  if (!address) return;

  const loadSettings = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/settings?wallet_address=${address}`
      );

      if (response.ok) {
        const settings = await response.json();
        setCompanyName(settings.company_name || 'My Business Inc.');
        setContactEmail(settings.contact_email || user?.email?.address || '');
        setIndustry(settings.industry || 'Technology');
        setTimezone(settings.timezone || 'America/New_York');
        setEmailNotifications(settings.email_notifications || {
          weeklyReport: true,
          integrationUpdates: true,
          billingAlerts: true,
          securityAlerts: true,
          newFeatures: false,
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  loadSettings();
}, [address, user]);

// Update handleSaveSettings
const handleSaveSettings = async () => {
  setSaving(true);

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet_address: address,
        company_name: companyName,
        contact_email: contactEmail,
        industry,
        timezone,
        email_notifications: emailNotifications,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to save settings');
    }

    alert('Settings saved successfully!');
  } catch (error: any) {
    console.error('Save settings error:', error);
    alert(`Failed to save settings: ${error.message}`);
  } finally {
    setSaving(false);
  }
};
```

**Test**: Change settings, save, reload page, verify settings persist

---

#### 4. Analytics Page Doesn't Use API Data (BUG-020)
**Impact**: Analytics shows fake data instead of real business metrics
**File**: `src/app/analytics/page.tsx` (lines 43-84, 93-149)

**Fix**:
```typescript
// Replace static data arrays with API response
const revenueData = analyticsData?.revenue_trend || [];
const expenseData = analyticsData?.expense_breakdown || [];
const customerGrowthData = analyticsData?.customer_growth || [];
const pipelineData = analyticsData?.sales_pipeline || [];
const topProductsData = analyticsData?.top_products || [];

// Update calculations to use API data
const totalExpenses = expenseData.reduce((sum: number, item: any) => sum + item.value, 0);
const maxRevenue = Math.max(...revenueData.map((d: any) => d.value), 1);
const maxCustomers = Math.max(...customerGrowthData.map((d: any) => d.value), 1);
const maxPipeline = Math.max(...pipelineData.map((d: any) => d.value), 1);

// Show loading state
if (loading) {
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    </Layout>
  );
}

// Show empty state if no data
if (!analyticsData || revenueData.length === 0) {
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            No Analytics Data Yet
          </h2>
          <p className="text-gray-600 mb-6">
            Connect integrations to start seeing your business analytics
          </p>
          <Link href="/marketplace" className="bg-blue-600 text-white px-6 py-3 rounded-lg">
            Browse Integrations
          </Link>
        </div>
      </div>
    </Layout>
  );
}
```

**Test**: Verify charts show real data from API

---

#### 5. Onboarding OAuth is Fake (BUG-030, BUG-031)
**Impact**: Onboarding flow doesn't actually connect integrations
**File**: `src/app/onboarding/page.tsx` (lines 68-121)

**Fix**:
```typescript
// Replace fake OAuth with real redirect
const handleConnectAccount = async () => {
  if (!address) {
    setError('Please sign in to your account first');
    return;
  }

  setError('');
  setStep('oauth');

  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const response = await fetch(
      `${backendUrl}/api/v1/oauth/start/${integrationSlug}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: address,
          redirect_uri: `${window.location.origin}/oauth/callback/${integrationSlug}?onboarding=true`,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to initiate OAuth');
    }

    const data = await response.json();

    if (data.authorization_url) {
      // Store integration slug for callback
      localStorage.setItem('pending_integration', integrationSlug);
      // Redirect to OAuth provider
      window.location.href = data.authorization_url;
    }
  } catch (err: any) {
    setError(err.message || 'Failed to connect account');
    setStep('welcome');
  }
};

// Replace fake sync with real polling
const startSyncProcess = async () => {
  setSyncing(true);

  try {
    // Start sync job
    const response = await fetch(
      `${API_BASE_URL}/api/v1/sync/${integrationSlug}/start`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: address }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to start sync');
    }

    const { job_id } = await response.json();

    // Poll for completion
    let complete = false;
    while (!complete) {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const statusResponse = await fetch(
        `${API_BASE_URL}/api/v1/sync/${job_id}/status`
      );

      const status = await statusResponse.json();

      setSyncProgress(status.progress || 0);
      setCurrentDataType(status.current_data_type || '');

      if (status.status === 'completed') {
        complete = true;
        setSyncProgress(100);
      } else if (status.status === 'failed') {
        throw new Error(status.error || 'Sync failed');
      }
    }

    setSyncing(false);
    setTimeout(() => setStep('complete'), 1000);
  } catch (error: any) {
    setSyncing(false);
    setError(error.message || 'Sync failed');
    setStep('welcome');
  }
};
```

**Update OAuth Callback**: Handle onboarding=true query param:
```typescript
// In oauth/callback/[provider]/page.tsx
const onboarding = searchParams.get('onboarding');

if (status === 'success') {
  if (onboarding) {
    // Return to onboarding to continue sync
    router.push(`/onboarding?integration=${params.provider}&step=syncing`);
  } else {
    // Normal flow to integrations
    router.push(`/integrations?success=${params.provider}`);
  }
}
```

**Test**: Complete full onboarding flow from marketplace

---

### ⚡ HIGH PRIORITY (Fix Next)

#### 6. AI Assistant Conversation History (BUG-016, BUG-17, BUG-18, BUG-19)
**Files**: `src/app/ai-assistant/page.tsx`

Quick fixes:
```typescript
// Load conversations from API
useEffect(() => {
  if (!address) return;

  const loadConversations = async () => {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/ai/conversations?wallet_address=${address}`
    );
    const data = await response.json();
    setConversations(data.conversations || []);
  };

  loadConversations();
}, [address]);

// Load conversation messages
const handleSelectConversation = async (conversationId: string) => {
  setSelectedConversation(conversationId);

  const response = await fetch(
    `${API_BASE_URL}/api/v1/ai/conversations/${conversationId}/messages`
  );
  const data = await response.json();
  // Pass messages to AIChat component
  setMessages(data.messages || []);
};
```

#### 7. Team Management Persistence (BUG-26)
**File**: `src/app/settings/page.tsx`

Add handlers:
```typescript
const handleRoleChange = async (memberEmail: string, newRole: string) => {
  try {
    await fetch(`${API_BASE_URL}/api/v1/team/members`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet_address: address,
        member_email: memberEmail,
        role: newRole,
      }),
    });
    // Reload team members
  } catch (error) {
    alert('Failed to update team member');
  }
};
```

---

### 🔧 MEDIUM PRIORITY (Fix When Possible)

#### 8. Integration Status Error Handling (BUG-12)
Add toast notifications for failed OAuth status checks

#### 9. Purchase Modal State (BUG-8)
Clear all state when modal closes

#### 10. Manual Sync Reload (BUG-14)
Replace window.location.reload() with data refresh

#### 11. Custom Date Range (BUG-21)
Add Apply button handler to trigger analytics fetch

#### 12. Accessibility Labels (BUG-38, BUG-39, BUG-40)
Add aria-label to all emoji icons and interactive elements

---

## Testing Checklist After Fixes

- [ ] Dashboard loads real data when wallet connected
- [ ] OAuth flow completes and stores credentials
- [ ] Settings save and persist across page reloads
- [ ] Analytics charts show API data
- [ ] Onboarding flow connects real integration
- [ ] AI conversation history loads from backend
- [ ] Team management changes persist
- [ ] All error messages visible to users
- [ ] Accessibility labels on all icons
- [ ] No console errors in browser

---

## Backend API Endpoints Required

Make sure these endpoints exist in your backend:

### Dashboard
- `GET /api/v1/dashboard/kpis?wallet_address={address}`
- `GET /api/v1/dashboard/revenue-trend?wallet_address={address}`
- `GET /api/v1/dashboard/recent-activity?wallet_address={address}&limit=10`
- `GET /api/v1/dashboard/top-customers?wallet_address={address}&limit=5`

### Settings
- `GET /api/v1/settings?wallet_address={address}`
- `POST /api/v1/settings` (body: {wallet_address, company_name, ...})

### Analytics
- `GET /api/v1/dashboard/analytics?wallet_address={address}&period={mtd|qtd|ytd|custom}&start_date={date}&end_date={date}`

### AI Conversations
- `GET /api/v1/ai/conversations?wallet_address={address}`
- `GET /api/v1/ai/conversations/{id}/messages`

### Team
- `GET /api/v1/team/members?wallet_address={address}`
- `PATCH /api/v1/team/members` (body: {wallet_address, member_email, role})
- `DELETE /api/v1/team/members` (body: {wallet_address, member_email})

### Sync
- `POST /api/v1/sync/{integration}/start` (body: {wallet_address})
- `GET /api/v1/sync/{job_id}/status`

---

**Good luck with the fixes! The foundation is solid - these are all fixable issues.**
