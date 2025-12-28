/**
 * Action Detector - Actionable Content Detection
 *
 * Analyzes AI responses to detect actionable content like emails, dates, files.
 * Part of Terminal 4: AI Enhancement Team
 *
 * Created: December 28, 2025
 */

import {
  ActionType,
  DetectedAction,
  ActionData,
  ACTION_PATTERNS
} from '@/types/ai';

/**
 * Email pattern with capture groups
 */
const EMAIL_PATTERN = /\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})\b/gi;

/**
 * Phone pattern with capture groups
 */
const PHONE_PATTERN = /\b((?:\+1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})\b/g;

/**
 * Date patterns for various formats
 */
const DATE_PATTERNS = [
  // "January 15, 2025" or "Jan 15, 2025"
  /\b((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)\b/gi,
  // "15 January 2025"
  /\b(\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)(?:\s+\d{4})?)\b/gi,
  // "1/15/2025" or "01-15-2025"
  /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/g,
  // Relative dates
  /\b(today|tomorrow|next\s+(?:week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/gi
];

/**
 * URL pattern
 */
const URL_PATTERN = /(https?:\/\/[^\s<>"'\]]+)/gi;

/**
 * File name pattern
 */
const FILE_PATTERN = /\b([\w-]+\.(pdf|doc|docx|xls|xlsx|csv|txt|md|json|xml|ppt|pptx))\b/gi;

/**
 * Context phrases that indicate meeting/event
 */
const MEETING_CONTEXT = [
  'meeting', 'call', 'appointment', 'schedule', 'book', 'calendar',
  'at', 'on', 'conference', 'sync', 'standup', 'review'
];

/**
 * Context phrases that indicate email intent
 */
const EMAIL_CONTEXT = [
  'email', 'send', 'reply', 'respond', 'contact', 'reach out',
  'follow up', 'message', 'write to', 'draft'
];

/**
 * Detect emails in text
 */
function detectEmails(text: string): DetectedAction[] {
  const actions: DetectedAction[] = [];
  let match;

  // Reset regex lastIndex
  EMAIL_PATTERN.lastIndex = 0;

  while ((match = EMAIL_PATTERN.exec(text)) !== null) {
    const email = match[1];
    const startIndex = match.index;
    const endIndex = startIndex + match[0].length;

    // Check context around the email
    const contextStart = Math.max(0, startIndex - 50);
    const contextEnd = Math.min(text.length, endIndex + 50);
    const context = text.slice(contextStart, contextEnd).toLowerCase();

    const hasEmailContext = EMAIL_CONTEXT.some(word => context.includes(word));
    const confidence = hasEmailContext ? 0.9 : 0.7;

    actions.push({
      type: 'email',
      text: email,
      startIndex,
      endIndex,
      data: { email },
      confidence
    });
  }

  return actions;
}

/**
 * Detect phone numbers in text
 */
function detectPhones(text: string): DetectedAction[] {
  const actions: DetectedAction[] = [];
  let match;

  PHONE_PATTERN.lastIndex = 0;

  while ((match = PHONE_PATTERN.exec(text)) !== null) {
    actions.push({
      type: 'contact',
      text: match[1],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      data: { phone: match[1] },
      confidence: 0.85
    });
  }

  return actions;
}

/**
 * Parse date string to Date object
 */
function parseDate(dateStr: string): Date | null {
  const lower = dateStr.toLowerCase();

  // Handle relative dates
  const today = new Date();
  if (lower === 'today') return today;
  if (lower === 'tomorrow') {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return tomorrow;
  }
  if (lower.startsWith('next ')) {
    const nextDate = new Date(today);
    if (lower.includes('week')) {
      nextDate.setDate(today.getDate() + 7);
    } else if (lower.includes('month')) {
      nextDate.setMonth(today.getMonth() + 1);
    } else {
      // Day of week
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDay = days.findIndex(d => lower.includes(d));
      if (targetDay >= 0) {
        const currentDay = today.getDay();
        const daysUntil = (targetDay - currentDay + 7) % 7 || 7;
        nextDate.setDate(today.getDate() + daysUntil);
      }
    }
    return nextDate;
  }

  // Try parsing absolute dates
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

/**
 * Detect dates in text
 */
function detectDates(text: string): DetectedAction[] {
  const actions: DetectedAction[] = [];
  const seenDates = new Set<string>();

  for (const pattern of DATE_PATTERNS) {
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const dateStr = match[1];
      const key = `${match.index}-${dateStr}`;

      if (seenDates.has(key)) continue;
      seenDates.add(key);

      const parsedDate = parseDate(dateStr);
      if (!parsedDate) continue;

      // Check context for meeting-related words
      const contextStart = Math.max(0, match.index - 100);
      const contextEnd = Math.min(text.length, match.index + match[0].length + 100);
      const context = text.slice(contextStart, contextEnd).toLowerCase();

      const hasMeetingContext = MEETING_CONTEXT.some(word => context.includes(word));
      const confidence = hasMeetingContext ? 0.85 : 0.6;

      actions.push({
        type: 'event',
        text: dateStr,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        data: {
          date: parsedDate,
          title: extractMeetingTitle(context)
        },
        confidence
      });
    }
  }

  return actions;
}

/**
 * Extract potential meeting title from context
 */
function extractMeetingTitle(context: string): string | undefined {
  // Look for phrases like "meeting with X" or "X meeting"
  const patterns = [
    /(?:meeting|call|sync)\s+(?:with\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:meeting|call|sync)/i
  ];

  for (const pattern of patterns) {
    const match = context.match(pattern);
    if (match) {
      return `Meeting with ${match[1]}`;
    }
  }

  return undefined;
}

/**
 * Detect URLs in text
 */
function detectUrls(text: string): DetectedAction[] {
  const actions: DetectedAction[] = [];

  URL_PATTERN.lastIndex = 0;
  let match;

  while ((match = URL_PATTERN.exec(text)) !== null) {
    actions.push({
      type: 'link',
      text: match[1],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      data: { url: match[1] },
      confidence: 0.95
    });
  }

  return actions;
}

/**
 * Detect file names in text
 */
function detectFiles(text: string): DetectedAction[] {
  const actions: DetectedAction[] = [];

  FILE_PATTERN.lastIndex = 0;
  let match;

  while ((match = FILE_PATTERN.exec(text)) !== null) {
    actions.push({
      type: 'file',
      text: match[1],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      data: { fileName: match[1] },
      confidence: 0.9
    });
  }

  return actions;
}

/**
 * Main function to detect all actions in text
 */
export function detectActions(text: string, minConfidence: number = 0.5): DetectedAction[] {
  const allActions: DetectedAction[] = [
    ...detectEmails(text),
    ...detectPhones(text),
    ...detectDates(text),
    ...detectUrls(text),
    ...detectFiles(text)
  ];

  // Filter by confidence and sort by position
  return allActions
    .filter(action => action.confidence >= minConfidence)
    .sort((a, b) => a.startIndex - b.startIndex);
}

/**
 * Group detected actions by type
 */
export function groupActionsByType(actions: DetectedAction[]): Record<ActionType, DetectedAction[]> {
  const grouped: Record<ActionType, DetectedAction[]> = {
    email: [],
    event: [],
    file: [],
    task: [],
    contact: [],
    link: []
  };

  for (const action of actions) {
    grouped[action.type].push(action);
  }

  return grouped;
}

/**
 * Get unique actions (deduplicate by data)
 */
export function getUniqueActions(actions: DetectedAction[]): DetectedAction[] {
  const seen = new Set<string>();
  const unique: DetectedAction[] = [];

  for (const action of actions) {
    const key = `${action.type}-${JSON.stringify(action.data)}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(action);
    }
  }

  return unique;
}

/**
 * Get primary action (highest confidence) for each type
 */
export function getPrimaryActions(actions: DetectedAction[]): DetectedAction[] {
  const grouped = groupActionsByType(actions);
  const primary: DetectedAction[] = [];

  for (const type of Object.keys(grouped) as ActionType[]) {
    const typeActions = grouped[type];
    if (typeActions.length > 0) {
      // Get highest confidence action
      const best = typeActions.reduce((a, b) =>
        a.confidence > b.confidence ? a : b
      );
      primary.push(best);
    }
  }

  return primary;
}

export default {
  detectActions,
  groupActionsByType,
  getUniqueActions,
  getPrimaryActions
};
