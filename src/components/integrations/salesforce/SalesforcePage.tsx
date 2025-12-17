'use client';

import { useState, useEffect } from 'react';
import {
  Home,
  TrendingUp,
  Headphones,
  Megaphone,
  BarChart3,
  LayoutDashboard,
  MessageSquare,
  FolderOpen,
  Package,
  FileText,
  CheckCircle,
  Calendar,
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
  Target,
  Award,
  Star,
  Clock,
  Phone,
  Mail,
  Globe
} from 'lucide-react';

interface SalesforcePageProps {
  walletAddress: string;
  data: any;
  onRefresh: () => void;
}

// Salesforce sidebar navigation items
const SF_SIDEBAR_ITEMS = [
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
      { id: 'forecasts', label: 'Forecasts' },
    ]
  },
  {
    id: 'service',
    label: 'Service',
    icon: Headphones,
    submenu: [
      { id: 'cases', label: 'Cases' },
      { id: 'knowledge', label: 'Knowledge' },
    ]
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: Megaphone,
    submenu: [
      { id: 'campaigns', label: 'Campaigns' },
      { id: 'campaign-members', label: 'Campaign Members' },
    ]
  },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'dashboards', label: 'Dashboards', icon: LayoutDashboard },
  { id: 'chatter', label: 'Chatter', icon: MessageSquare },
  { id: 'files', label: 'Files', icon: FolderOpen },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'quotes', label: 'Quotes', icon: FileText },
  { id: 'tasks', label: 'Tasks', icon: CheckCircle },
  { id: 'events', label: 'Events', icon: Calendar },
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

export default function SalesforcePage({ walletAddress, data, onRefresh }: SalesforcePageProps) {
  const [activeSection, setActiveSection] = useState('home');
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['sales']);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev =>
      prev.includes(menuId)
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  const handleCreate = (itemType: string) => {
    // Import the form component dynamically based on itemType
    setCreateMenuOpen(false);
    // TODO: Open respective form modal
    console.log('Create:', itemType);
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
                  onClick={() => toggleMenu(item.id)}
                  className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors text-sm"
                >
                  <item.icon className="w-4 h-4" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {expandedMenus.includes(item.id) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                {expandedMenus.includes(item.id) && (
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
                onClick={() => setActiveSection(item.id)}
                className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors text-sm ${
                  activeSection === item.id ? 'bg-white/10 border-l-2 border-blue-400' : ''
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
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
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
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

  // Render active section content
  const renderSectionContent = () => {
    // Import section components dynamically
    switch (activeSection) {
      case 'home':
        return renderHomeDashboard();
      case 'leads':
        return viewMode === 'kanban' ? renderLeadsKanban() : renderLeadsList();
      case 'accounts':
        return renderAccountsList();
      case 'contacts':
        return renderContactsList();
      case 'opportunities':
        return viewMode === 'kanban' ? renderOpportunitiesKanban() : renderOpportunitiesList();
      case 'cases':
        return renderCasesList();
      case 'campaigns':
        return renderCampaignsList();
      case 'reports':
        return renderReportsDashboard();
      case 'tasks':
        return renderTasksList();
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

  // Home Dashboard
  const renderHomeDashboard = () => {
    const metrics = [
      { label: 'Open Opportunities', value: data?.opportunities?.filter((o: any) => !o.stage?.includes('Closed')).length || 0, icon: DollarSign, color: 'blue' },
      { label: 'New Leads This Week', value: data?.leads?.length || 0, icon: UserPlus, color: 'green' },
      { label: 'Open Cases', value: data?.cases?.filter((c: any) => c.status !== 'Closed').length || 0, icon: AlertCircle, color: 'orange' },
      { label: 'Tasks Due Today', value: data?.tasks?.filter((t: any) => new Date(t.due_date).toDateString() === new Date().toDateString()).length || 0, icon: CheckCircle, color: 'purple' },
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
              {(data?.opportunities || []).slice(0, 5).map((opp: any, idx: number) => (
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
              {(data?.leads || []).slice(0, 5).map((lead: any, idx: number) => (
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

  // Placeholder render functions (to be implemented with actual components)
  const renderLeadsKanban = () => <div className="p-6">Leads Kanban View</div>;
  const renderLeadsList = () => <div className="p-6">Leads List View</div>;
  const renderAccountsList = () => <div className="p-6">Accounts List</div>;
  const renderContactsList = () => <div className="p-6">Contacts List</div>;
  const renderOpportunitiesKanban = () => <div className="p-6">Opportunities Kanban View</div>;
  const renderOpportunitiesList = () => <div className="p-6">Opportunities List View</div>;
  const renderCasesList = () => <div className="p-6">Cases List</div>;
  const renderCampaignsList = () => <div className="p-6">Campaigns List</div>;
  const renderReportsDashboard = () => <div className="p-6">Reports Dashboard</div>;
  const renderTasksList = () => <div className="p-6">Tasks List</div>;

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
          {renderSectionContent()}
        </div>
      </div>
    </div>
  );
}
