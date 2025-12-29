'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { User, Bell, CreditCard, Users, Lock, Database, Download, Upload, Trash2, UserPlus, X, Crown, Shield, UserCheck, Eye, Check, X as XIcon, HardDrive } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

/**
 * Settings Page
 *
 * Comprehensive settings management for the business dashboard
 * - Account Information (ACTIVE)
 * - Notification Preferences (ACTIVE)
 * - Billing & Subscription (COMING SOON)
 * - Team Management (ACTIVE)
 * - Security Settings (COMING SOON - Managed by Privy)
 * - Data Export/Import (ACTIVE)
 */

type SettingsTab = 'account' | 'notifications' | 'billing' | 'team' | 'security' | 'data';

interface StorageIntegration {
  file_count: number;
  data_types: string[];
  total_bytes: number;
  total_size_formatted: string;
  latest_sync: string;
}

interface StorageUsageData {
  success: boolean;
  total_files: number;
  total_bytes: number;
  total_size_formatted: string;
  integrations: Record<string, StorageIntegration>;
}

// Tabs that are disabled (coming soon)
const DISABLED_TABS: SettingsTab[] = ['billing', 'security'];

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'active' | 'pending';
  wallet_address?: string;
}

// Role definitions with icons, descriptions, and permissions
const ROLE_DEFINITIONS = {
  owner: {
    id: 'owner' as const,
    label: 'Owner',
    icon: Crown,
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    description: 'Full control over the entire organization. Can manage billing, delete the company, and perform all actions.',
    permissions: [
      { label: 'Full dashboard access', allowed: true },
      { label: 'Manage all integrations', allowed: true },
      { label: 'Invite & remove team members', allowed: true },
      { label: 'Access billing & payments', allowed: true },
      { label: 'Delete company account', allowed: true },
    ],
  },
  admin: {
    id: 'admin' as const,
    label: 'Admin',
    icon: Shield,
    color: 'from-blue-500 to-indigo-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    description: 'Manage day-to-day operations. Full access except billing and account deletion.',
    permissions: [
      { label: 'Full dashboard access', allowed: true },
      { label: 'Manage all integrations', allowed: true },
      { label: 'Invite & remove team members', allowed: true },
      { label: 'Access billing & payments', allowed: false },
      { label: 'Delete company account', allowed: false },
    ],
  },
  member: {
    id: 'member' as const,
    label: 'Member',
    icon: UserCheck,
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700',
    description: 'Standard team member access. Can use integrations and view data, but cannot change settings.',
    permissions: [
      { label: 'View dashboards & analytics', allowed: true },
      { label: 'Use connected integrations', allowed: true },
      { label: 'Export data & reports', allowed: true },
      { label: 'Manage team or settings', allowed: false },
      { label: 'Connect new integrations', allowed: false },
    ],
  },
  viewer: {
    id: 'viewer' as const,
    label: 'Viewer',
    icon: Eye,
    color: 'from-gray-400 to-gray-500',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-600',
    description: 'Read-only access for stakeholders. Can view dashboards but cannot make any changes.',
    permissions: [
      { label: 'View dashboards & analytics', allowed: true },
      { label: 'View integration data', allowed: true },
      { label: 'Export data & reports', allowed: false },
      { label: 'Make any changes', allowed: false },
      { label: 'Access settings', allowed: false },
    ],
  },
};

export default function SettingsPage() {
  const { authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const address = wallets?.[0]?.address;
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Account settings state
  const [companyName, setCompanyName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [industry, setIndustry] = useState('Technology / Software');
  const [timezone, setTimezone] = useState('America/New_York');
  const [companySize, setCompanySize] = useState('');
  const [contactName, setContactName] = useState('');
  const [referralSource, setReferralSource] = useState('');

  // Notification settings state
  const [emailNotifications, setEmailNotifications] = useState({
    weeklyReport: true,
    integrationUpdates: true,
    billingAlerts: true,
    securityAlerts: true,
    newFeatures: false,
  });

  // Team state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [inviting, setInviting] = useState(false);

  // Role selection modal state
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedMemberForRole, setSelectedMemberForRole] = useState<TeamMember | null>(null);
  const [pendingRole, setPendingRole] = useState<'admin' | 'member' | 'viewer' | null>(null);

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Storage usage state
  const [storageData, setStorageData] = useState<StorageUsageData | null>(null);
  const [storageLoading, setStorageLoading] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authenticated) {
      router.push('/');
    }
  }, [authenticated, router]);

  // Load settings from backend on mount
  useEffect(() => {
    const loadSettings = async () => {
      if (!address) return;

      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/settings?wallet_address=${address}`);
        if (response.ok) {
          const data = await response.json();
          // Populate account settings
          setCompanyName(data.company_name || '');
          setIndustry(data.industry || 'Technology / Software');
          setTimezone(data.timezone || 'America/New_York');
          setCompanySize(data.company_size || '');
          setContactName(data.contact_name || '');
          setReferralSource(data.referral_source || '');
          // Populate notification settings
          if (data.notification_preferences) {
            setEmailNotifications({
              weeklyReport: data.notification_preferences.weekly_summary ?? true,
              integrationUpdates: data.notification_preferences.integration_updates ?? true,
              billingAlerts: data.notification_preferences.billing_alerts ?? true,
              securityAlerts: data.notification_preferences.security_alerts ?? true,
              newFeatures: data.notification_preferences.new_features ?? false,
            });
          }
          // Set contact email - prioritize backend data over Privy user email
          setContactEmail(data.contact_email || user?.email?.address || '');
        } else {
          // If backend fetch fails, fall back to Privy user email
          setContactEmail(user?.email?.address || '');
        }

        // Load team members
        await loadTeamMembers();

      } catch (error) {
        console.error('Error loading settings:', error);
        // Use defaults on error
        setContactEmail(user?.email?.address || '');
      } finally {
        setLoading(false);
      }
    };

    if (address) {
      loadSettings();
    }
  }, [address, user?.email?.address]);

  // Load team members
  const loadTeamMembers = async () => {
    if (!address) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/team?wallet_address=${address}`);
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.members || []);
      } else {
        // Default to showing current user as owner
        setTeamMembers([{
          id: '1',
          name: 'You',
          email: user?.email?.address || address?.slice(0, 10) + '...',
          role: 'owner',
          status: 'active',
          wallet_address: address
        }]);
      }
    } catch (error) {
      // Default to showing current user as owner
      setTeamMembers([{
        id: '1',
        name: 'You',
        email: user?.email?.address || address?.slice(0, 10) + '...',
        role: 'owner',
        status: 'active',
        wallet_address: address
      }]);
    }
  };

  // Fetch storage usage
  const fetchStorageUsage = async () => {
    if (!address) return;
    setStorageLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/storage-usage?wallet_address=${address}`);
      if (response.ok) {
        const data = await response.json();
        setStorageData(data);
      }
    } catch (error) {
      console.error('Error fetching storage usage:', error);
    } finally {
      setStorageLoading(false);
    }
  };

  // Load storage usage when activeTab is 'data'
  useEffect(() => {
    if (activeTab === 'data' && address && !storageData) {
      fetchStorageUsage();
    }
  }, [activeTab, address]);

  // Format relative time
  const formatRelativeTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      return date.toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  // Show loading while checking authentication
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading settings...</p>
        </div>
      </div>
    );
  }

  // Save account settings
  const handleSaveAccountSettings = async () => {
    if (!address) {
      toast.error('Error', 'Wallet not connected');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/settings?wallet_address=${address}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName,
          industry: industry,
          timezone: timezone,
          company_size: companySize || null,
          contact_name: contactName || null,
          referral_source: referralSource || null,
        }),
      });

      if (response.ok) {
        toast.success('Settings saved', 'Your account settings have been updated.');
      } else {
        const error = await response.json();
        toast.error('Error', error.detail || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error', 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Save notification settings
  const handleSaveNotificationSettings = async () => {
    if (!address) {
      toast.error('Error', 'Wallet not connected');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/settings?wallet_address=${address}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_preferences: {
            weekly_summary: emailNotifications.weeklyReport,
            integration_updates: emailNotifications.integrationUpdates,
            billing_alerts: emailNotifications.billingAlerts,
            security_alerts: emailNotifications.securityAlerts,
            new_features: emailNotifications.newFeatures,
          },
        }),
      });

      if (response.ok) {
        toast.success('Preferences saved', 'Your notification preferences have been updated.');
      } else {
        const error = await response.json();
        toast.error('Error', error.detail || 'Failed to save preferences');
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast.error('Error', 'Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Export all data
  const handleExportData = async (format: 'json' | 'csv' | 'excel' = 'json') => {
    if (!address) {
      toast.error('Error', 'Wallet not connected');
      return;
    }

    setExporting(true);
    try {
      const endpoint = format === 'json'
        ? `/api/v1/export/dashboard/json?company_id=${address}`
        : format === 'csv'
        ? `/api/v1/export/dashboard/csv?company_id=${address}`
        : `/api/v1/export/dashboard/excel?company_id=${address}`;

      const response = await fetch(`${API_BASE_URL}${endpoint}`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const extension = format === 'excel' ? 'xlsx' : format;
        a.download = `varity_dashboard_export_${new Date().toISOString().split('T')[0]}.${extension}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Export complete', `Your data has been exported as ${format.toUpperCase()}.`);
      } else {
        toast.error('Export failed', 'Unable to export data. Please try again.');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Export failed', 'Unable to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Invite team member
  const handleInviteMember = async () => {
    if (!address || !inviteEmail) {
      toast.error('Error', 'Please enter an email address');
      return;
    }

    setInviting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/team/invite?wallet_address=${address}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('Invitation sent', `Invitation sent to ${inviteEmail}`);
        setShowInviteModal(false);
        setInviteEmail('');
        setInviteRole('member');
        // Add to local state as pending with real ID from backend
        setTeamMembers(prev => [...prev, {
          id: result.invitation_id || `pending-${Date.now()}`,
          name: inviteEmail.split('@')[0],
          email: inviteEmail,
          role: inviteRole,
          status: 'pending'
        }]);
      } else {
        const errorData = await response.json();
        toast.error('Invitation failed', errorData.detail || 'Failed to send invitation. Please try again.');
      }
    } catch (error) {
      console.error('Error inviting member:', error);
      toast.error('Invitation failed', 'Unable to send invitation. Please check your connection and try again.');
    } finally {
      setInviting(false);
    }
  };

  // Update team member role
  const handleUpdateRole = async (memberId: string, newRole: string) => {
    if (!address) {
      toast.error('Error', 'Wallet not connected');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/team/members/${memberId}/role?wallet_address=${address}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        // Update local state on success
        setTeamMembers(prev => prev.map(m =>
          m.id === memberId ? { ...m, role: newRole as TeamMember['role'] } : m
        ));
        toast.success('Role updated', 'Team member role has been updated.');
      } else {
        const error = await response.json();
        toast.error('Error', error.detail || 'Failed to update role');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Error', 'Failed to update role. Please try again.');
    }
  };

  // Remove team member
  const handleRemoveMember = async (memberId: string) => {
    if (!address) {
      toast.error('Error', 'Wallet not connected');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/team/members/${memberId}?wallet_address=${address}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Update local state on success
        setTeamMembers(prev => prev.filter(m => m.id !== memberId));
        toast.success('Member removed', 'Team member has been removed.');
      } else {
        const error = await response.json();
        toast.error('Error', error.detail || 'Failed to remove member');
      }
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Error', 'Failed to remove member. Please try again.');
    }
  };

  // Open role selection modal
  const openRoleModal = (member: TeamMember) => {
    setSelectedMemberForRole(member);
    setPendingRole(member.role === 'owner' ? 'admin' : member.role);
    setShowRoleModal(true);
  };

  // Confirm role change from modal
  const confirmRoleChange = async () => {
    if (!selectedMemberForRole || !pendingRole) return;

    await handleUpdateRole(selectedMemberForRole.id, pendingRole);
    setShowRoleModal(false);
    setSelectedMemberForRole(null);
    setPendingRole(null);
  };

  // Cancel role change
  const cancelRoleChange = () => {
    setShowRoleModal(false);
    setSelectedMemberForRole(null);
    setPendingRole(null);
  };

  // Delete account
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Error', 'Please type DELETE to confirm');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/account?wallet_address=${address}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Account deleted', 'Your account has been deleted.');
        router.push('/');
      } else {
        toast.error('Error', 'Failed to delete account. Please contact support.');
      }
    } catch (error) {
      toast.error('Error', 'Failed to delete account. Please contact support.');
    }
  };

  const tabs = [
    { id: 'account' as SettingsTab, label: 'Account', icon: User, disabled: false },
    { id: 'notifications' as SettingsTab, label: 'Notifications', icon: Bell, disabled: false },
    { id: 'team' as SettingsTab, label: 'Team', icon: Users, disabled: false },
    { id: 'data' as SettingsTab, label: 'Data', icon: Database, disabled: false },
    { id: 'billing' as SettingsTab, label: 'Billing', icon: CreditCard, disabled: true, comingSoon: true },
    { id: 'security' as SettingsTab, label: 'Security', icon: Lock, disabled: true, comingSoon: true },
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
              Manage your account, team, and preferences
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

            {/* Sidebar Navigation */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <nav role="tablist" aria-label="Settings navigation" className="flex flex-col">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      role="tab"
                      id={`tab-${tab.id}`}
                      aria-selected={activeTab === tab.id}
                      aria-controls={`tabpanel-${tab.id}`}
                      onClick={() => !tab.disabled && setActiveTab(tab.id)}
                      disabled={tab.disabled}
                      tabIndex={activeTab === tab.id ? 0 : -1}
                      className={`flex items-center justify-between gap-3 px-6 py-4 text-left transition-all ${
                        tab.disabled
                          ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-l-4 border-transparent'
                          : activeTab === tab.id
                          ? 'bg-blue-50 border-l-4 border-blue-600 text-blue-700 font-semibold'
                          : 'text-gray-700 hover:bg-gray-50 border-l-4 border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <tab.icon className={`w-5 h-5 ${tab.disabled ? 'text-gray-300' : ''}`} aria-hidden="true" />
                        <span>{tab.label}</span>
                      </div>
                      {tab.comingSoon && (
                        <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                          Soon
                        </span>
                      )}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <div
                role="tabpanel"
                id={`tabpanel-${activeTab}`}
                aria-labelledby={`tab-${activeTab}`}
                tabIndex={0}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-8"
              >

                {/* Loading State */}
                {loading && (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-3 text-gray-600">Loading settings...</span>
                  </div>
                )}

                {/* Account Settings */}
                {!loading && activeTab === 'account' && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Account Information</h2>

                    <div className="space-y-6">
                      <div>
                        <label htmlFor="settings-company-name" className="block text-sm font-semibold text-gray-700 mb-2">
                          Company Name
                        </label>
                        <input
                          id="settings-company-name"
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white text-gray-900"
                          placeholder="Enter company name"
                        />
                      </div>

                      <div>
                        <label htmlFor="settings-contact-email" className="block text-sm font-semibold text-gray-700 mb-2">
                          Contact Email
                        </label>
                        <input
                          id="settings-contact-email"
                          type="email"
                          value={contactEmail}
                          disabled
                          aria-describedby="email-hint"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                          placeholder="contact@company.com"
                        />
                        <p id="email-hint" className="text-xs text-gray-500 mt-1">Email is managed through your Privy account</p>
                      </div>

                      <div>
                        <label htmlFor="settings-industry" className="block text-sm font-semibold text-gray-700 mb-2">
                          Industry
                        </label>
                        <select
                          id="settings-industry"
                          value={industry}
                          onChange={(e) => setIndustry(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white text-gray-900"
                        >
                          <option value="Technology / Software">Technology / Software</option>
                          <option value="Finance / Accounting">Finance / Accounting</option>
                          <option value="Healthcare / Medical">Healthcare / Medical</option>
                          <option value="Retail / E-commerce">Retail / E-commerce</option>
                          <option value="Professional Services">Professional Services</option>
                          <option value="Manufacturing">Manufacturing</option>
                          <option value="Construction">Construction</option>
                          <option value="Real Estate">Real Estate</option>
                          <option value="Food & Hospitality">Food & Hospitality</option>
                          <option value="Transportation / Logistics">Transportation / Logistics</option>
                          <option value="Non-profit">Non-profit</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="settings-timezone" className="block text-sm font-semibold text-gray-700 mb-2">
                          Timezone
                        </label>
                        <select
                          id="settings-timezone"
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white text-gray-900"
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

                      <div>
                        <label htmlFor="settings-company-size" className="block text-sm font-semibold text-gray-700 mb-2">
                          Company Size
                        </label>
                        <select
                          id="settings-company-size"
                          value={companySize}
                          onChange={(e) => setCompanySize(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white text-gray-900"
                        >
                          <option value="">Not specified</option>
                          <option value="1">Just me</option>
                          <option value="2-10">2-10 employees</option>
                          <option value="11-50">11-50 employees</option>
                          <option value="51-200">51-200 employees</option>
                          <option value="201-500">201-500 employees</option>
                          <option value="500+">500+ employees</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="settings-contact-name" className="block text-sm font-semibold text-gray-700 mb-2">
                          Contact Name
                        </label>
                        <input
                          id="settings-contact-name"
                          type="text"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white text-gray-900"
                          placeholder="Your name"
                        />
                      </div>

                      <div>
                        <label htmlFor="settings-referral-source" className="block text-sm font-semibold text-gray-700 mb-2">
                          Referral Source
                        </label>
                        <select
                          id="settings-referral-source"
                          value={referralSource}
                          onChange={(e) => setReferralSource(e.target.value)}
                          aria-describedby="referral-hint"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white text-gray-900"
                        >
                          <option value="">Not specified</option>
                          <option value="Search engine (Google, Bing)">Search engine (Google, Bing)</option>
                          <option value="Social media">Social media</option>
                          <option value="Friend or colleague">Friend or colleague</option>
                          <option value="Industry publication">Industry publication</option>
                          <option value="Conference or event">Conference or event</option>
                          <option value="Other">Other</option>
                        </select>
                        <p id="referral-hint" className="text-xs text-gray-500 mt-1">How did you hear about us?</p>
                      </div>

                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Account ID (Wallet Address)</p>
                        <p className="font-mono text-sm text-gray-900 break-all">{address || 'Not connected'}</p>
                      </div>

                      <button
                        onClick={handleSaveAccountSettings}
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
                {!loading && activeTab === 'notifications' && (
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
                            role="switch"
                            aria-checked={emailNotifications.weeklyReport}
                            aria-label="Weekly Summary Report"
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
                            role="switch"
                            aria-checked={emailNotifications.integrationUpdates}
                            aria-label="Integration Updates"
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
                            role="switch"
                            aria-checked={emailNotifications.billingAlerts}
                            aria-label="Billing Alerts"
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
                            role="switch"
                            aria-checked={emailNotifications.securityAlerts}
                            aria-label="Security Alerts"
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
                            role="switch"
                            aria-checked={emailNotifications.newFeatures}
                            aria-label="New Features"
                            checked={emailNotifications.newFeatures}
                            onChange={(e) => setEmailNotifications({...emailNotifications, newFeatures: e.target.checked})}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <button
                        onClick={handleSaveNotificationSettings}
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

                {/* Team Settings */}
                {!loading && activeTab === 'team' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">Team Management</h2>
                      <button
                        onClick={() => setShowInviteModal(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-sm font-semibold flex items-center gap-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        Invite Member
                      </button>
                    </div>

                    <div className="space-y-4">
                      {teamMembers.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{member.name}</p>
                              <p className="text-sm text-gray-600">{member.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                              member.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {member.status === 'active' ? 'Active' : 'Pending'}
                            </span>
                            <button
                              onClick={() => member.role !== 'owner' && openRoleModal(member)}
                              disabled={member.role === 'owner'}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                member.role === 'owner'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200 cursor-default'
                                  : 'bg-white border border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
                              }`}
                            >
                              {(() => {
                                const RoleIcon = ROLE_DEFINITIONS[member.role].icon;
                                return <RoleIcon className="w-4 h-4" />;
                              })()}
                              {ROLE_DEFINITIONS[member.role].label}
                              {member.role !== 'owner' && (
                                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              )}
                            </button>
                            {member.role !== 'owner' && (
                              <button
                                onClick={() => handleRemoveMember(member.id)}
                                aria-label={`Remove ${member.name} from team`}
                                className="text-red-600 hover:text-red-700 text-sm font-semibold"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Invite Modal */}
                    {showInviteModal && (
                      <div
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                        onClick={(e) => e.target === e.currentTarget && setShowInviteModal(false)}
                        onKeyDown={(e) => e.key === 'Escape' && setShowInviteModal(false)}
                      >
                        <div
                          role="dialog"
                          aria-modal="true"
                          aria-labelledby="invite-modal-title"
                          tabIndex={-1}
                          className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
                        >
                          <div className="flex items-center justify-between mb-6">
                            <h3 id="invite-modal-title" className="text-xl font-bold text-gray-900">Invite Team Member</h3>
                            <button
                              onClick={() => setShowInviteModal(false)}
                              aria-label="Close invite modal"
                              className="text-gray-500 hover:text-gray-700"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>

                          <div className="space-y-6">
                            <div>
                              <label htmlFor="invite-email" className="block text-sm font-semibold text-gray-700 mb-2">
                                Email Address
                              </label>
                              <input
                                id="invite-email"
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                aria-required="true"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white text-gray-900"
                                placeholder="colleague@company.com"
                              />
                            </div>

                            <fieldset>
                              <legend className="block text-sm font-semibold text-gray-700 mb-3">
                                Select Role
                              </legend>
                              <div role="radiogroup" aria-label="Team member role" className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {(['admin', 'member', 'viewer'] as const).map((roleId) => {
                                  const role = ROLE_DEFINITIONS[roleId];
                                  const RoleIcon = role.icon;
                                  const isSelected = inviteRole === roleId;
                                  return (
                                    <button
                                      key={roleId}
                                      type="button"
                                      role="radio"
                                      aria-checked={isSelected}
                                      onClick={() => setInviteRole(roleId)}
                                      className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                                        isSelected
                                          ? `${role.borderColor} ${role.bgColor} ring-2 ring-offset-1 ring-blue-500`
                                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                      }`}
                                    >
                                      {isSelected && (
                                        <div className="absolute top-2 right-2" aria-hidden="true">
                                          <Check className="w-5 h-5 text-blue-600" />
                                        </div>
                                      )}
                                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${role.color} flex items-center justify-center mb-3`} aria-hidden="true">
                                        <RoleIcon className="w-5 h-5 text-white" />
                                      </div>
                                      <h4 className="font-semibold text-gray-900 mb-1">{role.label}</h4>
                                      <p className="text-xs text-gray-500 line-clamp-2">{role.description}</p>
                                    </button>
                                  );
                                })}
                              </div>
                            </fieldset>

                            {/* Selected role permissions preview */}
                            <div className={`p-4 rounded-lg ${ROLE_DEFINITIONS[inviteRole].bgColor} border ${ROLE_DEFINITIONS[inviteRole].borderColor}`}>
                              <h4 className={`font-semibold ${ROLE_DEFINITIONS[inviteRole].textColor} mb-2`}>
                                {ROLE_DEFINITIONS[inviteRole].label} Permissions
                              </h4>
                              <ul className="space-y-1">
                                {ROLE_DEFINITIONS[inviteRole].permissions.map((perm, idx) => (
                                  <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                                    {perm.allowed ? (
                                      <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                                    ) : (
                                      <XIcon className="w-4 h-4 text-red-400 flex-shrink-0" />
                                    )}
                                    <span className={perm.allowed ? '' : 'text-gray-400'}>{perm.label}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="flex gap-3 pt-2">
                              <button
                                onClick={() => setShowInviteModal(false)}
                                className="flex-1 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleInviteMember}
                                disabled={inviting || !inviteEmail}
                                className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                                  inviting || !inviteEmail
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                              >
                                {inviting ? 'Sending...' : 'Send Invitation'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Role Selection Modal */}
                    {showRoleModal && selectedMemberForRole && (
                      <div
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                        onClick={(e) => e.target === e.currentTarget && cancelRoleChange()}
                        onKeyDown={(e) => e.key === 'Escape' && cancelRoleChange()}
                      >
                        <div
                          role="dialog"
                          aria-modal="true"
                          aria-labelledby="role-modal-title"
                          aria-describedby="role-modal-description"
                          tabIndex={-1}
                          className="bg-white rounded-xl shadow-xl p-6 w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto"
                        >
                          <div className="flex items-center justify-between mb-6">
                            <div>
                              <h3 id="role-modal-title" className="text-xl font-bold text-gray-900">Change Role</h3>
                              <p id="role-modal-description" className="text-sm text-gray-500 mt-1">
                                Select a new role for {selectedMemberForRole.name}
                              </p>
                            </div>
                            <button
                              onClick={cancelRoleChange}
                              aria-label="Close role selection modal"
                              className="text-gray-500 hover:text-gray-700"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>

                          <div role="radiogroup" aria-label="Select new role" className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            {(['admin', 'member', 'viewer'] as const).map((roleId) => {
                              const role = ROLE_DEFINITIONS[roleId];
                              const RoleIcon = role.icon;
                              const isSelected = pendingRole === roleId;
                              const isCurrent = selectedMemberForRole.role === roleId;
                              return (
                                <button
                                  key={roleId}
                                  type="button"
                                  role="radio"
                                  aria-checked={isSelected}
                                  onClick={() => setPendingRole(roleId)}
                                  className={`relative p-5 rounded-xl border-2 text-left transition-all ${
                                    isSelected
                                      ? `${role.borderColor} ${role.bgColor} ring-2 ring-offset-2 ring-blue-500`
                                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  {isSelected && (
                                    <div className="absolute top-3 right-3" aria-hidden="true">
                                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                        <Check className="w-4 h-4 text-white" />
                                      </div>
                                    </div>
                                  )}
                                  {isCurrent && !isSelected && (
                                    <div className="absolute top-3 right-3">
                                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">Current</span>
                                    </div>
                                  )}
                                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-4`} aria-hidden="true">
                                    <RoleIcon className="w-6 h-6 text-white" />
                                  </div>
                                  <h4 className="font-bold text-gray-900 text-lg mb-2">{role.label}</h4>
                                  <p className="text-sm text-gray-600 mb-4">{role.description}</p>
                                  <ul className="space-y-2" aria-label={`${role.label} permissions`}>
                                    {role.permissions.map((perm, idx) => (
                                      <li key={idx} className="flex items-center gap-2 text-sm">
                                        {perm.allowed ? (
                                          <Check className="w-4 h-4 text-green-600 flex-shrink-0" aria-hidden="true" />
                                        ) : (
                                          <XIcon className="w-4 h-4 text-red-400 flex-shrink-0" aria-hidden="true" />
                                        )}
                                        <span className={perm.allowed ? 'text-gray-700' : 'text-gray-400'}>
                                          {perm.allowed ? '' : 'Cannot '}{perm.label}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </button>
                              );
                            })}
                          </div>

                          {/* Warning if changing role */}
                          {pendingRole && pendingRole !== selectedMemberForRole.role && (
                            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                              <p className="text-sm text-amber-800">
                                <strong>Note:</strong> Changing {selectedMemberForRole.name}&apos;s role from{' '}
                                <span className="font-semibold">{ROLE_DEFINITIONS[selectedMemberForRole.role].label}</span> to{' '}
                                <span className="font-semibold">{ROLE_DEFINITIONS[pendingRole].label}</span> will take effect immediately.
                              </p>
                            </div>
                          )}

                          <div className="flex gap-3">
                            <button
                              onClick={cancelRoleChange}
                              className="flex-1 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={confirmRoleChange}
                              disabled={!pendingRole || pendingRole === selectedMemberForRole.role}
                              className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                                !pendingRole || pendingRole === selectedMemberForRole.role
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                            >
                              Update Role
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Data Settings */}
                {!loading && activeTab === 'data' && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Data Management</h2>

                    <div className="space-y-6">
                      {/* Export Data */}
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Export Your Data</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Download a complete copy of your business data in your preferred format
                        </p>
                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() => handleExportData('json')}
                            disabled={exporting}
                            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                              exporting
                                ? 'bg-gray-300 text-gray-500 cursor-wait'
                                : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                            }`}
                          >
                            <Download className="w-4 h-4" />
                            {exporting ? 'Exporting...' : 'Export JSON'}
                          </button>
                          <button
                            onClick={() => handleExportData('csv')}
                            disabled={exporting}
                            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                              exporting
                                ? 'bg-gray-300 text-gray-500 cursor-wait'
                                : 'bg-green-600 text-white hover:bg-green-700 hover:shadow-md'
                            }`}
                          >
                            <Download className="w-4 h-4" />
                            Export CSV
                          </button>
                          <button
                            onClick={() => handleExportData('excel')}
                            disabled={exporting}
                            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                              exporting
                                ? 'bg-gray-300 text-gray-500 cursor-wait'
                                : 'bg-purple-600 text-white hover:bg-purple-700 hover:shadow-md'
                            }`}
                          >
                            <Download className="w-4 h-4" />
                            Export Excel
                          </button>
                        </div>
                      </div>

                      {/* Import Data - Coming Soon */}
                      <div className="border-t border-gray-200 pt-6">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">Import Data</h3>
                          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-medium">Coming Soon</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                          Upload data from previous exports or other systems
                        </p>
                        <div className="border-2 border-dashed rounded-lg p-8 text-center border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed">
                          <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-400 mb-2">Data import will be available soon</p>
                          <p className="text-xs text-gray-400">Supports JSON, CSV, and Excel files</p>
                        </div>
                      </div>

                      {/* Storage Usage */}
                      <div className="border-t border-gray-200 pt-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Your Data Storage</h3>

                        {storageLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <span className="ml-3 text-gray-600">Loading storage usage...</span>
                          </div>
                        ) : storageData && storageData.total_files > 0 ? (
                          <div className="bg-white border border-gray-200 rounded-lg p-6">
                            <div className="flex items-center gap-3 mb-4">
                              <Database className="w-6 h-6 text-blue-600" />
                              <div>
                                <p className="text-lg font-semibold text-gray-900">
                                  {storageData.total_size_formatted} across {storageData.total_files} file{storageData.total_files !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-3 mt-4">
                              {Object.entries(storageData.integrations).map(([integration, data]) => {
                                const integrationDisplayNames: Record<string, { name: string; icon: string }> = {
                                  google: { name: 'Google Workspace', icon: '🔵' },
                                  slack: { name: 'Slack', icon: '💬' },
                                  quickbooks: { name: 'QuickBooks', icon: '📊' },
                                  microsoft: { name: 'Microsoft 365', icon: '🔷' },
                                  salesforce: { name: 'Salesforce', icon: '☁️' },
                                  hubspot: { name: 'HubSpot', icon: '🧡' }
                                };
                                const displayInfo = integrationDisplayNames[integration] || { name: integration, icon: '📁' };

                                return (
                                  <div key={integration} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-xl">{displayInfo.icon}</span>
                                          <h4 className="font-semibold text-gray-900">{displayInfo.name}</h4>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-2">
                                          {data.data_types.join(', ')}
                                        </p>
                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                          <span className="flex items-center gap-1">
                                            <HardDrive className="w-4 h-4" />
                                            {data.total_size_formatted}
                                          </span>
                                          <span>·</span>
                                          <span>{data.file_count} file{data.file_count !== 1 ? 's' : ''}</span>
                                          <span>·</span>
                                          <span>Last sync: {formatRelativeTime(data.latest_sync)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <p className="text-sm text-gray-600 flex items-center gap-2">
                                <Lock className="w-4 h-4 text-green-600" />
                                Encrypted with your wallet key
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                            <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-600 font-medium mb-1">No data stored yet</p>
                            <p className="text-sm text-gray-500">Connect an integration to get started</p>
                          </div>
                        )}
                      </div>

                      {/* Storage Info */}
                      <div className="border-t border-gray-200 pt-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Decentralized Storage</h3>
                        <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100 rounded-lg p-6">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">Decentralized Storage</p>
                              <p className="text-sm text-gray-600">Powered by Filecoin & IPFS</p>
                            </div>
                          </div>
                          <ul className="space-y-2 text-sm text-gray-700">
                            <li className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              End-to-end encrypted with your wallet key
                            </li>
                            <li className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              No storage limits - unlimited data
                            </li>
                            <li className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Only you can access your data
                            </li>
                          </ul>
                        </div>
                      </div>

                      {/* Delete Account */}
                      <div className="border-t border-gray-200 pt-6">
                        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
                          <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                            <Trash2 className="w-5 h-5" />
                            Delete Account
                          </h3>
                          <p id="delete-confirm-warning" className="text-sm text-red-800 mb-4">
                            Permanently delete your account and all associated data. This action cannot be undone.
                          </p>
                          {!showDeleteConfirm ? (
                            <button
                              onClick={() => setShowDeleteConfirm(true)}
                              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-all font-semibold"
                            >
                              Delete Account
                            </button>
                          ) : (
                            <div className="space-y-3">
                              <label htmlFor="delete-confirm-input" className="block text-sm font-semibold text-red-900">Type DELETE to confirm:</label>
                              <input
                                id="delete-confirm-input"
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                aria-required="true"
                                aria-describedby="delete-confirm-warning"
                                className="w-full px-4 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 bg-white text-gray-900"
                                placeholder="DELETE"
                              />
                              <div className="flex gap-3">
                                <button
                                  onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setDeleteConfirmText('');
                                  }}
                                  className="flex-1 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handleDeleteAccount}
                                  disabled={deleteConfirmText !== 'DELETE'}
                                  className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
                                    deleteConfirmText !== 'DELETE'
                                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                      : 'bg-red-600 text-white hover:bg-red-700'
                                  }`}
                                >
                                  Confirm Delete
                                </button>
                              </div>
                            </div>
                          )}
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
