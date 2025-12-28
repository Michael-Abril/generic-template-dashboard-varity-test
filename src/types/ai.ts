/**
 * AI Enhancement Types for Varity Dashboard
 *
 * These types support the 5 AI enhancements:
 * 1. Smart Mode Selection
 * 2. Better Context Preview
 * 3. Source Highlighting (Citations)
 * 4. Quick Actions from AI Responses
 * 5. Conversation Memory Improvements
 *
 * Created: December 28, 2025
 * Terminal 4: AI Enhancement Team
 */

// ============================================================================
// AI Mode Types
// ============================================================================

/** Available AI modes in the chat interface */
export type AIMode = 'standard' | 'deep_research' | 'analyze' | 'document';

/** Mode display configuration */
export interface AIModeConfig {
  id: AIMode;
  name: string;
  description: string;
  icon: string;
  color: string;
  keywords: string[];
}

/** Mode configuration map */
export const AI_MODE_CONFIGS: Record<AIMode, AIModeConfig> = {
  standard: {
    id: 'standard',
    name: 'Standard',
    description: 'Quick answers from your business data',
    icon: 'MessageSquare',
    color: 'blue',
    keywords: ['what', 'how', 'when', 'where', 'who', 'tell me', 'show me', 'list']
  },
  deep_research: {
    id: 'deep_research',
    name: 'Deep Research',
    description: 'Comprehensive research with optional web search',
    icon: 'Search',
    color: 'purple',
    keywords: ['research', 'find out', 'look up', 'investigate', 'discover', 'search for', 'explore']
  },
  analyze: {
    id: 'analyze',
    name: 'Deep Analysis',
    description: 'Executive-level reports and insights',
    icon: 'BarChart2',
    color: 'emerald',
    keywords: ['analyze', 'report', 'compare', 'breakdown', 'summarize', 'assessment', 'evaluate', 'trend', 'insight']
  },
  document: {
    id: 'document',
    name: 'Document',
    description: 'Upload and analyze documents',
    icon: 'FileText',
    color: 'amber',
    keywords: []  // Triggered by file attachment, not keywords
  }
};

// ============================================================================
// Intent Detection Types
// ============================================================================

/** Intent classification result */
export interface IntentClassification {
  /** Detected AI mode */
  mode: AIMode;
  /** Confidence score (0-1) */
  confidence: number;
  /** Keywords that triggered this detection */
  triggers: string[];
  /** Whether this was auto-selected or user-chosen */
  autoSelected: boolean;
}

/** Intent detection options */
export interface IntentDetectionOptions {
  /** Whether a document is attached */
  hasDocument: boolean;
  /** Minimum confidence to auto-select (default: 0.6) */
  minConfidence?: number;
  /** Previous mode for context */
  previousMode?: AIMode;
}

// ============================================================================
// Citation Types
// ============================================================================

/** Source type for citations */
export type CitationSourceType = 'rag' | 'web' | 'document' | 'api';

/** Individual citation reference */
export interface Citation {
  /** Citation index (1-based for display) */
  index: number;
  /** Source type */
  type: CitationSourceType;
  /** Display title */
  title: string;
  /** Source identifier (file path, URL, etc.) */
  source: string;
  /** Integration name if from RAG */
  integration?: string;
  /** Confidence score (0-1) */
  confidence?: number;
  /** Relevant excerpt from source */
  excerpt?: string;
  /** URL if web source */
  url?: string;
  /** Timestamp when data was synced */
  syncedAt?: Date;
}

/** Citations container for a message */
export interface MessageCitations {
  /** All citations in the message */
  citations: Citation[];
  /** Whether all sources could be verified */
  allVerified: boolean;
  /** Summary of source types used */
  summary: {
    ragCount: number;
    webCount: number;
    documentCount: number;
  };
}

/** Pattern for matching citations in text: [1], [2], etc. */
export const CITATION_PATTERN = /\[(\d+)\]/g;

// ============================================================================
// Action Detection Types
// ============================================================================

/** Types of detected actions */
export type ActionType = 'email' | 'event' | 'file' | 'task' | 'contact' | 'link';

/** Detected actionable content from AI response */
export interface DetectedAction {
  /** Action type */
  type: ActionType;
  /** Original text that was detected */
  text: string;
  /** Start position in original text */
  startIndex: number;
  /** End position in original text */
  endIndex: number;
  /** Extracted data for the action */
  data: ActionData;
  /** Confidence of detection (0-1) */
  confidence: number;
}

/** Action-specific data */
export interface ActionData {
  /** Email address (for email/contact actions) */
  email?: string;
  /** Date (for event actions) */
  date?: Date;
  /** Title or subject */
  title?: string;
  /** File name (for file actions) */
  fileName?: string;
  /** URL (for link actions) */
  url?: string;
  /** Description or body content */
  description?: string;
  /** Phone number (for contact actions) */
  phone?: string;
  /** Person name */
  name?: string;
}

/** Quick action button configuration */
export interface QuickActionButton {
  /** Action type */
  type: ActionType;
  /** Button label */
  label: string;
  /** Icon name */
  icon: string;
  /** Data to pre-fill */
  data: ActionData;
  /** Handler function name */
  handler: string;
}

/** Regex patterns for action detection */
export const ACTION_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
  phone: /\b(?:\+1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
  date: /\b(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/gi,
  url: /https?:\/\/[^\s<>"\]]+/gi,
  fileName: /\b[\w-]+\.(pdf|doc|docx|xls|xlsx|csv|txt|md|json|xml)\b/gi
};

// ============================================================================
// Memory & Context Types
// ============================================================================

/** Memory status for context window */
export interface MemoryStatus {
  /** Estimated tokens used */
  estimatedTokens: number;
  /** Maximum tokens available */
  maxTokens: number;
  /** Percentage used (0-100) */
  percentUsed: number;
  /** Current status indicator */
  status: 'normal' | 'warning' | 'critical';
  /** Number of messages included in context */
  messagesIncluded: number;
  /** Whether context summarization is recommended */
  shouldSummarize: boolean;
}

/** Token estimation constants */
export const TOKEN_CONSTANTS = {
  /** Average characters per token */
  CHARS_PER_TOKEN: 4,
  /** Max context window (approximate for Claude) */
  MAX_TOKENS: 100000,
  /** Warning threshold (percentage) */
  WARNING_THRESHOLD: 70,
  /** Critical threshold (percentage) */
  CRITICAL_THRESHOLD: 90,
  /** Message count threshold for summarization suggestion */
  SUMMARIZE_THRESHOLD: 10
};

// ============================================================================
// Context Preview Types
// ============================================================================

/** Integration context information for preview */
export interface IntegrationContextInfo {
  /** Provider name (google, slack, etc.) */
  provider: string;
  /** Display name */
  displayName: string;
  /** Number of documents indexed */
  documentCount: number;
  /** Last sync timestamp */
  lastSyncedAt: Date | null;
  /** Whether data is stale (> 24 hours old) */
  isStale: boolean;
  /** Data freshness category */
  freshness: 'fresh' | 'recent' | 'stale';
  /** Types of data available */
  dataTypes: string[];
  /** Connection status */
  isConnected: boolean;
}

/** Data freshness thresholds (in hours) */
export const FRESHNESS_THRESHOLDS = {
  /** Fresh: less than 24 hours */
  FRESH: 24,
  /** Recent: less than 7 days (168 hours) */
  RECENT: 168
};

/** RAG status with enhanced context preview */
export interface EnhancedRAGStatus {
  /** Overall data availability */
  dataAvailable: boolean;
  /** Total document count */
  documentCount: number;
  /** List of connected integrations */
  integrations: string[];
  /** Per-integration breakdown */
  integrationDetails: IntegrationContextInfo[];
  /** Loading state */
  loading: boolean;
  /** Last overall sync time */
  lastSyncTime: Date | null;
  /** Whether any data is stale */
  hasStaleData: boolean;
}

// ============================================================================
// Message Enhancement Types
// ============================================================================

/** Enhanced message with all AI improvements */
export interface EnhancedMessage {
  /** Original message content */
  content: string;
  /** Detected intent classification */
  intent?: IntentClassification;
  /** Parsed citations */
  citations?: MessageCitations;
  /** Detected actions */
  actions?: DetectedAction[];
}

/** Message rendering options */
export interface MessageRenderOptions {
  /** Whether to show citation markers */
  showCitations: boolean;
  /** Whether to show action buttons */
  showActions: boolean;
  /** Whether to show mode badge */
  showModeBadge: boolean;
  /** Whether to highlight actionable content */
  highlightActions: boolean;
}

// ============================================================================
// Conversation Types
// ============================================================================

/** Conversation summary for memory management */
export interface ConversationSummary {
  /** Summary text */
  text: string;
  /** Key topics discussed */
  topics: string[];
  /** Key decisions or conclusions */
  decisions: string[];
  /** Timestamp of summarization */
  summarizedAt: Date;
  /** Number of messages summarized */
  messageCount: number;
}

/** Conversation context state */
export interface ConversationContext {
  /** Current memory status */
  memoryStatus: MemoryStatus;
  /** Whether conversation has been summarized */
  hasSummary: boolean;
  /** Summary if available */
  summary?: ConversationSummary;
  /** Active integrations in context */
  activeIntegrations: string[];
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate freshness category based on sync time
 */
export function calculateFreshness(lastSyncedAt: Date | null): 'fresh' | 'recent' | 'stale' {
  if (!lastSyncedAt) return 'stale';

  const hoursSinceSync = (Date.now() - lastSyncedAt.getTime()) / (1000 * 60 * 60);

  if (hoursSinceSync < FRESHNESS_THRESHOLDS.FRESH) return 'fresh';
  if (hoursSinceSync < FRESHNESS_THRESHOLDS.RECENT) return 'recent';
  return 'stale';
}

/**
 * Estimate token count from text
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / TOKEN_CONSTANTS.CHARS_PER_TOKEN);
}

/**
 * Calculate memory status from messages
 */
export function calculateMemoryStatus(messages: Array<{ content: string }>): MemoryStatus {
  const totalTokens = messages.reduce((sum, msg) => sum + estimateTokens(msg.content), 0);
  const percentUsed = (totalTokens / TOKEN_CONSTANTS.MAX_TOKENS) * 100;

  let status: 'normal' | 'warning' | 'critical' = 'normal';
  if (percentUsed >= TOKEN_CONSTANTS.CRITICAL_THRESHOLD) {
    status = 'critical';
  } else if (percentUsed >= TOKEN_CONSTANTS.WARNING_THRESHOLD) {
    status = 'warning';
  }

  return {
    estimatedTokens: totalTokens,
    maxTokens: TOKEN_CONSTANTS.MAX_TOKENS,
    percentUsed,
    status,
    messagesIncluded: messages.length,
    shouldSummarize: messages.length >= TOKEN_CONSTANTS.SUMMARIZE_THRESHOLD
  };
}

/**
 * Get color class for freshness status
 */
export function getFreshnessColor(freshness: 'fresh' | 'recent' | 'stale'): string {
  switch (freshness) {
    case 'fresh': return 'text-green-600';
    case 'recent': return 'text-yellow-600';
    case 'stale': return 'text-red-600';
  }
}

/**
 * Get background color class for freshness status
 */
export function getFreshnessBgColor(freshness: 'fresh' | 'recent' | 'stale'): string {
  switch (freshness) {
    case 'fresh': return 'bg-green-100';
    case 'recent': return 'bg-yellow-100';
    case 'stale': return 'bg-red-100';
  }
}
