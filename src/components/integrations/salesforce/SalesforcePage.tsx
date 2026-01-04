'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Home,
  TrendingUp,
  Headphones,
  BarChart3,
  LayoutDashboard,
  CheckCircle,
  Search,
  Plus,
  Bell,
  Settings,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Filter,
  Download,
  Grid3X3,
  List,
  Users,
  Building,
  UserPlus,
  DollarSign,
  AlertCircle,
  Activity,
  Clock,
  Edit3,
  Trash2,
  Megaphone,
  Calendar
} from 'lucide-react';
import KanbanBoard from './KanbanBoard';
import LeadForm from './LeadForm';
import OpportunityForm from './OpportunityForm';
import AccountForm from './AccountForm';
import ContactForm from './ContactForm';

interface SalesforcePageProps {
  walletAddress: string;
  data: any;
  onRefresh: () => void;
}

// Simplified sidebar for SMBs - core Sales Cloud features
interface SidebarItem {
  id: string;
  label: string;
  icon: any;
  submenu?: Array<{ id: string; label: string }>;
  comingSoon?: boolean;
}

const SF_SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  {
    id: 'sales',
    label: 'Sales',
    icon: TrendingUp,
    submenu: [
      { id: 'leads', label: 'Leads' },
      { id: 'accounts', label: 'Accounts' },
      { id: 'contacts', label: 'Contacts' },
      { id: 'opportunities', label: 'Opportunities' },
    ]
  },
  // Coming Soon - features SMBs expect
  { id: 'cases', label: 'Cases', icon: Headphones, comingSoon: true },
  { id: 'reports', label: 'Reports', icon: BarChart3, comingSoon: true },
  { id: 'dashboards', label: 'Dashboards', icon: LayoutDashboard, comingSoon: true },
  // Hidden: Forecasts, Marketing, Knowledge, Chatter, Files, Products, Quotes, Tasks, Events (enterprise features)
];

// Create menu items
const CREATE_MENU_ITEMS = {
  sales: [
    { id: 'lead', label: 'Lead', icon: UserPlus },
    { id: 'account', label: 'Account', icon: Building },
    { id: 'contact', label: 'Contact', icon: Users },
    { id: 'opportunity', label: 'Opportunity', icon: DollarSign },
  ],
  service: [
    { id: 'case', label: 'Case', icon: AlertCircle },
  ],
  marketing: [
    { id: 'campaign', label: 'Campaign', icon: Megaphone },
  ],
  other: [
    { id: 'task', label: 'Task', icon: CheckCircle },
    { id: 'event', label: 'Event', icon: Calendar },
  ]
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

export default function SalesforcePage({ walletAddress, data, onRefresh }: SalesforcePageProps) {
  const [activeSection, setActiveSection] = useState('home');
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['sales']);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form modal states
  const [leadFormOpen, setLeadFormOpen] = useState(false);
  const [opportunityFormOpen, setOpportunityFormOpen] = useState(false);
  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [contactFormOpen, setContactFormOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  // Data states
  const [leads, setLeads] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  // Live API data state
  const [liveData, setLiveData] = useState<{
    leads: any[];
    opportunities: any[];
    accounts: any[];
    contacts: any[];
  } | null>(null);
  const [liveLoading, setLiveLoading] = useState(true);
  const [liveError, setLiveError] = useState<string | null>(null);

  // Fetch live data from API
  const fetchLiveData = useCallback(async () => {
    if (!walletAddress) return;

    setLiveLoading(true);
    setLiveError(null);

    try {
      const [leadsRes, oppsRes, accountsRes, contactsRes] = await Promise.allSettled([
        fetch(`${API_URL}/api/v1/salesforce/leads?wallet_address=${walletAddress}`),
        fetch(`${API_URL}/api/v1/salesforce/opportunities?wallet_address=${walletAddress}`),
        fetch(`${API_URL}/api/v1/salesforce/accounts?wallet_address=${walletAddress}`),
        fetch(`${API_URL}/api/v1/salesforce/contacts?wallet_address=${walletAddress}`)
      ]);

      const processResult = async (result: PromiseSettledResult<Response>) => {
        if (result.status === 'fulfilled' && result.value.ok) {
          return await result.value.json();
        }
        return null;
      };

      const [leadsData, oppsData, accountsData, contactsData] = await Promise.all([
        processResult(leadsRes),
        processResult(oppsRes),
        processResult(accountsRes),
        processResult(contactsRes)
      ]);

      setLiveData({
        leads: leadsData?.leads || leadsData || [],
        opportunities: oppsData?.opportunities || oppsData || [],
        accounts: accountsData?.accounts || accountsData || [],
        contacts: contactsData?.contacts || contactsData || []
      });
    } catch (error) {
      console.error('Failed to fetch Salesforce live data:', error);
      setLiveError('Unable to load live data');
    } finally {
      setLiveLoading(false);
    }
  }, [walletAddress]);

  // Fetch live data on mount
  useEffect(() => {
    fetchLiveData();
  }, [fetchLiveData]);

  // Combine live data with props data (prefer live, fallback to props)
  const effectiveData = useMemo(() => ({
    leads: liveData?.leads?.length ? liveData.leads : (data?.leads || []),
    opportunities: liveData?.opportunities?.length ? liveData.opportunities : (data?.opportunities || []),
    accounts: liveData?.accounts?.length ? liveData.accounts : (data?.accounts || []),
    contacts: liveData?.contacts?.length ? liveData.contacts : (data?.contacts || []),
  }), [liveData, data]);

  useEffect(() => {
    // Load data from effectiveData (prefer live, fallback to props)
    setLeads(effectiveData.leads);
    setOpportunities(effectiveData.opportunities);
    setAccounts(effectiveData.accounts);
    setContacts(effectiveData.contacts);
    // Cases and tasks still from props only
    if (data) {
      setCases(data.cases || []);
      setTasks(data.tasks || []);
    }
  }, [effectiveData, data]);

  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev =>
      prev.includes(menuId)
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  const handleCreate = (itemType: string) => {
    setCreateMenuOpen(false);
    setSelectedRecord(null);

    switch (itemType) {
      case 'lead':
        setLeadFormOpen(true);
        break;
      case 'opportunity':
        setOpportunityFormOpen(true);
        break;
      case 'account':
        setAccountFormOpen(true);
        break;
      case 'contact':
        setContactFormOpen(true);
        break;
      default:
        // Other record types not yet implemented
        break;
    }
  };

  const handleEdit = (recordType: string, record: any) => {
    setSelectedRecord(record);

    switch (recordType) {
      case 'lead':
        setLeadFormOpen(true);
        break;
      case 'opportunity':
        setOpportunityFormOpen(true);
        break;
      case 'account':
        setAccountFormOpen(true);
        break;
      case 'contact':
        setContactFormOpen(true);
        break;
    }
  };

  // API integration functions
  const saveLead = async (leadData: any) => {
    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const endpoint = leadData.id
        ? `${apiUrl}/api/v1/salesforce/leads/${leadData.id}`
        : `${apiUrl}/api/v1/salesforce/leads`;

      const method = leadData.id ? 'PATCH' : 'POST';

      const response = await fetch(`${endpoint}?wallet_address=${walletAddress}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData),
      });

      if (!response.ok) {
        throw new Error('Failed to save lead');
      }

      const result = await response.json();

      // Update local state
      if (leadData.id) {
        setLeads(prev => prev.map(l => l.id === leadData.id ? { ...l, ...leadData } : l));
      } else {
        setLeads(prev => [...prev, { ...leadData, id: result.id }]);
      }

      onRefresh();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const saveOpportunity = async (oppData: any) => {
    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const endpoint = oppData.id
        ? `${apiUrl}/api/v1/salesforce/opportunities/${oppData.id}`
        : `${apiUrl}/api/v1/salesforce/opportunities`;

      const method = oppData.id ? 'PATCH' : 'POST';

      const response = await fetch(`${endpoint}?wallet_address=${walletAddress}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(oppData),
      });

      if (!response.ok) {
        throw new Error('Failed to save opportunity');
      }

      const result = await response.json();

      // Update local state
      if (oppData.id) {
        setOpportunities(prev => prev.map(o => o.id === oppData.id ? { ...o, ...oppData } : o));
      } else {
        setOpportunities(prev => [...prev, { ...oppData, id: result.id }]);
      }

      onRefresh();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const saveAccount = async (accountData: any) => {
    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const endpoint = accountData.id
        ? `${apiUrl}/api/v1/salesforce/accounts/${accountData.id}`
        : `${apiUrl}/api/v1/salesforce/accounts`;

      const method = accountData.id ? 'PATCH' : 'POST';

      const response = await fetch(`${endpoint}?wallet_address=${walletAddress}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountData),
      });

      if (!response.ok) {
        throw new Error('Failed to save account');
      }

      const result = await response.json();

      // Update local state
      if (accountData.id) {
        setAccounts(prev => prev.map(a => a.id === accountData.id ? { ...a, ...accountData } : a));
      } else {
        setAccounts(prev => [...prev, { ...accountData, id: result.id }]);
      }

      onRefresh();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const saveContact = async (contactData: any) => {
    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const endpoint = contactData.id
        ? `${apiUrl}/api/v1/salesforce/contacts/${contactData.id}`
        : `${apiUrl}/api/v1/salesforce/contacts`;

      const method = contactData.id ? 'PATCH' : 'POST';

      const response = await fetch(`${endpoint}?wallet_address=${walletAddress}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData),
      });

      if (!response.ok) {
        throw new Error('Failed to save contact');
      }

      const result = await response.json();

      // Update local state
      if (contactData.id) {
        setContacts(prev => prev.map(c => c.id === contactData.id ? { ...c, ...contactData } : c));
      } else {
        setContacts(prev => [...prev, { ...contactData, id: result.id }]);
      }

      onRefresh();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleOpportunityMove = async (cardId: string, newStage: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/api/v1/salesforce/opportunities/${cardId}?wallet_address=${walletAddress}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });

      if (!response.ok) {
        throw new Error('Failed to update opportunity stage');
      }

      // Update local state
      setOpportunities(prev => prev.map(o =>
        o.id === cardId ? { ...o, stage: newStage } : o
      ));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLeadMove = async (cardId: string, newStatus: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/api/v1/salesforce/leads/${cardId}?wallet_address=${walletAddress}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update lead status');
      }

      // Update local state
      setLeads(prev => prev.map(l =>
        l.id === cardId ? { ...l, status: newStatus } : l
      ));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (recordType: string, recordId: string) => {
    if (!confirm(`Are you sure you want to delete this ${recordType}?`)) {
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(
        `${apiUrl}/api/v1/salesforce/${recordType}s/${recordId}?wallet_address=${walletAddress}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete ${recordType}`);
      }

      // Update local state
      switch (recordType) {
        case 'lead':
          setLeads(prev => prev.filter(l => l.id !== recordId));
          break;
        case 'opportunity':
          setOpportunities(prev => prev.filter(o => o.id !== recordId));
          break;
        case 'account':
          setAccounts(prev => prev.filter(a => a.id !== recordId));
          break;
        case 'contact':
          setContacts(prev => prev.filter(c => c.id !== recordId));
          break;
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Render Salesforce-style sidebar
  const renderSidebar = () => (
    <div className="w-64 bg-[#16325c] text-white flex flex-col h-full">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/10 rounded-md flex items-center justify-center">
            <span className="text-sm font-bold">SF</span>
          </div>
          <div>
            <div className="text-sm font-semibold">Salesforce</div>
            <div className="text-xs text-white/60">Sales Cloud</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-2">
        {SF_SIDEBAR_ITEMS.map(item => (
          <div key={item.id}>
            {item.submenu ? (
              <>
                <button
                  onClick={() => !item.comingSoon && toggleMenu(item.id)}
                  disabled={item.comingSoon}
                  className={`w-full px-4 py-2.5 flex items-center gap-3 transition-colors text-sm ${
                    item.comingSoon
                      ? 'text-white/40 cursor-not-allowed'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <item.icon className={`w-4 h-4 ${item.comingSoon ? 'opacity-40' : ''}`} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.comingSoon ? (
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">Soon</span>
                  ) : expandedMenus.includes(item.id) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                {!item.comingSoon && expandedMenus.includes(item.id) && (
                  <div className="bg-white/5">
                    {item.submenu.map(subItem => (
                      <button
                        key={subItem.id}
                        onClick={() => setActiveSection(subItem.id)}
                        className={`w-full px-4 py-2 pl-12 text-sm text-left hover:bg-white/5 transition-colors ${
                          activeSection === subItem.id ? 'bg-white/10 border-l-2 border-blue-400' : ''
                        }`}
                      >
                        {subItem.label}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={() => !item.comingSoon && setActiveSection(item.id)}
                disabled={item.comingSoon}
                className={`w-full px-4 py-2.5 flex items-center gap-3 transition-colors text-sm ${
                  item.comingSoon
                    ? 'text-white/40 cursor-not-allowed'
                    : activeSection === item.id
                      ? 'bg-white/10 border-l-2 border-blue-400'
                      : 'hover:bg-white/5'
                }`}
              >
                <item.icon className={`w-4 h-4 ${item.comingSoon ? 'opacity-40' : ''}`} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.comingSoon && (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">Soon</span>
                )}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-2 text-xs text-white/60">
          <Clock className="w-4 h-4" />
          <span>Last sync: {data?.synced_at ? new Date(data.synced_at).toLocaleTimeString() : 'Never'}</span>
        </div>
      </div>
    </div>
  );

  // Render global header
  const renderHeader = () => (
    <div className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Global Search */}
        <div className="flex-1 max-w-2xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search Salesforce..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 ml-6">
          {/* Create Menu */}
          <div className="relative">
            <button
              onClick={() => setCreateMenuOpen(!createMenuOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-[#0176D3] text-white rounded-md hover:bg-[#014486] transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New</span>
            </button>
            {createMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                {Object.entries(CREATE_MENU_ITEMS).map(([category, items]) => (
                  <div key={category}>
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                      {category}
                    </div>
                    {items.map(item => (
                      <button
                        key={item.id}
                        onClick={() => handleCreate(item.id)}
                        className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-50 text-sm text-left"
                      >
                        <item.icon className="w-4 h-4 text-gray-400" />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>

          {/* Notifications */}
          <button className="p-2 hover:bg-gray-100 rounded-md transition-colors relative">
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* Settings */}
          <button className="p-2 hover:bg-gray-100 rounded-md transition-colors">
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );

  // Render section toolbar
  const renderSectionToolbar = () => {
    const sectionLabels: Record<string, string> = {
      home: 'Home',
      leads: 'Leads',
      accounts: 'Accounts',
      contacts: 'Contacts',
      opportunities: 'Opportunities',
      forecasts: 'Forecasts',
      cases: 'Cases',
      campaigns: 'Campaigns',
      reports: 'Reports',
      dashboards: 'Dashboards',
      tasks: 'Tasks',
      events: 'Events',
    };

    return (
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">
            {sectionLabels[activeSection] || activeSection}
          </h1>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle (for Leads/Opportunities) */}
            {(activeSection === 'leads' || activeSection === 'opportunities') && (
              <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`p-2 rounded ${viewMode === 'kanban' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
                  title="Kanban View"
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Filter */}
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
              <Filter className="w-4 h-4" />
              <span>Filter</span>
            </button>

            {/* Export */}
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Home Dashboard
  const renderHomeDashboard = () => {
    const metrics = [
      { label: 'Open Opportunities', value: opportunities?.filter((o: any) => !o.stage?.includes('Closed')).length || 0, icon: DollarSign, color: 'blue' },
      { label: 'New Leads This Week', value: leads?.length || 0, icon: UserPlus, color: 'green' },
      { label: 'Open Cases', value: cases?.filter((c: any) => c.status !== 'Closed').length || 0, icon: AlertCircle, color: 'orange' },
      { label: 'Tasks Due Today', value: tasks?.filter((t: any) => new Date(t.due_date).toDateString() === new Date().toDateString()).length || 0, icon: CheckCircle, color: 'purple' },
    ];

    return (
      <div className="p-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric, idx) => (
            <div key={idx} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-${metric.color}-50`}>
                  <metric.icon className={`w-6 h-6 text-${metric.color}-600`} />
                </div>
                <Activity className="w-5 h-5 text-gray-400" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{metric.value}</div>
              <div className="text-sm text-gray-600">{metric.label}</div>
            </div>
          ))}
        </div>

        {/* Recent Records */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Opportunities */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Opportunities</h3>
            <div className="space-y-3">
              {(opportunities || []).slice(0, 5).map((opp: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <div className="font-medium text-gray-900">{opp.name}</div>
                    <div className="text-sm text-gray-500">{opp.stage}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">${opp.amount?.toLocaleString() || 0}</div>
                    <div className="text-xs text-gray-500">{opp.probability}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Leads */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Leads</h3>
            <div className="space-y-3">
              {(leads || []).slice(0, 5).map((lead: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-sm font-semibold text-gray-600">
                        {lead.name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{lead.name}</div>
                      <div className="text-sm text-gray-500">{lead.company}</div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    lead.status === 'New' ? 'bg-blue-100 text-blue-800' :
                    lead.status === 'Working' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {lead.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render Leads
  const renderLeads = () => {
    if (viewMode === 'kanban') {
      return (
        <KanbanBoard
          type="leads"
          data={leads}
          onCardMove={handleLeadMove}
          onCardClick={(card) => handleEdit('lead', card)}
        />
      );
    }

    return (
      <div className="p-6">
        <div className="bg-white rounded-lg border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{lead.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{lead.company}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{lead.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      lead.status === 'New' ? 'bg-blue-100 text-blue-800' :
                      lead.status === 'Working' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit('lead', lead)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete('lead', lead.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render Opportunities
  const renderOpportunities = () => {
    if (viewMode === 'kanban') {
      return (
        <KanbanBoard
          type="opportunities"
          data={opportunities}
          onCardMove={handleOpportunityMove}
          onCardClick={(card) => handleEdit('opportunity', card)}
        />
      );
    }

    return (
      <div className="p-6">
        <div className="bg-white rounded-lg border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Close Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {opportunities.map((opp) => (
                <tr key={opp.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{opp.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{opp.account_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">${opp.amount?.toLocaleString() || 0}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {opp.stage}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {opp.close_date ? new Date(opp.close_date).toLocaleDateString() : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit('opportunity', opp)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete('opportunity', opp.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render Accounts
  const renderAccounts = () => (
    <div className="p-6">
      <div className="bg-white rounded-lg border border-gray-200">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Website</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {accounts.map((account) => (
              <tr key={account.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{account.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{account.type}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{account.phone}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{account.website}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEdit('account', account)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete('account', account.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Render Contacts
  const renderContacts = () => (
    <div className="p-6">
      <div className="bg-white rounded-lg border border-gray-200">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {contacts.map((contact) => (
              <tr key={contact.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{contact.account_name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{contact.title}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{contact.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{contact.phone}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEdit('contact', contact)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete('contact', contact.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Render active section content
  const renderSectionContent = () => {
    switch (activeSection) {
      case 'home':
        return renderHomeDashboard();
      case 'leads':
        return renderLeads();
      case 'accounts':
        return renderAccounts();
      case 'contacts':
        return renderContacts();
      case 'opportunities':
        return renderOpportunities();
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {activeSection} - Coming Soon
              </h3>
              <p className="text-gray-500">
                This section is under development
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      {renderSidebar()}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Global Header */}
        {renderHeader()}

        {/* Section Toolbar */}
        {renderSectionToolbar()}

        {/* Section Content */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          {renderSectionContent()}
        </div>
      </div>

      {/* Form Modals */}
      <LeadForm
        lead={selectedRecord}
        isOpen={leadFormOpen}
        onClose={() => {
          setLeadFormOpen(false);
          setSelectedRecord(null);
        }}
        onSave={saveLead}
        walletAddress={walletAddress}
      />

      <OpportunityForm
        opportunity={selectedRecord}
        isOpen={opportunityFormOpen}
        onClose={() => {
          setOpportunityFormOpen(false);
          setSelectedRecord(null);
        }}
        onSave={saveOpportunity}
        walletAddress={walletAddress}
      />

      <AccountForm
        account={selectedRecord}
        isOpen={accountFormOpen}
        onClose={() => {
          setAccountFormOpen(false);
          setSelectedRecord(null);
        }}
        onSave={saveAccount}
        walletAddress={walletAddress}
      />

      <ContactForm
        contact={selectedRecord}
        isOpen={contactFormOpen}
        onClose={() => {
          setContactFormOpen(false);
          setSelectedRecord(null);
        }}
        onSave={saveContact}
        walletAddress={walletAddress}
      />
    </div>
  );
}
