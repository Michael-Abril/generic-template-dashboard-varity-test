/**
 * IntegrationLogo Component
 *
 * Displays professional company logos for integrations
 * Uses inline SVG for quality and performance
 */

import React from 'react';

type LogoProps = {
  integration: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const LOGO_SIZES = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
};

export function IntegrationLogo({ integration, size = 'md', className = '' }: LogoProps) {
  const sizeClass = LOGO_SIZES[size];

  // Logo background colors matching brand guidelines
  const logos: Record<string, JSX.Element> = {
    quickbooks: (
      <div className={`${sizeClass} ${className} bg-green-500 rounded-lg flex items-center justify-center`}>
        <svg viewBox="0 0 24 24" fill="white" className="w-2/3 h-2/3">
          <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
        </svg>
      </div>
    ),
    salesforce: (
      <div className={`${sizeClass} ${className} bg-blue-500 rounded-lg flex items-center justify-center`}>
        <svg viewBox="0 0 24 24" fill="white" className="w-2/3 h-2/3">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      </div>
    ),
    shopify: (
      <div className={`${sizeClass} ${className} bg-green-600 rounded-lg flex items-center justify-center`}>
        <svg viewBox="0 0 24 24" fill="white" className="w-2/3 h-2/3">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
        </svg>
      </div>
    ),
    slack: (
      <div className={`${sizeClass} ${className} bg-purple-600 rounded-lg flex items-center justify-center`}>
        <span className="text-white font-bold text-sm">#</span>
      </div>
    ),
    monday: (
      <div className={`${sizeClass} ${className} bg-red-500 rounded-lg flex items-center justify-center`}>
        <svg viewBox="0 0 24 24" fill="white" className="w-2/3 h-2/3">
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
        </svg>
      </div>
    ),
    stripe: (
      <div className={`${sizeClass} ${className} bg-indigo-600 rounded-lg flex items-center justify-center`}>
        <svg viewBox="0 0 24 24" fill="white" className="w-2/3 h-2/3">
          <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
        </svg>
      </div>
    ),
    hubspot: (
      <div className={`${sizeClass} ${className} bg-orange-500 rounded-lg flex items-center justify-center`}>
        <svg viewBox="0 0 24 24" fill="white" className="w-2/3 h-2/3">
          <circle cx="8" cy="12" r="3"/>
          <circle cx="16" cy="12" r="3"/>
          <path d="M8 15c0 3.31 2.69 6 6 6h4v-2h-4c-2.21 0-4-1.79-4-4H8z"/>
        </svg>
      </div>
    ),
    zendesk: (
      <div className={`${sizeClass} ${className} bg-teal-600 rounded-lg flex items-center justify-center`}>
        <svg viewBox="0 0 24 24" fill="white" className="w-2/3 h-2/3">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 9h-2V5h2v6zm0 4h-2v-2h2v2z"/>
        </svg>
      </div>
    ),
    google: (
      <div className={`${sizeClass} ${className} bg-white rounded-lg flex items-center justify-center border-2 border-gray-200`}>
        <svg viewBox="0 0 24 24" className="w-2/3 h-2/3">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      </div>
    ),
    microsoft: (
      <div className={`${sizeClass} ${className} bg-white rounded-lg flex items-center justify-center border-2 border-gray-200`}>
        <svg viewBox="0 0 24 24" className="w-2/3 h-2/3">
          <rect fill="#F25022" x="1" y="1" width="10" height="10"/>
          <rect fill="#00A4EF" x="13" y="1" width="10" height="10"/>
          <rect fill="#7FBA00" x="1" y="13" width="10" height="10"/>
          <rect fill="#FFB900" x="13" y="13" width="10" height="10"/>
        </svg>
      </div>
    ),
  };

  return logos[integration.toLowerCase()] || (
    <div className={`${sizeClass} ${className} bg-gray-200 rounded-lg flex items-center justify-center`}>
      <span className="text-gray-600 font-bold text-xs">
        {integration.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

/**
 * CategoryIcon Component
 * Displays icons for integration categories
 */
export function CategoryIcon({ category }: { category: string }) {
  const icons: Record<string, string> = {
    'Accounting': '📊',
    'CRM': '👥',
    'E-commerce': '🛒',
    'Communication': '💬',
    'Project Management': '📋',
    'Payments': '💳',
    'Marketing': '📈',
    'Customer Support': '🎫',
    'Productivity': '⚡',
  };

  return <span className="text-xl">{icons[category] || '📦'}</span>;
}
