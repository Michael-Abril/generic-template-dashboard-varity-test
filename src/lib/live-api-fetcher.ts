/**
 * Live API Fetcher - CONCERN #1 ONLY
 *
 * Direct calls to backend OAuth endpoints for page display.
 * This is completely separate from mcp-data-fetcher.ts (CONCERN #2 - AI/RAG).
 *
 * Data flow:
 * Frontend → Backend Live API → OAuth Provider → JSON Response → Frontend Display
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://generic-template-dashboard-production.up.railway.app';

/**
 * Standard data format returned by live API fetcher
 * Matches the IntegrationData interface expected by page.tsx
 */
export interface LiveDataResult {
  cid: string;
  data_type: string;
  data: {
    records: Array<Record<string, unknown>>;
    record_count: number;
    synced_at: string;
    source: 'live';
  };
  uploaded_at: string;
}

export interface FetchResult {
  success: boolean;
  data: LiveDataResult[];
  lastSync: string | null;
  error?: string;
}

/**
 * Helper to transform API response into LiveDataResult format
 */
function transformToLiveDataResult(
  dataType: string,
  records: Array<Record<string, unknown>>
): LiveDataResult {
  const now = new Date().toISOString();
  return {
    cid: `live_${dataType}`,
    data_type: dataType,
    data: {
      records,
      record_count: records.length,
      synced_at: now,
      source: 'live',
    },
    uploaded_at: now,
  };
}

/**
 * Helper to safely fetch and parse JSON
 */
async function safeFetch(url: string): Promise<{ success: boolean; data: unknown; error?: string }> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      // Check for auth errors
      if (response.status === 401 || response.status === 403) {
        return { success: false, data: [], error: 'Authentication expired. Please reconnect.' };
      }
      return { success: false, data: [], error: `HTTP ${response.status}` };
    }
    const data = await response.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, data: [], error: err instanceof Error ? err.message : 'Network error' };
  }
}

/**
 * Extract records array from various API response formats
 */
function extractRecords(response: unknown, fallbackKeys: string[]): Array<Record<string, unknown>> {
  if (!response || typeof response !== 'object') return [];
  const obj = response as Record<string, unknown>;

  // Try direct array
  if (Array.isArray(response)) return response;

  // Try common keys
  for (const key of ['data', 'items', 'records', ...fallbackKeys]) {
    if (Array.isArray(obj[key])) return obj[key] as Array<Record<string, unknown>>;
  }

  // Try success response pattern
  if (obj.success && Array.isArray(obj.data)) {
    return obj.data as Array<Record<string, unknown>>;
  }

  return [];
}

// ============================================================================
// GOOGLE WORKSPACE
// ============================================================================

async function fetchGoogleLiveData(walletAddress: string): Promise<FetchResult> {
  const results: LiveDataResult[] = [];
  let hasError = false;
  let errorMessage = '';

  // Fetch integration status first to get real last_sync timestamp
  const statusRes = await safeFetch(`${API_BASE}/api/v1/integrations/google/status?wallet_address=${walletAddress}`);
  let lastSync: string | null = null;
  if (statusRes.success && statusRes.data && typeof statusRes.data === 'object') {
    const statusData = statusRes.data as { last_sync?: string | null };
    lastSync = statusData.last_sync || null;
  }

  // Fetch all Google data types in parallel
  const [emailsRes, eventsRes, filesRes, contactsRes] = await Promise.allSettled([
    safeFetch(`${API_BASE}/api/v1/integrations/google/emails?wallet_address=${walletAddress}&max_results=50`),
    safeFetch(`${API_BASE}/api/v1/integrations/google/events?wallet_address=${walletAddress}`),
    safeFetch(`${API_BASE}/api/v1/integrations/google/files?wallet_address=${walletAddress}&page_size=50`),
    safeFetch(`${API_BASE}/api/v1/integrations/google/contacts?wallet_address=${walletAddress}`),
  ]);

  // Process emails (Gmail)
  if (emailsRes.status === 'fulfilled' && emailsRes.value.success) {
    const emails = extractRecords(emailsRes.value.data, ['emails', 'messages']);
    results.push(transformToLiveDataResult('gmail', emails));
  } else if (emailsRes.status === 'fulfilled' && !emailsRes.value.success) {
    hasError = true;
    errorMessage = emailsRes.value.error || 'Failed to fetch emails';
  }

  // Process events (Calendar)
  if (eventsRes.status === 'fulfilled' && eventsRes.value.success) {
    const events = extractRecords(eventsRes.value.data, ['events']);
    results.push(transformToLiveDataResult('calendar', events));
  }

  // Process files (Drive)
  if (filesRes.status === 'fulfilled' && filesRes.value.success) {
    const files = extractRecords(filesRes.value.data, ['files']);
    results.push(transformToLiveDataResult('drive_files', files));
  }

  // Process contacts
  if (contactsRes.status === 'fulfilled' && contactsRes.value.success) {
    const contacts = extractRecords(contactsRes.value.data, ['contacts']);
    results.push(transformToLiveDataResult('contacts', contacts));
  }

  return {
    success: results.length > 0,
    data: results,
    lastSync: lastSync, // Use real timestamp from backend status endpoint
    error: hasError ? errorMessage : undefined,
  };
}

// ============================================================================
// MICROSOFT 365
// ============================================================================

async function fetchMicrosoftLiveData(walletAddress: string): Promise<FetchResult> {
  const results: LiveDataResult[] = [];

  // Fetch integration status first to get real last_sync timestamp
  const statusRes = await safeFetch(`${API_BASE}/api/v1/integrations/microsoft/status?wallet_address=${walletAddress}`);
  let lastSync: string | null = null;
  if (statusRes.success && statusRes.data && typeof statusRes.data === 'object') {
    const statusData = statusRes.data as { last_sync?: string | null };
    lastSync = statusData.last_sync || null;
  }

  // Fetch all Microsoft data types in parallel
  const [mailRes, eventsRes, filesRes, contactsRes] = await Promise.allSettled([
    safeFetch(`${API_BASE}/api/v1/integrations/microsoft/mail/messages?wallet_address=${walletAddress}&top=50`),
    safeFetch(`${API_BASE}/api/v1/integrations/microsoft/calendar/events?wallet_address=${walletAddress}`),
    safeFetch(`${API_BASE}/api/v1/integrations/microsoft/onedrive/files?wallet_address=${walletAddress}`),
    safeFetch(`${API_BASE}/api/v1/integrations/microsoft/contacts?wallet_address=${walletAddress}`),
  ]);

  // Process mail (Outlook)
  if (mailRes.status === 'fulfilled' && mailRes.value.success) {
    const messages = extractRecords(mailRes.value.data, ['messages', 'value']);
    results.push(transformToLiveDataResult('mail', messages));
  }

  // Process events (Calendar)
  if (eventsRes.status === 'fulfilled' && eventsRes.value.success) {
    const events = extractRecords(eventsRes.value.data, ['events', 'value']);
    results.push(transformToLiveDataResult('calendar', events));
  }

  // Process files (OneDrive)
  if (filesRes.status === 'fulfilled' && filesRes.value.success) {
    const files = extractRecords(filesRes.value.data, ['files', 'value']);
    results.push(transformToLiveDataResult('onedrive', files));
  }

  // Process contacts
  if (contactsRes.status === 'fulfilled' && contactsRes.value.success) {
    const contacts = extractRecords(contactsRes.value.data, ['contacts', 'value']);
    results.push(transformToLiveDataResult('contacts', contacts));
  }

  return {
    success: results.length > 0,
    data: results,
    lastSync: lastSync, // Use real timestamp from backend status endpoint
  };
}

// ============================================================================
// SLACK
// ============================================================================

async function fetchSlackLiveData(walletAddress: string): Promise<FetchResult> {
  const results: LiveDataResult[] = [];

  // Fetch integration status first to get real last_sync timestamp
  const statusRes = await safeFetch(`${API_BASE}/api/v1/integrations/slack/status?wallet_address=${walletAddress}`);
  let lastSync: string | null = null;
  if (statusRes.success && statusRes.data && typeof statusRes.data === 'object') {
    const statusData = statusRes.data as { last_sync?: string | null };
    lastSync = statusData.last_sync || null;
  }

  // Fetch all Slack data types in parallel
  const [channelsRes, usersRes] = await Promise.allSettled([
    safeFetch(`${API_BASE}/api/v1/integrations/slack/channels?wallet_address=${walletAddress}`),
    safeFetch(`${API_BASE}/api/v1/integrations/slack/users?wallet_address=${walletAddress}`),
  ]);

  // Process channels
  if (channelsRes.status === 'fulfilled' && channelsRes.value.success) {
    const channels = extractRecords(channelsRes.value.data, ['channels']);
    results.push(transformToLiveDataResult('channels', channels));
  }

  // Process users
  if (usersRes.status === 'fulfilled' && usersRes.value.success) {
    const users = extractRecords(usersRes.value.data, ['users', 'members']);
    results.push(transformToLiveDataResult('users', users));
  }

  return {
    success: results.length > 0,
    data: results,
    lastSync: lastSync, // Use real timestamp from backend status endpoint
  };
}

// ============================================================================
// QUICKBOOKS
// ============================================================================

async function fetchQuickBooksLiveData(walletAddress: string): Promise<FetchResult> {
  const results: LiveDataResult[] = [];

  // Fetch integration status first to get real last_sync timestamp
  const statusRes = await safeFetch(`${API_BASE}/api/v1/integrations/quickbooks/status?wallet_address=${walletAddress}`);
  let lastSync: string | null = null;
  if (statusRes.success && statusRes.data && typeof statusRes.data === 'object') {
    const statusData = statusRes.data as { last_sync?: string | null };
    lastSync = statusData.last_sync || null;
  }

  // Fetch all QuickBooks data types in parallel
  const [invoicesRes, customersRes, expensesRes, vendorsRes, paymentsRes, accountsRes] = await Promise.allSettled([
    safeFetch(`${API_BASE}/api/v1/quickbooks/invoices?wallet_address=${walletAddress}`),
    safeFetch(`${API_BASE}/api/v1/quickbooks/customers?wallet_address=${walletAddress}`),
    safeFetch(`${API_BASE}/api/v1/quickbooks/expenses?wallet_address=${walletAddress}`),
    safeFetch(`${API_BASE}/api/v1/quickbooks/vendors?wallet_address=${walletAddress}`),
    safeFetch(`${API_BASE}/api/v1/quickbooks/payments?wallet_address=${walletAddress}`),
    safeFetch(`${API_BASE}/api/v1/quickbooks/accounts?wallet_address=${walletAddress}`),
  ]);

  // Process invoices
  if (invoicesRes.status === 'fulfilled' && invoicesRes.value.success) {
    const invoices = extractRecords(invoicesRes.value.data, ['invoices', 'Invoice']);
    results.push(transformToLiveDataResult('invoices', invoices));
  }

  // Process customers
  if (customersRes.status === 'fulfilled' && customersRes.value.success) {
    const customers = extractRecords(customersRes.value.data, ['customers', 'Customer']);
    results.push(transformToLiveDataResult('customers', customers));
  }

  // Process expenses
  if (expensesRes.status === 'fulfilled' && expensesRes.value.success) {
    const expenses = extractRecords(expensesRes.value.data, ['expenses', 'Purchase']);
    results.push(transformToLiveDataResult('expenses', expenses));
  }

  // Process vendors
  if (vendorsRes.status === 'fulfilled' && vendorsRes.value.success) {
    const vendors = extractRecords(vendorsRes.value.data, ['vendors', 'Vendor']);
    results.push(transformToLiveDataResult('vendors', vendors));
  }

  // Process payments
  if (paymentsRes.status === 'fulfilled' && paymentsRes.value.success) {
    const payments = extractRecords(paymentsRes.value.data, ['payments', 'Payment']);
    results.push(transformToLiveDataResult('payments', payments));
  }

  // Process accounts
  if (accountsRes.status === 'fulfilled' && accountsRes.value.success) {
    const accounts = extractRecords(accountsRes.value.data, ['accounts', 'Account']);
    results.push(transformToLiveDataResult('accounts', accounts));
  }

  return {
    success: results.length > 0,
    data: results,
    lastSync: lastSync, // Use real timestamp from backend status endpoint
  };
}

// ============================================================================
// SALESFORCE
// ============================================================================

async function fetchSalesforceLiveData(walletAddress: string): Promise<FetchResult> {
  const results: LiveDataResult[] = [];

  // Fetch integration status first to get real last_sync timestamp
  const statusRes = await safeFetch(`${API_BASE}/api/v1/integrations/salesforce/status?wallet_address=${walletAddress}`);
  let lastSync: string | null = null;
  if (statusRes.success && statusRes.data && typeof statusRes.data === 'object') {
    const statusData = statusRes.data as { last_sync?: string | null };
    lastSync = statusData.last_sync || null;
  }

  // Fetch all Salesforce data types in parallel
  const [contactsRes, leadsRes, opportunitiesRes, accountsRes] = await Promise.allSettled([
    safeFetch(`${API_BASE}/api/v1/salesforce/contacts?wallet_address=${walletAddress}`),
    safeFetch(`${API_BASE}/api/v1/salesforce/leads?wallet_address=${walletAddress}`),
    safeFetch(`${API_BASE}/api/v1/salesforce/opportunities?wallet_address=${walletAddress}`),
    safeFetch(`${API_BASE}/api/v1/salesforce/accounts?wallet_address=${walletAddress}`),
  ]);

  // Process contacts
  if (contactsRes.status === 'fulfilled' && contactsRes.value.success) {
    const contacts = extractRecords(contactsRes.value.data, ['contacts', 'records']);
    results.push(transformToLiveDataResult('contacts', contacts));
  }

  // Process leads
  if (leadsRes.status === 'fulfilled' && leadsRes.value.success) {
    const leads = extractRecords(leadsRes.value.data, ['leads', 'records']);
    results.push(transformToLiveDataResult('leads', leads));
  }

  // Process opportunities
  if (opportunitiesRes.status === 'fulfilled' && opportunitiesRes.value.success) {
    const opportunities = extractRecords(opportunitiesRes.value.data, ['opportunities', 'records']);
    results.push(transformToLiveDataResult('opportunities', opportunities));
  }

  // Process accounts
  if (accountsRes.status === 'fulfilled' && accountsRes.value.success) {
    const accounts = extractRecords(accountsRes.value.data, ['accounts', 'records']);
    results.push(transformToLiveDataResult('accounts', accounts));
  }

  return {
    success: results.length > 0,
    data: results,
    lastSync: lastSync, // Use real timestamp from backend status endpoint
  };
}

// ============================================================================
// HUBSPOT
// ============================================================================

async function fetchHubSpotLiveData(walletAddress: string): Promise<FetchResult> {
  const results: LiveDataResult[] = [];

  // Fetch integration status first to get real last_sync timestamp
  const statusRes = await safeFetch(`${API_BASE}/api/v1/integrations/hubspot/status?wallet_address=${walletAddress}`);
  let lastSync: string | null = null;
  if (statusRes.success && statusRes.data && typeof statusRes.data === 'object') {
    const statusData = statusRes.data as { last_sync?: string | null };
    lastSync = statusData.last_sync || null;
  }

  // Fetch all HubSpot data types in parallel
  const [contactsRes, companiesRes, dealsRes] = await Promise.allSettled([
    safeFetch(`${API_BASE}/api/v1/hubspot/contacts?wallet_address=${walletAddress}`),
    safeFetch(`${API_BASE}/api/v1/hubspot/companies?wallet_address=${walletAddress}`),
    safeFetch(`${API_BASE}/api/v1/hubspot/deals?wallet_address=${walletAddress}`),
  ]);

  // Process contacts
  if (contactsRes.status === 'fulfilled' && contactsRes.value.success) {
    const contacts = extractRecords(contactsRes.value.data, ['contacts', 'results']);
    results.push(transformToLiveDataResult('contacts', contacts));
  }

  // Process companies
  if (companiesRes.status === 'fulfilled' && companiesRes.value.success) {
    const companies = extractRecords(companiesRes.value.data, ['companies', 'results']);
    results.push(transformToLiveDataResult('companies', companies));
  }

  // Process deals
  if (dealsRes.status === 'fulfilled' && dealsRes.value.success) {
    const deals = extractRecords(dealsRes.value.data, ['deals', 'results']);
    results.push(transformToLiveDataResult('deals', deals));
  }

  return {
    success: results.length > 0,
    data: results,
    lastSync: lastSync, // Use real timestamp from backend status endpoint
  };
}

// ============================================================================
// UNIFIED FETCHER - Main entry point
// ============================================================================

/**
 * Fetch live data for any integration
 * This is the main entry point for CONCERN #1 (page display)
 */
export async function fetchLiveIntegrationData(
  integration: string,
  walletAddress: string
): Promise<FetchResult> {
  switch (integration) {
    case 'google':
      return fetchGoogleLiveData(walletAddress);
    case 'microsoft':
      return fetchMicrosoftLiveData(walletAddress);
    case 'slack':
      return fetchSlackLiveData(walletAddress);
    case 'quickbooks':
      return fetchQuickBooksLiveData(walletAddress);
    case 'salesforce':
      return fetchSalesforceLiveData(walletAddress);
    case 'hubspot':
      return fetchHubSpotLiveData(walletAddress);
    default:
      return {
        success: false,
        data: [],
        lastSync: null,
        error: `Unknown integration: ${integration}`,
      };
  }
}
