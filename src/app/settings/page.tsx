'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { User, Bell, CreditCard, Users, Lock, Database } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

/**
 * Settings Page
 *
 * Comprehensive settings management for the business dashboard
 * - Account Information
 * - Notification Preferences
 * - Billing & Subscription
 * - Team Management
 * - Security Settings
 * - Data Export/Import
 */

type SettingsTab = 'account' | 'notifications' | 'billing' | 'team' | 'security' | 'data';

export default function SettingsPage() {
  const { authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const address = wallets[0]?.address;
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [saving, setSaving] = useState(false);

  // Account settings state
  const [companyName, setCompanyName] = useState('My Business Inc.');
  const [contactEmail, setContactEmail] = useState(user?.email?.address || '');
  const [industry, setIndustry] = useState('Technology');
  const [timezone, setTimezone] = useState('America/New_York');

  // Notification settings state
  const [emailNotifications, setEmailNotifications] = useState({
    weeklyReport: true,
    integrationUpdates: true,
    billingAlerts: true,
    securityAlerts: true,
    newFeatures: false,
  });

  // Redirect if not authenticated
  if (!authenticated) {
    router.push('/');
    return null;
  }

  const handleSaveSettings = async () => {
    setSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    toast.success('Settings saved', 'Your changes have been saved successfully.');
  };

  const tabs = [
    { id: 'account' as SettingsTab, label: 'Account', icon: User },
    { id: 'notifications' as SettingsTab, label: 'Notifications', icon: Bell },
    { id: 'billing' as SettingsTab, label: 'Billing', icon: CreditCard },
    { id: 'team' as SettingsTab, label: 'Team', icon: Users },
    { id: 'security' as SettingsTab, label: 'Security', icon: Lock },
    { id: 'data' as SettingsTab, label: 'Data', icon: Database },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-6">
        <div className="px-4 sm:px-6">

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <Link href="/dashboard" className="hover:text-gray-700">Dashboard</Link>
              <span>/</span>
              <span className="text-gray-900 font-medium">Settings</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Settings
            </h1>
            <p className="text-gray-600">
              Manage your account, billing, team, and preferences
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

            {/* Sidebar Navigation */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <nav className="flex flex-col">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-3 px-6 py-4 text-left transition-all ${
                        activeTab === tab.id
                          ? 'bg-blue-50 border-l-4 border-blue-600 text-blue-700 font-semibold'
                          : 'text-gray-700 hover:bg-gray-50 border-l-4 border-transparent'
                      }`}
                    >
                      <tab.icon className="w-5 h-5" />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">

                {/* Account Settings */}
                {activeTab === 'account' && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Account Information</h2>

                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Company Name
                        </label>
                        <input
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                          placeholder="Enter company name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Contact Email
                        </label>
                        <input
                          type="email"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                          placeholder="contact@company.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Industry
                        </label>
                        <select
                          value={industry}
                          onChange={(e) => setIndustry(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white"
                        >
                          <option>Technology</option>
                          <option>Finance</option>
                          <option>Healthcare</option>
                          <option>Retail</option>
                          <option>Manufacturing</option>
                          <option>Professional Services</option>
                          <option>Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Timezone
                        </label>
                        <select
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white"
                        >
                          <option value="America/New_York">Eastern Time (ET)</option>
                          <option value="America/Chicago">Central Time (CT)</option>
                          <option value="America/Denver">Mountain Time (MT)</option>
                          <option value="America/Los_Angeles">Pacific Time (PT)</option>
                          <option value="Europe/London">London (GMT)</option>
                          <option value="Europe/Paris">Paris (CET)</option>
                          <option value="Asia/Tokyo">Tokyo (JST)</option>
                        </select>
                      </div>

                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Account ID</p>
                        <p className="font-mono text-sm text-gray-900 break-all">{address || 'Not connected'}</p>
                      </div>

                      <button
                        onClick={handleSaveSettings}
                        disabled={saving}
                        className={`w-full py-3 rounded-lg font-semibold transition-all ${
                          saving
                            ? 'bg-gray-300 text-gray-500 cursor-wait'
                            : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                        }`}
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Notification Settings */}
                {activeTab === 'notifications' && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Notification Preferences</h2>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-4 border-b border-gray-200">
                        <div>
                          <h3 className="font-semibold text-gray-900">Weekly Summary Report</h3>
                          <p className="text-sm text-gray-600">Receive weekly analytics and insights</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={emailNotifications.weeklyReport}
                            onChange={(e) => setEmailNotifications({...emailNotifications, weeklyReport: e.target.checked})}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between py-4 border-b border-gray-200">
                        <div>
                          <h3 className="font-semibold text-gray-900">Integration Updates</h3>
                          <p className="text-sm text-gray-600">Get notified when integrations sync or encounter issues</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={emailNotifications.integrationUpdates}
                            onChange={(e) => setEmailNotifications({...emailNotifications, integrationUpdates: e.target.checked})}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between py-4 border-b border-gray-200">
                        <div>
                          <h3 className="font-semibold text-gray-900">Billing Alerts</h3>
                          <p className="text-sm text-gray-600">Notifications about payments and invoices</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={emailNotifications.billingAlerts}
                            onChange={(e) => setEmailNotifications({...emailNotifications, billingAlerts: e.target.checked})}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between py-4 border-b border-gray-200">
                        <div>
                          <h3 className="font-semibold text-gray-900">Security Alerts</h3>
                          <p className="text-sm text-gray-600">Important security and access notifications</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={emailNotifications.securityAlerts}
                            onChange={(e) => setEmailNotifications({...emailNotifications, securityAlerts: e.target.checked})}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between py-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">New Features</h3>
                          <p className="text-sm text-gray-600">Updates about new integrations and features</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={emailNotifications.newFeatures}
                            onChange={(e) => setEmailNotifications({...emailNotifications, newFeatures: e.target.checked})}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <button
                        onClick={handleSaveSettings}
                        disabled={saving}
                        className={`w-full py-3 rounded-lg font-semibold transition-all mt-6 ${
                          saving
                            ? 'bg-gray-300 text-gray-500 cursor-wait'
                            : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                        }`}
                      >
                        {saving ? 'Saving...' : 'Save Preferences'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Billing Settings */}
                {activeTab === 'billing' && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Billing & Subscription</h2>

                    <div className="space-y-6">
                      {/* Current Plan */}
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">Pay As You Go</h3>
                            <p className="text-sm text-gray-600">Only pay for what you use</p>
                          </div>
                          <div className="text-right">
                            <p className="text-3xl font-bold text-blue-600">$197</p>
                            <p className="text-sm text-gray-600">per month</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Active Integrations</p>
                            <p className="font-semibold text-gray-900">3 tools</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Next Billing Date</p>
                            <p className="font-semibold text-gray-900">Dec 15, 2025</p>
                          </div>
                        </div>
                      </div>

                      {/* Active Subscriptions */}
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-4">Active Subscriptions</h3>
                        <div className="space-y-3">
                          {[
                            { name: 'QuickBooks', price: 99 },
                            { name: 'Salesforce', price: 150 },
                            { name: 'Shopify', price: 79 },
                          ].map((sub, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                              <span className="font-medium text-gray-900">{sub.name}</span>
                              <div className="flex items-center gap-4">
                                <span className="text-gray-600">${sub.price}/month</span>
                                <button className="text-red-600 hover:text-red-700 text-sm font-semibold">
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Payment Method */}
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-4">Payment Method</h3>
                        <div className="border border-gray-300 rounded-lg p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded flex items-center justify-center text-white font-bold text-xs">
                              CARD
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">•••• •••• •••• 4242</p>
                              <p className="text-sm text-gray-600">Expires 12/2026</p>
                            </div>
                          </div>
                          <button className="text-blue-600 hover:text-blue-700 text-sm font-semibold">
                            Update
                          </button>
                        </div>
                      </div>

                      {/* Billing History */}
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-4">Billing History</h3>
                        <div className="space-y-2">
                          {[
                            { date: 'Nov 15, 2025', amount: 197, status: 'Paid' },
                            { date: 'Oct 15, 2025', amount: 197, status: 'Paid' },
                            { date: 'Sep 15, 2025', amount: 150, status: 'Paid' },
                          ].map((invoice, i) => (
                            <div key={i} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                              <span className="text-gray-700">{invoice.date}</span>
                              <div className="flex items-center gap-4">
                                <span className="font-medium text-gray-900">${invoice.amount}</span>
                                <span className="text-green-600 text-sm">{invoice.status}</span>
                                <button className="text-blue-600 hover:text-blue-700 text-sm">
                                  Download
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Team Settings */}
                {activeTab === 'team' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">Team Management</h2>
                      <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-sm font-semibold">
                        + Invite Member
                      </button>
                    </div>

                    <div className="space-y-4">
                      {[
                        { name: 'You', email: contactEmail, role: 'Owner', status: 'Active' },
                        { name: 'Sarah Johnson', email: 'sarah@company.com', role: 'Admin', status: 'Active' },
                        { name: 'Mike Chen', email: 'mike@company.com', role: 'Member', status: 'Active' },
                        { name: 'Lisa Martinez', email: 'lisa@company.com', role: 'Member', status: 'Pending' },
                      ].map((member, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                              {member.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{member.name}</p>
                              <p className="text-sm text-gray-600">{member.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                              member.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {member.status}
                            </span>
                            <select
                              value={member.role}
                              disabled={member.role === 'Owner'}
                              className="px-3 py-1 border border-gray-300 rounded text-sm bg-white disabled:bg-gray-100"
                            >
                              <option>Owner</option>
                              <option>Admin</option>
                              <option>Member</option>
                              <option>Viewer</option>
                            </select>
                            {member.role !== 'Owner' && (
                              <button className="text-red-600 hover:text-red-700 text-sm">
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2">Team Roles</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li><strong>Owner:</strong> Full access to all settings and billing</li>
                        <li><strong>Admin:</strong> Can manage integrations and team members</li>
                        <li><strong>Member:</strong> Can view and use integrations</li>
                        <li><strong>Viewer:</strong> Read-only access to dashboards</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Security Settings */}
                {activeTab === 'security' && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Security Settings</h2>

                    <div className="space-y-6">
                      {/* Password */}
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-4">Password</h3>
                        <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 font-semibold">
                          Change Password
                        </button>
                      </div>

                      {/* Two-Factor Authentication */}
                      <div className="border-t border-gray-200 pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900">Two-Factor Authentication</h3>
                            <p className="text-sm text-gray-600 mt-1">Add an extra layer of security to your account</p>
                          </div>
                          <button className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-sm font-semibold">
                            Enable 2FA
                          </button>
                        </div>
                      </div>

                      {/* Active Sessions */}
                      <div className="border-t border-gray-200 pt-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Active Sessions</h3>
                        <div className="space-y-3">
                          {[
                            { device: 'Chrome on Mac', location: 'New York, US', time: 'Current session' },
                            { device: 'Safari on iPhone', location: 'New York, US', time: '2 hours ago' },
                          ].map((session, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium text-gray-900">{session.device}</p>
                                <p className="text-sm text-gray-600">{session.location} • {session.time}</p>
                              </div>
                              {i !== 0 && (
                                <button className="text-red-600 hover:text-red-700 text-sm font-semibold">
                                  Revoke
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Security Log */}
                      <div className="border-t border-gray-200 pt-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Recent Security Activity</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between py-2">
                            <span className="text-gray-700">Login from new device</span>
                            <span className="text-gray-500">2 hours ago</span>
                          </div>
                          <div className="flex justify-between py-2">
                            <span className="text-gray-700">Password changed</span>
                            <span className="text-gray-500">3 days ago</span>
                          </div>
                          <div className="flex justify-between py-2">
                            <span className="text-gray-700">New integration added</span>
                            <span className="text-gray-500">5 days ago</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Data Settings */}
                {activeTab === 'data' && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Data Management</h2>

                    <div className="space-y-6">
                      {/* Export Data */}
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Export Your Data</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Download a complete copy of your business data in JSON format
                        </p>
                        <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 font-semibold">
                          Export All Data
                        </button>
                      </div>

                      {/* Import Data */}
                      <div className="border-t border-gray-200 pt-6">
                        <h3 className="font-semibold text-gray-900 mb-2">Import Data</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Upload data from previous exports or other systems
                        </p>
                        <button className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-all font-semibold">
                          Import Data
                        </button>
                      </div>

                      {/* Storage Usage */}
                      <div className="border-t border-gray-200 pt-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Storage Usage</h3>
                        <div className="bg-gray-50 rounded-lg p-6">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-700">Used Storage</span>
                            <span className="font-bold text-gray-900">2.4 GB / Unlimited</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div className="bg-blue-600 h-3 rounded-full" style={{width: '12%'}}></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">Encrypted secure storage</p>
                        </div>
                      </div>

                      {/* Delete Account */}
                      <div className="border-t border-gray-200 pt-6">
                        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
                          <h3 className="font-semibold text-red-900 mb-2">Delete Account</h3>
                          <p className="text-sm text-red-800 mb-4">
                            Permanently delete your account and all associated data. This action cannot be undone.
                          </p>
                          <button className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-all font-semibold">
                            Delete Account
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
