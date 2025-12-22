'use client';

import { useState, useEffect, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { User, Bell, CreditCard, Users, Lock, Database, Download, Upload, Trash2, UserPlus, X, Crown, Shield, UserCheck, Eye, Check, X as XIcon } from 'lucide-react';
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
  const address = wallets[0]?.address;
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [storageUsed, setStorageUsed] = useState<string>('0 GB');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Import data from file
  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !address) {
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('wallet_address', address);

      const response = await fetch(`${API_BASE_URL}/api/v1/import/data`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('Import complete', `Successfully imported ${result.records_imported || 0} records.`);
      } else {
        const error = await response.json();
        toast.error('Import failed', error.detail || 'Unable to import data. Please check file format.');
      }
    } catch (error) {
      console.error('Error importing data:', error);
      toast.error('Import failed', 'Unable to import data. Please try again.');
    } finally {
      setImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
                <nav className="flex flex-col">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => !tab.disabled && setActiveTab(tab.id)}
                      disabled={tab.disabled}
                      className={`flex items-center justify-between gap-3 px-6 py-4 text-left transition-all ${
                        tab.disabled
                          ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-l-4 border-transparent'
                          : activeTab === tab.id
                          ? 'bg-blue-50 border-l-4 border-blue-600 text-blue-700 font-semibold'
                          : 'text-gray-700 hover:bg-gray-50 border-l-4 border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <tab.icon className={`w-5 h-5 ${tab.disabled ? 'text-gray-300' : ''}`} />
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
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">

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
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Company Name
                        </label>
                        <input
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white text-gray-900"
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
                          disabled
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                          placeholder="contact@company.com"
                        />
                        <p className="text-xs text-gray-500 mt-1">Email is managed through your Privy account</p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Industry
                        </label>
                        <select
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
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Timezone
                        </label>
                        <select
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
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Company Size
                        </label>
                        <select
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
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Contact Name
                        </label>
                        <input
                          type="text"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white text-gray-900"
                          placeholder="Your name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Referral Source
                        </label>
                        <select
                          value={referralSource}
                          onChange={(e) => setReferralSource(e.target.value)}
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
                        <p className="text-xs text-gray-500 mt-1">How did you hear about us?</p>
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
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Invite Team Member</h3>
                            <button
                              onClick={() => setShowInviteModal(false)}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>

                          <div className="space-y-6">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Email Address
                              </label>
                              <input
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white text-gray-900"
                                placeholder="colleague@company.com"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-3">
                                Select Role
                              </label>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {(['admin', 'member', 'viewer'] as const).map((roleId) => {
                                  const role = ROLE_DEFINITIONS[roleId];
                                  const RoleIcon = role.icon;
                                  const isSelected = inviteRole === roleId;
                                  return (
                                    <button
                                      key={roleId}
                                      type="button"
                                      onClick={() => setInviteRole(roleId)}
                                      className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                                        isSelected
                                          ? `${role.borderColor} ${role.bgColor} ring-2 ring-offset-1 ring-blue-500`
                                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                      }`}
                                    >
                                      {isSelected && (
                                        <div className="absolute top-2 right-2">
                                          <Check className="w-5 h-5 text-blue-600" />
                                        </div>
                                      )}
                                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${role.color} flex items-center justify-center mb-3`}>
                                        <RoleIcon className="w-5 h-5 text-white" />
                                      </div>
                                      <h4 className="font-semibold text-gray-900 mb-1">{role.label}</h4>
                                      <p className="text-xs text-gray-500 line-clamp-2">{role.description}</p>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

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
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
                          <div className="flex items-center justify-between mb-6">
                            <div>
                              <h3 className="text-xl font-bold text-gray-900">Change Role</h3>
                              <p className="text-sm text-gray-500 mt-1">
                                Select a new role for {selectedMemberForRole.name}
                              </p>
                            </div>
                            <button
                              onClick={cancelRoleChange}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            {(['admin', 'member', 'viewer'] as const).map((roleId) => {
                              const role = ROLE_DEFINITIONS[roleId];
                              const RoleIcon = role.icon;
                              const isSelected = pendingRole === roleId;
                              const isCurrent = selectedMemberForRole.role === roleId;
                              return (
                                <button
                                  key={roleId}
                                  type="button"
                                  onClick={() => setPendingRole(roleId)}
                                  className={`relative p-5 rounded-xl border-2 text-left transition-all ${
                                    isSelected
                                      ? `${role.borderColor} ${role.bgColor} ring-2 ring-offset-2 ring-blue-500`
                                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  {isSelected && (
                                    <div className="absolute top-3 right-3">
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
                                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-4`}>
                                    <RoleIcon className="w-6 h-6 text-white" />
                                  </div>
                                  <h4 className="font-bold text-gray-900 text-lg mb-2">{role.label}</h4>
                                  <p className="text-sm text-gray-600 mb-4">{role.description}</p>
                                  <ul className="space-y-2">
                                    {role.permissions.map((perm, idx) => (
                                      <li key={idx} className="flex items-center gap-2 text-sm">
                                        {perm.allowed ? (
                                          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                                        ) : (
                                          <XIcon className="w-4 h-4 text-red-400 flex-shrink-0" />
                                        )}
                                        <span className={perm.allowed ? 'text-gray-700' : 'text-gray-400'}>
                                          {perm.label}
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

                      {/* Import Data */}
                      <div className="border-t border-gray-200 pt-6">
                        <h3 className="font-semibold text-gray-900 mb-2">Import Data</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Upload data from previous exports or other systems
                        </p>
                        <div
                          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                            importing
                              ? 'border-blue-400 bg-blue-50'
                              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                          }`}
                          onClick={() => !importing && fileInputRef.current?.click()}
                        >
                          {importing ? (
                            <>
                              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                              <p className="text-blue-600 font-medium mb-2">Importing data...</p>
                              <p className="text-xs text-gray-500">Please wait while we process your file</p>
                            </>
                          ) : (
                            <>
                              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                              <p className="text-gray-600 mb-2">Click to select a file or drag and drop</p>
                              <p className="text-xs text-gray-500">Supports JSON, CSV, and Excel files</p>
                            </>
                          )}
                          <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept=".json,.csv,.xlsx"
                            onChange={handleImportData}
                            disabled={importing}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              fileInputRef.current?.click();
                            }}
                            disabled={importing}
                            className={`mt-4 px-6 py-2 rounded-lg font-semibold transition-all ${
                              importing
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                            }`}
                          >
                            {importing ? 'Importing...' : 'Select File'}
                          </button>
                        </div>
                      </div>

                      {/* Storage Usage */}
                      <div className="border-t border-gray-200 pt-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Storage Usage</h3>
                        <div className="bg-gray-50 rounded-lg p-6">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-700">Used Storage</span>
                            <span className="font-bold text-gray-900">Unlimited (Decentralized)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full" style={{width: '5%'}}></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">Your data is encrypted and stored on Filecoin/IPFS</p>
                        </div>
                      </div>

                      {/* Delete Account */}
                      <div className="border-t border-gray-200 pt-6">
                        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
                          <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                            <Trash2 className="w-5 h-5" />
                            Delete Account
                          </h3>
                          <p className="text-sm text-red-800 mb-4">
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
                              <p className="text-sm font-semibold text-red-900">Type DELETE to confirm:</p>
                              <input
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
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
