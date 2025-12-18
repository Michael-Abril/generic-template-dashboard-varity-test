/**
 * IntegrationLogo Component
 *
 * Displays professional company logos for integrations
 * Uses real brand SVG logos from public/logos/ folder
 */

import React from 'react';
import { BarChart3, Users, ShoppingCart, MessageSquare, ClipboardList, CreditCard, TrendingUp, Ticket, Zap, Package } from 'lucide-react';

type LogoProps = {
  integration: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const LOGO_SIZES = {
  sm: { container: 'w-8 h-8', imgSize: 20 },
  md: { container: 'w-12 h-12', imgSize: 32 },
  lg: { container: 'w-16 h-16', imgSize: 44 },
};

// Map integration names to logo filenames
const LOGO_FILES: Record<string, string> = {
  'quickbooks': 'quickbooks.svg',
  'salesforce': 'salesforce.svg',
  'shopify': 'shopify.svg',
  'slack': 'slack.svg',
  'monday': 'monday.svg',
  'monday.com': 'monday.svg',
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
  'calendly': 'calendly.svg',
  'canva': 'canva.svg',
  'gusto': 'gusto.svg',
  'paypal': 'paypal.svg',
  'square': 'square.svg',
};

// Brand colors for backgrounds
const BRAND_COLORS: Record<string, string> = {
  'quickbooks': 'bg-[#2CA01C]',
  'salesforce': 'bg-[#00A1E0]',
  'shopify': 'bg-[#96BF48]',
  'slack': 'bg-[#4A154B]',
  'monday': 'bg-[#FF3D57]',
  'stripe': 'bg-[#635BFF]',
  'hubspot': 'bg-[#FF7A59]',
  'zendesk': 'bg-[#03363D]',
  'google': 'bg-white border border-gray-200',
  'google-workspace': 'bg-white border border-gray-200',
  'microsoft': 'bg-white border border-gray-200',
  'microsoft-365': 'bg-white border border-gray-200',
  'xero': 'bg-[#13B5EA]',
  'freshbooks': 'bg-[#0075DD]',
  'mailchimp': 'bg-[#FFE01B]',
  'docusign': 'bg-[#FFCC22]',
  'zoom': 'bg-[#2D8CFF]',
  'dropbox': 'bg-[#0061FF]',
  'asana': 'bg-[#F06A6A]',
  'trello': 'bg-[#0079BF]',
  'intercom': 'bg-[#1F8DED]',
  'twilio': 'bg-[#F22F46]',
  'monday.com': 'bg-[#FF3D57]',
  'square': 'bg-white border border-gray-200',
  'paypal': 'bg-[#003087]',
  'gusto': 'bg-[#F45D48]',
  'calendly': 'bg-[#006BFF]',
  'canva': 'bg-[#00C4CC]',
};

export function IntegrationLogo({ integration, size = 'md', className = '' }: LogoProps) {
  const sizeConfig = LOGO_SIZES[size];
  const normalizedName = integration.toLowerCase().replace(/\s+/g, '-');
  const logoFile = LOGO_FILES[normalizedName];
  const brandColor = BRAND_COLORS[normalizedName] || 'bg-gray-100';

  // Logos that should NOT be inverted (they're already multi-colored or on white bg)
  const noInvertLogos = ['google', 'google-workspace', 'microsoft', 'microsoft-365', 'mailchimp', 'docusign', 'square'];
  const shouldInvert = !noInvertLogos.includes(normalizedName);

  // If we have a real logo file, use it with img tag (better SVG support)
  if (logoFile) {
    return (
      <div className={`${sizeConfig.container} ${className} ${brandColor} rounded-lg flex items-center justify-center overflow-hidden p-2`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/logos/${logoFile}`}
          alt={`${integration} logo`}
          width={sizeConfig.imgSize}
          height={sizeConfig.imgSize}
          className="object-contain"
          style={shouldInvert ? { filter: 'brightness(0) invert(1)' } : undefined}
        />
      </div>
    );
  }

  // Fallback: Show first letter with brand color
  return (
    <div className={`${sizeConfig.container} ${className} ${brandColor} rounded-lg flex items-center justify-center`}>
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
