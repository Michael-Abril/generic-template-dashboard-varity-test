/**
 * IntegrationLogo Component
 *
 * Displays professional company logos for integrations
 * Uses real brand SVG logos from public/logos/ folder
 */

import React from 'react';
import Image from 'next/image';
import { BarChart3, Users, ShoppingCart, MessageSquare, ClipboardList, CreditCard, TrendingUp, Ticket, Zap, Package } from 'lucide-react';

type LogoProps = {
  integration: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const LOGO_SIZES = {
  sm: { container: 'w-8 h-8', pixels: 32 },
  md: { container: 'w-12 h-12', pixels: 48 },
  lg: { container: 'w-16 h-16', pixels: 64 },
};

// Map integration names to logo filenames
const LOGO_FILES: Record<string, string> = {
  'quickbooks': 'quickbooks.svg',
  'salesforce': 'salesforce.svg',
  'shopify': 'shopify.svg',
  'slack': 'slack.svg',
  'monday': 'monday.svg',
  'stripe': 'stripe.svg',
  'hubspot': 'hubspot.svg',
  'zendesk': 'zendesk.svg',
  'google': 'google-workspace.svg',
  'google-workspace': 'google-workspace.svg',
  'microsoft': 'microsoft-365.svg',
  'microsoft-365': 'microsoft-365.svg',
  'xero': 'xero.svg',
  'freshbooks': 'freshbooks.svg',
  'mailchimp': 'mailchimp.svg',
  'docusign': 'docusign.svg',
  'zoom': 'zoom.svg',
  'dropbox': 'dropbox.svg',
  'asana': 'asana.svg',
  'trello': 'trello.svg',
  'intercom': 'intercom.svg',
  'twilio': 'twilio.svg',
};

// Brand colors for fallback backgrounds
const BRAND_COLORS: Record<string, string> = {
  'quickbooks': 'bg-green-500',
  'salesforce': 'bg-blue-500',
  'shopify': 'bg-green-600',
  'slack': 'bg-purple-600',
  'monday': 'bg-red-500',
  'stripe': 'bg-indigo-600',
  'hubspot': 'bg-orange-500',
  'zendesk': 'bg-teal-600',
  'google': 'bg-white border-2 border-gray-200',
  'google-workspace': 'bg-white border-2 border-gray-200',
  'microsoft': 'bg-white border-2 border-gray-200',
  'microsoft-365': 'bg-white border-2 border-gray-200',
  'xero': 'bg-blue-600',
  'freshbooks': 'bg-blue-500',
  'mailchimp': 'bg-yellow-400',
  'docusign': 'bg-blue-700',
  'zoom': 'bg-blue-500',
  'dropbox': 'bg-blue-600',
  'asana': 'bg-red-400',
  'trello': 'bg-blue-500',
  'intercom': 'bg-blue-600',
  'twilio': 'bg-red-500',
};

export function IntegrationLogo({ integration, size = 'md', className = '' }: LogoProps) {
  const sizeConfig = LOGO_SIZES[size];
  const normalizedName = integration.toLowerCase().replace(/\s+/g, '-');
  const logoFile = LOGO_FILES[normalizedName];
  const brandColor = BRAND_COLORS[normalizedName] || 'bg-gray-100';

  // If we have a real logo file, use it
  if (logoFile) {
    return (
      <div className={`${sizeConfig.container} ${className} ${brandColor} rounded-lg flex items-center justify-center overflow-hidden p-1.5`}>
        <Image
          src={`/logos/${logoFile}`}
          alt={`${integration} logo`}
          width={sizeConfig.pixels}
          height={sizeConfig.pixels}
          className="object-contain w-full h-full"
        />
      </div>
    );
  }

  // Fallback: Show first letter with brand color
  return (
    <div className={`${sizeConfig.container} ${className} ${brandColor || 'bg-gray-200'} rounded-lg flex items-center justify-center`}>
      <span className="text-white font-bold text-sm">
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
  const iconClass = "w-5 h-5";

  const icons: Record<string, JSX.Element> = {
    'Accounting': <BarChart3 className={iconClass} />,
    'CRM': <Users className={iconClass} />,
    'E-commerce': <ShoppingCart className={iconClass} />,
    'Communication': <MessageSquare className={iconClass} />,
    'Project Management': <ClipboardList className={iconClass} />,
    'Payments': <CreditCard className={iconClass} />,
    'Marketing': <TrendingUp className={iconClass} />,
    'Customer Support': <Ticket className={iconClass} />,
    'Productivity': <Zap className={iconClass} />,
  };

  return icons[category] || <Package className={iconClass} />;
}
