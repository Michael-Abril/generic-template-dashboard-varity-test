/**
 * Intent Detector - Smart Mode Selection
 *
 * Automatically detects the appropriate AI mode based on user query intent.
 * Part of Terminal 4: AI Enhancement Team
 *
 * Created: December 28, 2025
 */

import {
  AIMode,
  AI_MODE_CONFIGS,
  IntentClassification,
  IntentDetectionOptions
} from '@/types/ai';

/**
 * Keyword patterns for each mode with weighted scores
 */
const MODE_PATTERNS: Record<AIMode, { keywords: string[]; phrases: string[]; weight: number }> = {
  analyze: {
    keywords: [
      'analyze', 'analysis', 'report', 'compare', 'comparison',
      'breakdown', 'summarize', 'summary', 'assess', 'assessment',
      'evaluate', 'evaluation', 'trend', 'trends', 'insight', 'insights',
      'performance', 'metrics', 'kpi', 'benchmark', 'forecast',
      'projection', 'overview', 'review', 'audit', 'examine'
    ],
    phrases: [
      'give me a report',
      'create a report',
      'analyze the',
      'break down',
      'compare the',
      'how is my',
      'what are the trends',
      'summarize my',
      'provide an analysis',
      'executive summary',
      'performance review',
      'year over year',
      'month over month',
      'quarter over quarter'
    ],
    weight: 1.2  // Slightly higher weight for analysis keywords
  },
  deep_research: {
    keywords: [
      'research', 'investigate', 'discover', 'explore', 'search',
      'find out', 'look up', 'dig into', 'uncover', 'study',
      'examine', 'probe', 'inquire', 'learn about'
    ],
    phrases: [
      'research about',
      'find out about',
      'look up',
      'what do you know about',
      'tell me everything about',
      'search for',
      'can you find',
      'i want to know about',
      'investigate the',
      'deep dive into',
      'learn more about'
    ],
    weight: 1.1
  },
  document: {
    keywords: [],  // Document mode is triggered by file attachment, not keywords
    phrases: [],
    weight: 1.0
  },
  standard: {
    keywords: [
      'what', 'when', 'where', 'who', 'how', 'why',
      'show', 'list', 'tell', 'get', 'display',
      'check', 'find', 'look', 'see'
    ],
    phrases: [
      'what is',
      'what are',
      'show me',
      'tell me',
      'list my',
      'how many',
      'how much',
      'when is',
      'where is',
      'who is',
      'can you',
      'do i have',
      'is there'
    ],
    weight: 1.0  // Base weight for standard queries
  }
};

/**
 * Question-type patterns that suggest standard mode
 */
const SIMPLE_QUESTION_PATTERNS = [
  /^what is/i,
  /^who is/i,
  /^when is/i,
  /^where is/i,
  /^how many/i,
  /^how much/i,
  /^do i have/i,
  /^is there/i,
  /^show me/i,
  /^list my/i,
  /^get my/i
];

/**
 * Calculate match score for a mode based on query text
 */
function calculateModeScore(
  query: string,
  mode: AIMode
): { score: number; triggers: string[] } {
  const patterns = MODE_PATTERNS[mode];
  const lowerQuery = query.toLowerCase();
  const triggers: string[] = [];
  let score = 0;

  // Check for keyword matches
  for (const keyword of patterns.keywords) {
    // Use word boundary matching for accuracy
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(lowerQuery)) {
      score += patterns.weight;
      triggers.push(keyword);
    }
  }

  // Check for phrase matches (worth more)
  for (const phrase of patterns.phrases) {
    if (lowerQuery.includes(phrase.toLowerCase())) {
      score += patterns.weight * 1.5;  // Phrases are weighted higher
      if (!triggers.includes(phrase)) {
        triggers.push(phrase);
      }
    }
  }

  return { score, triggers };
}

/**
 * Check if query is a simple question that should use standard mode
 */
function isSimpleQuestion(query: string): boolean {
  return SIMPLE_QUESTION_PATTERNS.some(pattern => pattern.test(query.trim()));
}

/**
 * Detect the intent of a user query and return the recommended AI mode
 *
 * @param query - The user's message
 * @param options - Detection options (hasDocument, minConfidence, etc.)
 * @returns IntentClassification with mode, confidence, and triggers
 */
export function detectIntent(
  query: string,
  options: IntentDetectionOptions = { hasDocument: false }
): IntentClassification {
  const { hasDocument, minConfidence = 0.6 } = options;

  // If document is attached, document mode takes priority
  if (hasDocument) {
    return {
      mode: 'document',
      confidence: 1.0,
      triggers: ['document attached'],
      autoSelected: true
    };
  }

  // If query is very short, default to standard
  if (query.trim().length < 10) {
    return {
      mode: 'standard',
      confidence: 0.8,
      triggers: ['short query'],
      autoSelected: true
    };
  }

  // Calculate scores for each mode
  const scores: Record<AIMode, { score: number; triggers: string[] }> = {
    analyze: calculateModeScore(query, 'analyze'),
    deep_research: calculateModeScore(query, 'deep_research'),
    document: { score: 0, triggers: [] },
    standard: calculateModeScore(query, 'standard')
  };

  // Find the mode with highest score
  let bestMode: AIMode = 'standard';
  let bestScore = 0;
  let bestTriggers: string[] = [];

  for (const [mode, result] of Object.entries(scores) as [AIMode, { score: number; triggers: string[] }][]) {
    if (mode === 'document') continue;  // Skip document mode unless file attached

    if (result.score > bestScore) {
      bestMode = mode;
      bestScore = result.score;
      bestTriggers = result.triggers;
    }
  }

  // Calculate confidence based on score differential
  const totalScore = Object.values(scores).reduce((sum, s) => sum + s.score, 0);
  let confidence = totalScore > 0 ? bestScore / totalScore : 0.5;

  // Boost confidence if simple question pattern matches for standard mode
  if (bestMode === 'standard' && isSimpleQuestion(query)) {
    confidence = Math.min(confidence + 0.2, 1.0);
    if (!bestTriggers.includes('simple question')) {
      bestTriggers.push('simple question');
    }
  }

  // If analyze or research has clear triggers but low confidence, boost it
  if (bestMode !== 'standard' && bestTriggers.length >= 2) {
    confidence = Math.max(confidence, 0.75);
  }

  // Fallback to standard if no confident match
  if (confidence < minConfidence) {
    return {
      mode: 'standard',
      confidence: 0.5 + (confidence * 0.3),  // Show some confidence in fallback
      triggers: ['default'],
      autoSelected: true
    };
  }

  return {
    mode: bestMode,
    confidence: Math.min(confidence, 1.0),
    triggers: bestTriggers,
    autoSelected: true
  };
}

/**
 * Get human-readable explanation of why a mode was selected
 */
export function getIntentExplanation(classification: IntentClassification): string {
  const modeConfig = AI_MODE_CONFIGS[classification.mode];

  if (!classification.autoSelected) {
    return `You selected ${modeConfig.name} mode`;
  }

  if (classification.triggers.includes('document attached')) {
    return 'Document mode activated for file analysis';
  }

  if (classification.triggers.includes('short query')) {
    return 'Using Standard mode for quick response';
  }

  if (classification.triggers.includes('default')) {
    return `Using ${modeConfig.name} mode`;
  }

  const triggerList = classification.triggers.slice(0, 2).join(', ');
  return `${modeConfig.name} mode detected: "${triggerList}"`;
}

/**
 * Get badge color class based on mode
 */
export function getModeBadgeColor(mode: AIMode): string {
  const colors: Record<AIMode, string> = {
    standard: 'bg-blue-100 text-blue-700 border-blue-200',
    deep_research: 'bg-purple-100 text-purple-700 border-purple-200',
    analyze: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    document: 'bg-amber-100 text-amber-700 border-amber-200'
  };
  return colors[mode];
}

/**
 * Get icon name for mode
 */
export function getModeIcon(mode: AIMode): string {
  return AI_MODE_CONFIGS[mode].icon;
}

export default {
  detectIntent,
  getIntentExplanation,
  getModeBadgeColor,
  getModeIcon
};
