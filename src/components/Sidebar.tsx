'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import {
  Home,
  Link as LinkIcon,
  Plug,
  BarChart3,
  MessageSquare,
  Settings,
  Wrench,
  BarChart2,
  Cloud,
  ShoppingBag,
  ClipboardList,
  CreditCard,
  TrendingUp,
  Ticket
} from 'lucide-react';

interface SidebarProps {
  installedTools?: string[];
}

// Tool icons mapping using Lucide components
const toolIconComponents: Record<string, React.ComponentType<{ className?: string }>> = {
  'QuickBooks': BarChart2,
  'Salesforce': Cloud,
  'Shopify': ShoppingBag,
  'Slack': MessageSquare,
  'Monday.com': ClipboardList,
  'Stripe': CreditCard,
  'HubSpot': TrendingUp,
  'Zendesk': Ticket,
};

export function Sidebar({ installedTools = [] }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = usePrivy();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  const navigationItems = [
    { name: 'Overview', path: '/dashboard', icon: Home },
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-white rounded-lg shadow-lg p-2 hover:bg-gray-50"
      >
        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isMobileOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen bg-white border-r border-gray-200 shadow-lg z-40
          transition-transform duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 w-64
        `}
      >
        {/* Header */}
        <div className="h-16 border-b border-gray-200 flex items-center px-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              V
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-sm">Varity Dashboard</h1>
              <p className="text-xs text-gray-500">Powered by Varity</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        {user && (
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                {user.email?.address?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.email?.address || 'User'}
                </p>
                <button
                  onClick={logout}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {/* Main Navigation */}
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors
                    ${isActive(item.path)
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <IconComponent className="w-5 h-5" />
                  <span className="text-sm">{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-gray-200"></div>

          {/* Installed Tools */}
          <div className="space-y-1">
            <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Your Tools
            </p>
            {installedTools.length > 0 ? (
              installedTools.map((tool) => {
                const ToolIcon = toolIconComponents[tool] || Wrench;
                return (
                  <Link
                    key={tool}
                    href={`/dashboard/tools/${tool.toLowerCase().replace(/\./g, '')}`}
                    onClick={() => setIsMobileOpen(false)}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors
                      text-gray-700 hover:bg-gray-100
                    `}
                  >
                    <ToolIcon className="w-5 h-5" />
                    <span className="text-sm">{tool}</span>
                  </Link>
                );
              })
            ) : (
              <div className="px-3 py-2 text-xs text-gray-500">
                No tools installed yet
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-gray-200"></div>

          {/* Bottom Navigation */}
          <div className="space-y-1">
            <Link
              href="/integrations"
              onClick={() => setIsMobileOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors
                ${isActive('/integrations')
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              <LinkIcon className="w-5 h-5" />
              <span className="text-sm">Integrations</span>
            </Link>
            <Link
              href="/marketplace"
              onClick={() => setIsMobileOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors
                ${isActive('/marketplace')
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              <Plug className="w-5 h-5" />
              <span className="text-sm">Marketplace</span>
            </Link>
            <Link
              href="/analytics"
              onClick={() => setIsMobileOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors
                ${isActive('/analytics')
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              <BarChart3 className="w-5 h-5" />
              <span className="text-sm">Analytics</span>
            </Link>
            <Link
              href="/ai-assistant"
              onClick={() => setIsMobileOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors
                ${isActive('/ai-assistant')
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-sm">AI Assistant</span>
            </Link>
            <Link
              href="/settings"
              onClick={() => setIsMobileOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors
                ${isActive('/settings')
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              <Settings className="w-5 h-5" />
              <span className="text-sm">Settings</span>
            </Link>
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4">
          <div className="text-xs text-gray-500 text-center">
            <p className="font-medium">Powered by Varity</p>
            <p className="mt-1">Enterprise Security</p>
          </div>
        </div>
      </aside>

      {/* Spacer for fixed sidebar on desktop */}
      <div className="hidden lg:block w-64 flex-shrink-0"></div>
    </>
  );
}
