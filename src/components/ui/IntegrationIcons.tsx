'use client';

/**
 * Brand Icons for Integration Sources
 * Actual logos for Gmail, Outlook, Google Calendar, Teams, Slack, QuickBooks, etc.
 */

import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

// Gmail Logo
export function GmailIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className}>
      <path fill="#4285F4" d="M22 6l-10 7L2 6V4l10 7 10-7z"/>
      <path fill="#EA4335" d="M2 6l10 7 10-7v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
      <path fill="#FBBC05" d="M2 6v12l6-6z"/>
      <path fill="#34A853" d="M22 6v12l-6-6z"/>
      <rect fill="#C5221F" x="2" y="4" width="20" height="4" rx="2" ry="2"/>
    </svg>
  );
}

// Outlook Logo
export function OutlookIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className}>
      <path fill="#0078D4" d="M24 7.5v9c0 1.38-1.12 2.5-2.5 2.5H10V5h11.5C22.88 5 24 6.12 24 7.5z"/>
      <path fill="#0364B8" d="M10 5v14H2.5C1.12 19 0 17.88 0 16.5v-9C0 6.12 1.12 5 2.5 5H10z"/>
      <ellipse fill="#fff" cx="5" cy="12" rx="3" ry="4"/>
      <path fill="#28A8EA" d="M10 5l7 4v6l-7 4z"/>
    </svg>
  );
}

// Google Calendar Logo
export function GoogleCalendarIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className}>
      <path fill="#4285F4" d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
      <path fill="#fff" d="M19 19H5V8h14v11z"/>
      <path fill="#EA4335" d="M7 10h2v2H7z"/>
      <path fill="#FBBC05" d="M11 10h2v2h-2z"/>
      <path fill="#34A853" d="M15 10h2v2h-2z"/>
      <path fill="#4285F4" d="M7 14h2v2H7z"/>
      <path fill="#EA4335" d="M11 14h2v2h-2z"/>
      <path fill="#FBBC05" d="M15 14h2v2h-2z"/>
    </svg>
  );
}

// Microsoft Teams Logo
export function TeamsIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className}>
      <path fill="#5059C9" d="M20.5 5.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z"/>
      <path fill="#7B83EB" d="M17 8h5v8a2 2 0 01-2 2h-1a2 2 0 01-2-2V8z"/>
      <circle fill="#5059C9" cx="10" cy="5" r="3"/>
      <path fill="#7B83EB" d="M14 9H6a2 2 0 00-2 2v7a2 2 0 002 2h8a2 2 0 002-2v-7a2 2 0 00-2-2z"/>
      <path fill="#fff" d="M12 12H8v1h1.5v4h1v-4H12z"/>
    </svg>
  );
}

// Slack Logo
export function SlackIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className}>
      <path fill="#E01E5A" d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313z"/>
      <path fill="#36C5F0" d="M8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312z"/>
      <path fill="#2EB67D" d="M18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 01-2.522 2.521 2.527 2.527 0 01-2.521-2.521V2.522A2.527 2.527 0 0115.165 0a2.528 2.528 0 012.521 2.522v6.312z"/>
      <path fill="#ECB22E" d="M15.165 18.956a2.528 2.528 0 012.521 2.522A2.528 2.528 0 0115.165 24a2.527 2.527 0 01-2.521-2.522v-2.522h2.521zm0-1.27a2.527 2.527 0 01-2.521-2.522 2.527 2.527 0 012.521-2.521h6.313A2.528 2.528 0 0124 15.165a2.528 2.528 0 01-2.522 2.521h-6.313z"/>
    </svg>
  );
}

// QuickBooks Logo
export function QuickBooksIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className}>
      <circle fill="#2CA01C" cx="12" cy="12" r="12"/>
      <path fill="#fff" d="M7 8h2v8H7zm8 0h2v8h-2z"/>
      <path fill="#fff" d="M9 10h6v1.5H9zm0 2.5h6V14H9z"/>
    </svg>
  );
}

// Salesforce Logo
export function SalesforceIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className}>
      <path fill="#00A1E0" d="M10.1 4.5c1.2-1.3 2.9-2 4.7-2 2.4 0 4.5 1.3 5.7 3.2.9-.4 1.9-.6 3-.6 4.2 0 7.5 3.4 7.5 7.5s-3.4 7.5-7.5 7.5c-.6 0-1.2-.1-1.7-.2-1 1.5-2.7 2.5-4.6 2.5-1.3 0-2.5-.4-3.4-1.2-1 .8-2.3 1.2-3.7 1.2-3.3 0-6-2.7-6-6 0-1.2.4-2.4 1-3.3-.6-1-1-2.2-1-3.5C4.1 6.3 6.8 3.6 10.1 4.5z"/>
      <path fill="#fff" d="M8.5 13.5l1.5-4 1.5 4h-3zm7-2l1 3h-2l1-3z"/>
    </svg>
  );
}

// HubSpot Logo
export function HubSpotIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className}>
      <path fill="#FF7A59" d="M18.16 7.58V5.77a2.06 2.06 0 001.21-1.87 2.07 2.07 0 00-4.14 0c0 .83.5 1.54 1.21 1.87v1.81a5.59 5.59 0 00-2.8 1.46L6.22 4.08a2.26 2.26 0 00.1-.66 2.18 2.18 0 10-2.18 2.18c.38 0 .73-.11 1.04-.28l7.38 4.91a5.58 5.58 0 00-.88 3c0 1.08.31 2.08.83 2.94l-2.47 2.47a1.96 1.96 0 00-.64-.11 2 2 0 102 2c0-.23-.04-.45-.11-.64l2.43-2.43a5.6 5.6 0 109.44-6.88z"/>
      <circle fill="#fff" cx="16.37" cy="12.23" r="2.5"/>
    </svg>
  );
}

// Google Drive Logo
export function GoogleDriveIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className}>
      <path fill="#4285F4" d="M12 11L7 3h10z"/>
      <path fill="#FBBC05" d="M7 3l-5 8.5 2.5 4.5h5z"/>
      <path fill="#34A853" d="M17 3l5 8.5-2.5 4.5h-5z"/>
      <path fill="#EA4335" d="M4.5 16L7 11.5h10L14.5 16z"/>
    </svg>
  );
}

// Default/Generic Icon for unknown sources
export function GenericIntegrationIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
    </svg>
  );
}

// Helper function to get the right icon based on source and type
export function getIntegrationIcon(type: string, source: string): React.ComponentType<IconProps> {
  const sourceLC = source?.toLowerCase() || '';
  const typeLC = type?.toLowerCase() || '';

  // Email sources
  if (typeLC === 'email' || typeLC.includes('mail')) {
    if (sourceLC.includes('google') || sourceLC.includes('gmail')) return GmailIcon;
    if (sourceLC.includes('microsoft') || sourceLC.includes('outlook')) return OutlookIcon;
  }

  // Calendar sources
  if (typeLC === 'event' || typeLC.includes('calendar') || typeLC.includes('meeting')) {
    if (sourceLC.includes('google')) return GoogleCalendarIcon;
    if (sourceLC.includes('microsoft') || sourceLC.includes('teams')) return TeamsIcon;
  }

  // Direct source matches
  if (sourceLC.includes('slack')) return SlackIcon;
  if (sourceLC.includes('quickbooks')) return QuickBooksIcon;
  if (sourceLC.includes('salesforce')) return SalesforceIcon;
  if (sourceLC.includes('hubspot')) return HubSpotIcon;
  if (sourceLC.includes('drive')) return GoogleDriveIcon;

  // Google generic
  if (sourceLC.includes('google')) {
    if (typeLC.includes('file') || typeLC.includes('document')) return GoogleDriveIcon;
    return GmailIcon;
  }

  // Microsoft generic
  if (sourceLC.includes('microsoft')) {
    return OutlookIcon;
  }

  return GenericIntegrationIcon;
}

export default {
  GmailIcon,
  OutlookIcon,
  GoogleCalendarIcon,
  TeamsIcon,
  SlackIcon,
  QuickBooksIcon,
  SalesforceIcon,
  HubSpotIcon,
  GoogleDriveIcon,
  GenericIntegrationIcon,
  getIntegrationIcon,
};
