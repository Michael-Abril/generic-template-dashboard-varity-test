/**
 * MCP Data Fetcher
 *
 * Intelligently routes requests to RAG storage or Live API
 * based on backend data routing rules.
 *
 * Architecture:
 * - RAG_STORAGE: Historical data stored in Pinata + Qdrant
 * - LIVE_API: Real-time data fetched directly from integration
 * - HYBRID: Both historical (RAG) + recent (Live) merged
 */

export type DataDestination = 'rag' | 'live' | 'hybrid';

// Mirror backend routing rules (from backend/app/services/mcp_ingestion_service.py)
// MUST stay in sync with DATA_ROUTING_RULES
const DATA_ROUTING_RULES: Record<string, Record<string, DataDestination>> = {
  google: {
    drive_files: 'rag',
    contacts: 'rag',
    gmail: 'live',
    calendar: 'live',
    tasks: 'hybrid',
  },
  slack: {
    channels: 'live',
    messages: 'hybrid',
    users: 'rag',
    files: 'rag',
  },
  quickbooks: {
    invoices: 'hybrid',
    customers: 'rag',
    payments: 'live',
    reports: 'live',
    accounts: 'rag',
  },
  microsoft: {
    onedrive: 'rag',
    contacts: 'rag',
    mail: 'live',
    calendar: 'live',
    teams_messages: 'hybrid',
  },
  salesforce: {
    contacts: 'rag',
    leads: 'hybrid',
    opportunities: 'live',
    accounts: 'rag',
    activities: 'hybrid',
  },
  hubspot: {
    contacts: 'rag',
    deals: 'hybrid',
    companies: 'rag',
    emails: 'live',
    tasks: 'hybrid',
  },
};

export interface FetchOptions {
  integration: string;
  dataType: string;
  walletAddress: string;
  forceRefresh?: boolean;
}

export interface DataResponse<T extends { id?: string | number } = Record<string, unknown>> {
  success: boolean;
  data: T[];
  source: 'rag' | 'live' | 'hybrid' | 'cache';
  lastSync?: string;
  count: number;
  error?: string;
}

/**
 * Get the data routing destination for a given integration + data type
 */
export function getDataDestination(
  integration: string,
  dataType: string
): DataDestination {
  return DATA_ROUTING_RULES[integration]?.[dataType] || 'rag';
}

/**
 * Get all data types for an integration
 */
export function getIntegrationDataTypes(integration: string): string[] {
  return Object.keys(DATA_ROUTING_RULES[integration] || {});
}

/**
 * Fetch integration data with intelligent routing
 */
export async function fetchIntegrationData<T extends { id?: string | number } = Record<string, unknown>>(
  options: FetchOptions
): Promise<DataResponse<T>> {
  const { integration, dataType, walletAddress, forceRefresh = false } = options;

  // Determine destination
  const destination = getDataDestination(integration, dataType);

  try {
    if (destination === 'live') {
      return await fetchLiveData<T>({ integration, dataType, walletAddress });
    } else if (destination === 'hybrid') {
      return await fetchHybridData<T>({ integration, dataType, walletAddress });
    } else {
      return await fetchRAGData<T>({
        integration,
        dataType,
        walletAddress,
        forceRefresh,
      });
    }
  } catch (error) {
    return {
      success: false,
      data: [],
      source: 'cache',
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Fetch from live API (real-time, no storage)
 */
async function fetchLiveData<T extends { id?: string | number }>(options: {
  integration: string;
  dataType: string;
  walletAddress: string;
}): Promise<DataResponse<T>> {
  const { integration, dataType, walletAddress } = options;
  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  const response = await fetch(
    `${apiBase}/api/v1/integrations/${integration}/${dataType}?wallet_address=${walletAddress}`
  );

  if (!response.ok) {
    throw new Error(`Live API error: ${response.status}`);
  }

  const result = await response.json();
  const data = result.data || result.items || result[dataType] || [];

  return {
    success: true,
    data: Array.isArray(data) ? data : [data],
    source: 'live',
    count: Array.isArray(data) ? data.length : 1,
    lastSync: new Date().toISOString(),
  };
}

/**
 * Fetch from RAG storage (Pinata IPFS)
 */
async function fetchRAGData<T extends { id?: string | number }>(options: {
  integration: string;
  dataType: string;
  walletAddress: string;
  forceRefresh: boolean;
}): Promise<DataResponse<T>> {
  const { integration, dataType, walletAddress } = options;
  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  const response = await fetch(
    `${apiBase}/api/v1/integrations/${integration}/data?wallet_address=${walletAddress}&data_type=${dataType}`
  );

  if (!response.ok) {
    throw new Error(`RAG fetch error: ${response.status}`);
  }

  const result = await response.json();
  const data = result.data || [];

  return {
    success: true,
    data,
    source: 'rag',
    count: result.count || data.length,
    lastSync: data[0]?.data?.synced_at || data[0]?.uploaded_at,
  };
}

/**
 * Fetch hybrid (RAG + Live merged)
 */
async function fetchHybridData<T extends { id?: string | number }>(options: {
  integration: string;
  dataType: string;
  walletAddress: string;
}): Promise<DataResponse<T>> {
  const { integration, dataType, walletAddress } = options;

  // Fetch both in parallel
  const [ragResult, liveResult] = await Promise.allSettled([
    fetchRAGData<T>({
      integration,
      dataType,
      walletAddress,
      forceRefresh: false,
    }),
    fetchLiveData<T>({ integration, dataType, walletAddress }).catch(() => ({
      success: false,
      data: [] as T[],
      source: 'live' as const,
      count: 0,
    })),
  ]);

  const ragData =
    ragResult.status === 'fulfilled' ? ragResult.value.data : [];
  const liveData =
    liveResult.status === 'fulfilled' ? liveResult.value.data : [];

  // Merge and dedupe by ID (live data takes precedence)
  const merged = deduplicateById([...liveData, ...ragData]);

  return {
    success: true,
    data: merged,
    source: 'hybrid',
    count: merged.length,
    lastSync:
      ragResult.status === 'fulfilled' ? ragResult.value.lastSync : undefined,
  };
}

/**
 * Deduplicate array by 'id' field (first occurrence wins - live data is first)
 */
function deduplicateById<T extends { id?: string | number }>(items: T[]): T[] {
  const seen = new Set<string | number>();
  return items.filter((item) => {
    if (!item.id) return true;
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

/**
 * Trigger MCP sync for an integration
 */
export async function triggerMCPSync(options: {
  integration: string;
  walletAddress: string;
  dataTypes?: string[];
}): Promise<{ success: boolean; results?: Record<string, unknown>; error?: string }> {
  const { integration, walletAddress, dataTypes } = options;
  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  try {
    const response = await fetch(`${apiBase}/api/v1/sync/${integration}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet_address: walletAddress,
        data_types: dataTypes || getIntegrationDataTypes(integration),
      }),
    });

    if (!response.ok) {
      throw new Error(`MCP sync failed: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, results: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Sync failed',
    };
  }
}
