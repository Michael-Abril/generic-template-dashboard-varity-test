'use client';

/**
 * Citation Panel - Expandable Source Details
 *
 * Shows full citation details at the bottom of AI responses.
 * Part of Terminal 4: AI Enhancement Team
 *
 * Created: December 28, 2025
 */

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Globe,
  Database,
  Clock,
  Copy,
  Check
} from 'lucide-react';
import { Citation, CitationSourceType, MessageCitations } from '@/types/ai';

interface CitationPanelProps {
  /** All citations for the message */
  citations: MessageCitations;
  /** Whether panel is initially expanded */
  defaultExpanded?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * Get icon for citation source type
 */
function getSourceIcon(type: CitationSourceType, className: string = 'h-4 w-4') {
  switch (type) {
    case 'rag':
      return <Database className={className} />;
    case 'web':
      return <Globe className={className} />;
    case 'document':
      return <FileText className={className} />;
    case 'api':
      return <ExternalLink className={className} />;
  }
}

/**
 * Get source type label
 */
function getSourceLabel(type: CitationSourceType): string {
  switch (type) {
    case 'rag':
      return 'Business Data';
    case 'web':
      return 'Web Search';
    case 'document':
      return 'Document';
    case 'api':
      return 'Live API';
  }
}

/**
 * Get color classes for source type
 */
function getSourceColors(type: CitationSourceType): { bg: string; text: string; border: string } {
  switch (type) {
    case 'rag':
      return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
    case 'web':
      return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' };
    case 'document':
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
    case 'api':
      return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' };
  }
}

/**
 * Individual citation row component
 */
function CitationRow({ citation }: { citation: Citation }) {
  const [copied, setCopied] = useState(false);
  const colors = getSourceColors(citation.type);

  const handleCopySource = async () => {
    const textToCopy = citation.url || citation.source;
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenSource = () => {
    if (citation.url) {
      window.open(citation.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className={`p-3 rounded-lg border ${colors.bg} ${colors.border}`}>
      <div className="flex items-start justify-between gap-2">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Header with index and type */}
          <div className="flex items-center gap-2 mb-1">
            <span className={`
              inline-flex items-center justify-center
              w-5 h-5 text-xs font-bold rounded
              ${colors.bg} ${colors.text} border ${colors.border}
            `}>
              {citation.index}
            </span>
            <span className={`flex items-center gap-1 text-xs font-medium ${colors.text}`}>
              {getSourceIcon(citation.type, 'h-3 w-3')}
              {getSourceLabel(citation.type)}
            </span>
            {citation.integration && (
              <span className="text-xs text-gray-500 capitalize">
                via {citation.integration}
              </span>
            )}
          </div>

          {/* Title */}
          <h4 className="text-sm font-medium text-gray-900 truncate">
            {citation.title}
          </h4>

          {/* Source path/URL */}
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {citation.source}
          </p>

          {/* Excerpt if available */}
          {citation.excerpt && (
            <p className="text-xs text-gray-600 mt-2 line-clamp-2 italic">
              "{citation.excerpt}"
            </p>
          )}

          {/* Metadata row */}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            {citation.confidence !== undefined && (
              <span className="flex items-center gap-1">
                <span className={`
                  w-2 h-2 rounded-full
                  ${citation.confidence >= 0.8 ? 'bg-green-500' :
                    citation.confidence >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'}
                `} />
                {Math.round(citation.confidence * 100)}% confidence
              </span>
            )}
            {citation.syncedAt && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Synced {new Date(citation.syncedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopySource}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded transition-colors"
            title="Copy source"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
          {citation.url && (
            <button
              onClick={handleOpenSource}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded transition-colors"
              title="Open source"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Summary badges showing citation breakdown
 */
function CitationSummary({ summary }: { summary: MessageCitations['summary'] }) {
  const badges = [];

  if (summary.ragCount > 0) {
    badges.push(
      <span key="rag" className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
        <Database className="h-3 w-3" />
        {summary.ragCount} from your data
      </span>
    );
  }

  if (summary.webCount > 0) {
    badges.push(
      <span key="web" className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
        <Globe className="h-3 w-3" />
        {summary.webCount} from web
      </span>
    );
  }

  if (summary.documentCount > 0) {
    badges.push(
      <span key="doc" className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
        <FileText className="h-3 w-3" />
        {summary.documentCount} from documents
      </span>
    );
  }

  return <div className="flex flex-wrap gap-2">{badges}</div>;
}

export function CitationPanel({
  citations,
  defaultExpanded = false,
  className = ''
}: CitationPanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (citations.citations.length === 0) {
    return null;
  }

  return (
    <div className={`mt-3 border-t border-gray-100 pt-3 ${className}`}>
      {/* Toggle header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {citations.citations.length} source{citations.citations.length !== 1 ? 's' : ''}
          </span>
          {!expanded && <CitationSummary summary={citations.summary} />}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-3 space-y-2">
          {citations.citations.map((citation) => (
            <CitationRow key={citation.index} citation={citation} />
          ))}

          {!citations.allVerified && (
            <p className="text-xs text-amber-600 flex items-center gap-1 mt-2">
              <Clock className="h-3 w-3" />
              Some sources could not be verified
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact inline citation list
 */
export function CitationList({
  citations,
  maxDisplay = 3,
  onCitationClick
}: {
  citations: Citation[];
  maxDisplay?: number;
  onCitationClick?: (citation: Citation) => void;
}) {
  const displayedCitations = citations.slice(0, maxDisplay);
  const remainingCount = citations.length - maxDisplay;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {displayedCitations.map((citation) => {
        const colors = getSourceColors(citation.type);
        return (
          <button
            key={citation.index}
            onClick={() => onCitationClick?.(citation)}
            className={`
              inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs
              ${colors.bg} ${colors.text} border ${colors.border}
              hover:opacity-80 transition-opacity
            `}
          >
            <span className="font-bold">[{citation.index}]</span>
            <span className="truncate max-w-[120px]">{citation.title}</span>
          </button>
        );
      })}
      {remainingCount > 0 && (
        <span className="text-xs text-gray-500">
          +{remainingCount} more
        </span>
      )}
    </div>
  );
}

export default CitationPanel;
