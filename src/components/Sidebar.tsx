'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import {
  Home,
  Bot,
  Plus,
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
  Ticket,
  Store,
  Link2
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
  'Microsoft 365': Cloud,
  'Google_Workspace': Cloud,
  'Google Workspace': Cloud,
};

export function Sidebar({ installedTools = [] }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = usePrivy();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-white rounded-lg shadow-lg p-2 hover:bg-gray-50"
        aria-label={isMobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={isMobileOpen}
        aria-controls="main-sidebar"
      >
        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
        id="main-sidebar"
        role="navigation"
        aria-label="Main sidebar"
        className={`
          fixed top-0 left-0 h-screen bg-white border-r border-gray-200 shadow-lg z-40
          transition-transform duration-300 ease-in-out flex flex-col
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 w-64
        `}
      >
        {/* Header */}
        <div className="h-16 border-b border-gray-200 flex items-center px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/varity-logo.png"
              alt="Varity"
              className="w-8 h-8 object-contain"
            />
            <div>
              <h1 className="font-bold text-gray-900 text-sm">Varity Dashboard</h1>
              <p className="text-xs text-gray-500">Powered by Varity</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        {user && (
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                {(user.google?.name?.[0] || user.email?.address?.[0] || 'U').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.google?.name || user.email?.address?.split('@')[0] || 'User'}
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

        {/* Main Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-auto py-4 px-3" aria-label="Dashboard navigation">
          {/* Primary Navigation - Core Features */}
          <div className="space-y-1">
            <Link
              href="/dashboard"
              onClick={() => setIsMobileOpen(false)}
              aria-current={pathname === '/dashboard' ? 'page' : undefined}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors
                ${pathname === '/dashboard'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              <Home className="w-5 h-5" />
              <span className="text-sm">Dashboard</span>
            </Link>

            <Link
              href="/ai-assistant"
              onClick={() => setIsMobileOpen(false)}
              aria-current={isActive('/ai-assistant') ? 'page' : undefined}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors
                ${isActive('/ai-assistant')
                  ? 'bg-gradient-to-r from-purple-50 to-blue-50 text-purple-700 border border-purple-100'
                  : 'text-purple-600 hover:bg-purple-50'
                }
              `}
            >
              <Bot className="w-5 h-5" />
              <span className="text-sm">AI Assistant</span>
              <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-100 text-purple-600">
                AI
              </span>
            </Link>
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-gray-200"></div>

          {/* Integrations Section */}
          <div className="space-y-1">
            <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Your Integrations
            </p>

            {/* Always show Integrations page link */}
            <Link
              href="/integrations"
              onClick={() => setIsMobileOpen(false)}
              aria-current={isActive('/integrations') ? 'page' : undefined}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors
                ${isActive('/integrations')
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              <Link2 className="w-5 h-5" />
              <span className="text-sm">Manage Integrations</span>
            </Link>

            {/* Connected Tools */}
            {installedTools.length > 0 ? (
              <>
                {installedTools.map((tool) => {
                  const ToolIcon = toolIconComponents[tool] || Wrench;
                  const toolPath = `/dashboard/tools/${tool.toLowerCase().replace(/[\s.]/g, '').replace('_', '')}`;
                  return (
                    <Link
                      key={tool}
                      href={toolPath}
                      onClick={() => setIsMobileOpen(false)}
                      aria-current={isActive(toolPath) ? 'page' : undefined}
                      className={`
                        flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                        ${isActive(toolPath)
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-100'
                        }
                      `}
                    >
                      <ToolIcon className="w-4 h-4" />
                      <span>{tool}</span>
                    </Link>
                  );
                })}
              </>
            ) : (
              <Link
                href="/marketplace"
                onClick={() => setIsMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors border border-dashed border-gray-300 mx-1"
              >
                <Plus className="w-4 h-4" />
                <span>Connect your first tool</span>
              </Link>
            )}
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-gray-200"></div>

          {/* Insights Section */}
          <div className="space-y-1">
            <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Insights
            </p>
            <Link
              href="/analytics"
              onClick={() => setIsMobileOpen(false)}
              aria-current={isActive('/analytics') ? 'page' : undefined}
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
          </div>
        </nav>

        {/* Bottom Navigation - Utility (Always at bottom) */}
        <div className="border-t border-gray-200 p-3 flex-shrink-0">
          <div className="space-y-1">
            <Link
              href="/marketplace"
              onClick={() => setIsMobileOpen(false)}
              aria-current={isActive('/marketplace') ? 'page' : undefined}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors
                ${isActive('/marketplace')
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              <Store className="w-5 h-5" />
              <span className="text-sm">Marketplace</span>
            </Link>

            <Link
              href="/settings"
              onClick={() => setIsMobileOpen(false)}
              aria-current={isActive('/settings') ? 'page' : undefined}
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

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-500 text-center">
              <p className="font-medium">Powered by Varity</p>
              <p className="mt-0.5">Enterprise Security</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Spacer for fixed sidebar on desktop */}
      <div className="hidden lg:block w-64 flex-shrink-0"></div>
    </>
  );
}
