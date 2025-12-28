'use client';

/**
 * Citation Link - Inline Citation Markers
 *
 * Renders clickable [1], [2], etc. citation markers in AI responses.
 * Part of Terminal 4: AI Enhancement Team
 *
 * Created: December 28, 2025
 */

import React, { useState } from 'react';
import { ExternalLink, FileText, Globe, Database } from 'lucide-react';
import { Citation, CitationSourceType } from '@/types/ai';

interface CitationLinkProps {
  /** Citation data */
  citation: Citation;
  /** Click handler */
  onClick?: (citation: Citation) => void;
  /** Show mini tooltip on hover */
  showTooltip?: boolean;
}

/**
 * Get icon for citation source type
 */
function getSourceIcon(type: CitationSourceType) {
  switch (type) {
    case 'rag':
      return <Database className="h-3 w-3" />;
    case 'web':
      return <Globe className="h-3 w-3" />;
    case 'document':
      return <FileText className="h-3 w-3" />;
    case 'api':
      return <ExternalLink className="h-3 w-3" />;
  }
}

/**
 * Get color class for citation source type
 */
function getSourceColor(type: CitationSourceType): string {
  switch (type) {
    case 'rag':
      return 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200';
    case 'web':
      return 'bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200';
    case 'document':
      return 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200';
    case 'api':
      return 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200';
  }
}

export function CitationLink({
  citation,
  onClick,
  showTooltip = true
}: CitationLinkProps) {
  const [showMiniTooltip, setShowMiniTooltip] = useState(false);
  const colorClasses = getSourceColor(citation.type);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClick?.(citation);
  };

  return (
    <span className="relative inline-block">
      <button
        onClick={handleClick}
        onMouseEnter={() => setShowMiniTooltip(true)}
        onMouseLeave={() => setShowMiniTooltip(false)}
        className={`
          inline-flex items-center justify-center
          min-w-[1.25rem] h-5 px-1
          text-xs font-semibold
          rounded border
          transition-colors cursor-pointer
          align-baseline
          ${colorClasses}
        `}
        aria-label={`Citation ${citation.index}: ${citation.title}`}
      >
        {citation.index}
      </button>

      {/* Mini tooltip on hover */}
      {showTooltip && showMiniTooltip && (
        <div
          className="
            absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1
            z-50 pointer-events-none
          "
        >
          <div className="
            bg-gray-900 text-white text-xs rounded-lg py-1.5 px-2.5
            shadow-lg max-w-[200px] whitespace-nowrap overflow-hidden text-ellipsis
          ">
            <div className="flex items-center gap-1.5">
              {getSourceIcon(citation.type)}
              <span className="truncate">{citation.title}</span>
            </div>
            {/* Arrow */}
            <div className="
              absolute top-full left-1/2 transform -translate-x-1/2
              border-4 border-transparent border-t-gray-900
            " />
          </div>
        </div>
      )}
    </span>
  );
}

/**
 * Parse text and replace [n] patterns with CitationLink components
 */
export function renderTextWithCitations(
  text: string,
  citations: Citation[],
  onCitationClick?: (citation: Citation) => void
): React.ReactNode[] {
  const CITATION_REGEX = /\[(\d+)\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = CITATION_REGEX.exec(text)) !== null) {
    // Add text before the citation
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // Find the citation data
    const citationIndex = parseInt(match[1], 10);
    const citation = citations.find(c => c.index === citationIndex);

    if (citation) {
      parts.push(
        <CitationLink
          key={`citation-${match.index}-${citationIndex}`}
          citation={citation}
          onClick={onCitationClick}
        />
      );
    } else {
      // Citation not found, render as plain text
      parts.push(match[0]);
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

/**
 * Component that wraps text and renders citations inline
 */
export function TextWithCitations({
  text,
  citations,
  onCitationClick,
  className = ''
}: {
  text: string;
  citations: Citation[];
  onCitationClick?: (citation: Citation) => void;
  className?: string;
}) {
  const rendered = renderTextWithCitations(text, citations, onCitationClick);

  return <span className={className}>{rendered}</span>;
}

export default CitationLink;
