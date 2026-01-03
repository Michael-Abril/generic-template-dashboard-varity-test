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
  CheckSquare,
  Map,
  Store
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

  const isActive = (path: string) => pathname === path;

  // Primary navigation - most important items at top
  const primaryNavItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'AI Assistant', path: '/ai-assistant', icon: Bot },
  ];

  // Planning section
  const planningItems = [
    { name: 'Tasks', path: '/dashboard/tasks', icon: CheckSquare },
    { name: 'Roadmap', path: '/dashboard/roadmap', icon: Map },
  ];

  // Bottom navigation
  const bottomNavItems = [
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Marketplace', path: '/marketplace', icon: Store },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

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
          transition-transform duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 w-64
        `}
      >
        {/* Header */}
        <div className="h-16 border-b border-gray-200 flex items-center px-6">
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
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-3">
              {/* Profile Picture - Show initial letter in gradient circle */}
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                {(user.google?.name?.[0] || user.email?.address?.[0] || 'U').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                {/* Display Name - Use Google name if available, else email */}
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

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3" aria-label="Dashboard navigation">
          {/* Primary Navigation - Dashboard & AI Assistant at top */}
          <div className="space-y-1">
            {primaryNavItems.map((item) => {
              const IconComponent = item.icon;
              const isAI = item.path === '/ai-assistant';
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  aria-current={isActive(item.path) ? 'page' : undefined}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200
                    ${isActive(item.path)
                      ? isAI
                        ? 'bg-gradient-to-r from-purple-50 to-blue-50 text-purple-700 shadow-sm border border-purple-100'
                        : 'bg-blue-50 text-blue-700 shadow-sm'
                      : isAI
                        ? 'text-purple-600 hover:bg-purple-50 hover:translate-x-1'
                        : 'text-gray-700 hover:bg-gray-100 hover:translate-x-1'
                    }
                  `}
                >
                  <IconComponent className={`w-5 h-5 ${isAI ? 'text-purple-500' : ''}`} />
                  <span className="text-sm">{item.name}</span>
                  {isAI && (
                    <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-100 text-purple-600">
                      AI
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-gray-200"></div>

          {/* Integrations Section */}
          <div className="space-y-1">
            <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Integrations
            </p>
            {installedTools.length > 0 ? (
              <>
                {installedTools.map((tool) => {
                  const ToolIcon = toolIconComponents[tool] || Wrench;
                  return (
                    <Link
                      key={tool}
                      href={`/dashboard/tools/${tool.toLowerCase().replace(/[\s.]/g, '').replace('_', '')}`}
                      onClick={() => setIsMobileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors text-gray-700 hover:bg-gray-100"
                    >
                      <ToolIcon className="w-5 h-5" />
                      <span className="text-sm">{tool}</span>
                    </Link>
                  );
                })}
                <Link
                  href="/marketplace"
                  onClick={() => setIsMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add more</span>
                </Link>
              </>
            ) : (
              <Link
                href="/marketplace"
                onClick={() => setIsMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors border border-dashed border-gray-300"
              >
                <Plus className="w-4 h-4" />
                <span>Connect your first tool</span>
              </Link>
            )}
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-gray-200"></div>

          {/* Planning Section */}
          <div className="space-y-1">
            <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Planning
            </p>
            {planningItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  aria-current={isActive(item.path) ? 'page' : undefined}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200
                    ${isActive(item.path)
                      ? 'bg-blue-50 text-blue-700 shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100 hover:translate-x-1'
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

          {/* Bottom Navigation */}
          <div className="space-y-1">
            {bottomNavItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  aria-current={isActive(item.path) ? 'page' : undefined}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200
                    ${isActive(item.path)
                      ? 'bg-blue-50 text-blue-700 shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100 hover:translate-x-1'
                    }
                  `}
                >
                  <IconComponent className="w-5 h-5" />
                  <span className="text-sm">{item.name}</span>
                </Link>
              );
            })}
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
