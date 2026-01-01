'use client';

/**
 * Brand Icons for Integration Sources
 * Official SVG paths from Simple Icons (https://simpleicons.org/)
 * with official brand colors applied
 */

import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

// Gmail Logo - Official Simple Icons path
// Brand color: #EA4335
export function GmailIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#EA4335"
        d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"
      />
    </svg>
  );
}

// Microsoft Outlook Logo
// Brand color: #0078D4
export function OutlookIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#0078D4"
        d="M24 7.387v10.478c0 .23-.08.424-.238.576-.158.154-.352.23-.58.23h-8.547v-6.959l1.6 1.229c.102.086.215.127.347.127.133 0 .25-.043.352-.127l6.86-5.25c.094-.07.164-.108.213-.108.114 0 .17.078.17.238v-.002l-.177.566zm-.238-1.846c.16 0 .285.064.377.197.093.132.14.282.14.449 0 .111-.047.232-.14.36l-7.09 5.533c-.142.11-.253.166-.332.166a.39.39 0 01-.211-.062l-1.87-1.424v-5.22h8.547c.228 0 .42.072.58.218-.002.002-.001-.217-.001-.217zM14.634 10.74l-1.846 1.424-1.846-1.424v2.89h3.692v-2.89zM7.479 8.96c.483 0 .903.168 1.258.504.355.336.532.79.532 1.361v4.36c0 .57-.178 1.025-.534 1.361-.356.336-.775.504-1.256.504-.483 0-.902-.168-1.256-.504-.354-.336-.531-.79-.531-1.361v-4.36c0-.57.177-1.025.532-1.361.354-.336.772-.504 1.255-.504zm0 1.238c-.178 0-.315.064-.414.193-.098.128-.148.293-.148.492v4.238c0 .2.05.364.148.492.099.129.236.193.414.193.178 0 .316-.064.414-.193.098-.128.148-.293.148-.492v-4.238c0-.2-.05-.364-.148-.492-.098-.129-.236-.193-.414-.193zM0 5.476v14.032c0 .135.052.25.158.343.105.094.233.14.385.14h9.078v-5.264H6.108V8.7h3.513V3H.543c-.152 0-.28.048-.385.142C.053 3.235 0 3.348 0 3.48v1.996z"
      />
    </svg>
  );
}

// Google Calendar Logo - Official Simple Icons path
// Brand color: #4285F4
export function GoogleCalendarIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#4285F4"
        d="M18.316 5.684H24v12.632h-5.684V5.684zM5.684 24h12.632v-5.684H5.684V24zM18.316 5.684V0H1.895A1.894 1.894 0 0 0 0 1.895v16.421h5.684V5.684h12.632zm-7.207 6.25v-.065c.272-.144.5-.349.687-.617s.279-.595.279-.982c0-.379-.099-.72-.3-1.025a2.05 2.05 0 0 0-.832-.714 2.703 2.703 0 0 0-1.197-.257c-.6 0-1.094.156-1.481.467-.386.311-.65.671-.793 1.078l1.085.452c.086-.249.224-.461.413-.633.189-.172.445-.257.767-.257.33 0 .602.088.816.264a.86.86 0 0 1 .322.703c0 .33-.12.589-.36.778-.24.19-.535.284-.886.284h-.567v1.085h.633c.407 0 .748.109 1.02.327.272.218.407.499.407.843 0 .336-.129.614-.387.832s-.565.327-.924.327c-.351 0-.651-.103-.897-.311-.248-.208-.422-.502-.521-.881l-1.096.452c.178.616.505 1.082.977 1.401.472.319.984.478 1.538.477a2.84 2.84 0 0 0 1.293-.291c.382-.193.684-.458.902-.794.218-.336.327-.72.327-1.149 0-.429-.115-.797-.344-1.105a2.067 2.067 0 0 0-.881-.689zm2.093-1.931l.602.913L15 10.045v5.744h1.187V8.446h-.827l-2.158 1.557zM22.105 0h-3.289v5.184H24V1.895A1.894 1.894 0 0 0 22.105 0zm-3.289 23.5l4.684-4.684h-4.684V23.5zM0 22.105C0 23.152.848 24 1.895 24h3.289v-5.184H0v3.289z"
      />
    </svg>
  );
}

// Microsoft Teams Logo
// Brand color: #6264A7
export function TeamsIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#6264A7"
        d="M20.625 8.073h-6.537l.05 8.777c0 .987.799 1.786 1.786 1.786h3.125A1.575 1.575 0 0 0 20.625 17.06V8.073zM24 8.287v7.063a2.894 2.894 0 0 1-2.893 2.893 2.893 2.893 0 0 1-2.893-2.893V8.287A2.893 2.893 0 0 1 21.107 5.394a2.893 2.893 0 0 1 2.893 2.893zM20.893 2.679a2.143 2.143 0 1 1-4.286 0 2.143 2.143 0 0 1 4.286 0zM17.357 5.036a3.214 3.214 0 1 1-6.428 0 3.214 3.214 0 0 1 6.428 0zM14.143 8.25H5.357A1.607 1.607 0 0 0 3.75 9.857v6.786c0 3.158 2.556 5.714 5.714 5.714h.536a5.714 5.714 0 0 0 5.714-5.714V9.857A1.607 1.607 0 0 0 14.143 8.25zm-2.786 2.679h-3v1.285h.857v4.072h1.286v-4.072h.857V10.929z"
      />
    </svg>
  );
}

// Slack Logo - Official Simple Icons path
// Brand color: #4A154B
export function SlackIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#4A154B"
        d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"
      />
    </svg>
  );
}

// QuickBooks Logo - Official Simple Icons path
// Brand color: #2CA01C
export function QuickBooksIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#2CA01C"
        d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm.642 4.1335c.9554 0 1.7296.776 1.7296 1.7332v9.0667h1.6c1.614 0 2.9275-1.3156 2.9275-2.933 0-1.6173-1.3136-2.9333-2.9276-2.9333h-.6654V7.3334h.6654c2.5722 0 4.6577 2.0897 4.6577 4.667 0 2.5774-2.0855 4.6666-4.6577 4.6666H12.642zM7.9837 7.333h3.3291v12.533c-.9555 0-1.73-.7759-1.73-1.7332V9.0662H7.9837c-1.6146 0-2.9277 1.316-2.9277 2.9334 0 1.6175 1.3131 2.9333 2.9277 2.9333h.6654v1.7332h-.6654c-2.5725 0-4.6577-2.0892-4.6577-4.6665 0-2.5771 2.0852-4.6666 4.6577-4.6666Z"
      />
    </svg>
  );
}

// Salesforce Logo - Official Simple Icons path
// Brand color: #00A1E0
export function SalesforceIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#00A1E0"
        d="M10.006 5.415a4.195 4.195 0 013.045-1.306c1.56 0 2.954.9 3.69 2.205.63-.3 1.35-.45 2.1-.45 2.85 0 5.159 2.34 5.159 5.22s-2.31 5.22-5.176 5.22c-.345 0-.69-.044-1.02-.104a3.75 3.75 0 01-3.3 1.95c-.6 0-1.155-.15-1.65-.375A4.314 4.314 0 018.88 20.4a4.302 4.302 0 01-4.05-2.82c-.27.062-.54.076-.825.076-2.204 0-4.005-1.8-4.005-4.05 0-1.5.811-2.805 2.01-3.51-.255-.57-.39-1.2-.39-1.846 0-2.58 2.1-4.65 4.65-4.65 1.53 0 2.85.705 3.72 1.8"
      />
    </svg>
  );
}

// HubSpot Logo - Official Simple Icons path
// Brand color: #FF7A59
export function HubSpotIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#FF7A59"
        d="M18.164 7.93V5.084a2.198 2.198 0 001.267-1.978v-.067A2.2 2.2 0 0017.238.845h-.067a2.2 2.2 0 00-2.193 2.193v.067a2.196 2.196 0 001.252 1.973l.013.006v2.852a6.22 6.22 0 00-2.969 1.31l.012-.01-7.828-6.095A2.497 2.497 0 104.3 4.656l-.012.006 7.697 5.991a6.176 6.176 0 00-1.038 3.446c0 1.343.425 2.588 1.147 3.607l-.013-.02-2.342 2.343a1.968 1.968 0 00-.58-.095h-.002a2.033 2.033 0 102.033 2.033 1.978 1.978 0 00-.1-.595l.005.014 2.317-2.317a6.247 6.247 0 104.782-11.134l-.036-.005zm-.964 9.378a3.206 3.206 0 113.215-3.207v.002a3.206 3.206 0 01-3.207 3.207z"
      />
    </svg>
  );
}

// Google Drive Logo - Official Simple Icons path
// Brand color: #4285F4
export function GoogleDriveIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#4285F4"
        d="M12.01 1.485c-2.082 0-3.754.02-3.743.047.01.02 1.708 3.001 3.774 6.62l3.76 6.574h3.76c2.081 0 3.753-.02 3.742-.047-.005-.02-1.708-3.001-3.775-6.62l-3.76-6.574zm-4.76 1.73a789.828 789.861 0 0 0-3.63 6.319L0 15.868l1.89 3.298 1.885 3.297 3.62-6.335 3.618-6.33-1.88-3.287C8.1 4.704 7.255 3.22 7.25 3.214zm2.259 12.653-.203.348c-.114.198-.96 1.672-1.88 3.287a423.93 423.948 0 0 1-1.698 2.97c-.01.026 3.24.042 7.222.042h7.244l1.796-3.157c.992-1.734 1.85-3.23 1.906-3.323l.104-.167h-7.249z"
      />
    </svg>
  );
}

// Default/Generic Icon for unknown sources
export function GenericIntegrationIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
    </svg>
  );
}

// Helper function to get the right icon based on source and type
export function getIntegrationIcon(type: string, source: string): React.FC<IconProps> {
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
