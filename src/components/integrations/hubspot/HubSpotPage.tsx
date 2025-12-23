'use client';

import { useState, useEffect } from 'react';
import {
  Home,
  Users,
  Building,
  DollarSign,
  Headphones,
  BarChart3,
  Plus,
  Search,
  Settings,
  Bell,
  HelpCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  AlertCircle,
  Edit3,
  Trash2,
  Eye,
  Filter,
  Download,
  RefreshCw,
  Grid3X3,
  List,
  Sparkles,
  ChevronDown,
  Calendar,
  FileText,
  Megaphone,
  Mail
} from 'lucide-react';

interface HubSpotPageProps {
  walletAddress: string;
  data: any[];
  loading: boolean;
  syncing: boolean;
  error: string | null;
  lastSync: string | null;
  onSync: () => void;
  onRefresh: () => void;
  onCreateContact?: () => void;
  onCreateCompany?: () => void;
  onCreateDeal?: () => void;
  onCreateTicket?: () => void;
  onEditContact?: (contact: any) => void;
  onDeleteContact?: (contactId: string) => void;
  onEditCompany?: (company: any) => void;
  onDeleteCompany?: (companyId: string) => void;
  onEditDeal?: (deal: any) => void;
  onDeleteDeal?: (dealId: string) => void;
  onUpdateDealStage?: (dealId: string, newStage: string) => void;
  onEditTicket?: (ticket: any) => void;
  onDeleteTicket?: (ticketId: string) => void;
}

// Simplified HubSpot CRM Sidebar Navigation - Core CRM features for SMBs
interface SidebarItem {
  id: string;
  label: string;
  icon: any;
  submenu?: Array<{ id: string; label: string }>;
  comingSoon?: boolean;
}

const HS_SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  {
    id: 'contacts',
    label: 'Contacts',
    icon: Users,
    submenu: [
      { id: 'contacts-list', label: 'Contacts' },
      { id: 'companies', label: 'Companies' },
    ]
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: DollarSign,
    submenu: [
      { id: 'deals', label: 'Deals' },
    ]
  },
  { id: 'tickets', label: 'Tickets', icon: Headphones },
  // Coming Soon - feature businesses expect
  { id: 'reports', label: 'Reports', icon: BarChart3, comingSoon: true },
  // Hidden: Tasks, Documents, Meetings, Quotes, Playbooks (Sales Hub extras)
  // Hidden: Marketing Hub (Campaigns, Email, Forms, Landing Pages)
  // Hidden: Service Hub (Knowledge Base, Feedback Surveys)
  // Hidden: Automation (Workflows, Sequences), Conversations
];

// Create Menu Items
const CREATE_MENU_ITEMS = {
  contacts: [
    { id: 'contact', label: 'Contact', icon: Users },
    { id: 'company', label: 'Company', icon: Building },
  ],
  sales: [
    { id: 'deal', label: 'Deal', icon: DollarSign },
    { id: 'task', label: 'Task', icon: CheckCircle },
    { id: 'meeting', label: 'Meeting', icon: Calendar },
    { id: 'quote', label: 'Quote', icon: FileText },
  ],
  service: [
    { id: 'ticket', label: 'Ticket', icon: Headphones },
  ],
  marketing: [
    { id: 'campaign', label: 'Campaign', icon: Megaphone },
    { id: 'email-campaign', label: 'Email', icon: Mail },
  ]
};

export function HubSpotPage({
  walletAddress,
  data,
  loading,
  syncing,
  error,
  lastSync,
  onSync,
  onRefresh,
  onCreateContact,
  onCreateCompany,
  onCreateDeal,
  onCreateTicket,
  onEditContact,
  onDeleteContact,
  onEditCompany,
  onDeleteCompany,
  onEditDeal,
  onDeleteDeal,
  onUpdateDealStage,
  onEditTicket,
  onDeleteTicket
}: HubSpotPageProps) {
  const [activeSection, setActiveSection] = useState('home');
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');

  // Extract data from response
  const contacts = data?.find(d => d.type === 'contacts')?.data || [];
  const companies = data?.find(d => d.type === 'companies')?.data || [];
  const deals = data?.find(d => d.type === 'deals')?.data || [];
  const tickets = data?.find(d => d.type === 'tickets')?.data || [];

  // Render Home Dashboard
  const renderHomeDashboard = () => (
    <div className="space-y-6">
      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Contacts</p>
              <p className="text-3xl font-bold text-gray-900">{contacts.length || 0}</p>
            </div>
            <Users className="w-10 h-10 text-blue-500" />
          </div>
          <p className="text-xs text-green-600 mt-2 flex items-center">
            <TrendingUp className="w-3 h-3 mr-1" />
            +12% from last month
          </p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Open Deals</p>
              <p className="text-3xl font-bold text-gray-900">{deals.length || 0}</p>
            </div>
            <DollarSign className="w-10 h-10 text-green-500" />
          </div>
          <p className="text-xs text-gray-600 mt-2">
            ${deals.reduce((sum: number, d: any) => sum + (parseFloat(d.amount) || 0), 0).toLocaleString()} pipeline
          </p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Companies</p>
              <p className="text-3xl font-bold text-gray-900">{companies.length || 0}</p>
            </div>
            <Building className="w-10 h-10 text-purple-500" />
          </div>
          <p className="text-xs text-green-600 mt-2 flex items-center">
            <TrendingUp className="w-3 h-3 mr-1" />
            +8% from last month
          </p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Open Tickets</p>
              <p className="text-3xl font-bold text-gray-900">{tickets.length || 0}</p>
            </div>
            <Headphones className="w-10 h-10 text-orange-500" />
          </div>
          <p className="text-xs text-red-600 mt-2 flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            3 require attention
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => onCreateContact?.()}
            className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-6 h-6 text-blue-600 mb-2" />
            <span className="text-sm font-medium">Add Contact</span>
          </button>
          <button
            onClick={() => onCreateDeal?.()}
            className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <DollarSign className="w-6 h-6 text-green-600 mb-2" />
            <span className="text-sm font-medium">Create Deal</span>
          </button>
          <button
            onClick={() => onCreateCompany?.()}
            className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Building className="w-6 h-6 text-purple-600 mb-2" />
            <span className="text-sm font-medium">Add Company</span>
          </button>
          <button
            onClick={() => onCreateTicket?.()}
            className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Headphones className="w-6 h-6 text-orange-600 mb-2" />
            <span className="text-sm font-medium">Create Ticket</span>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {deals.slice(0, 5).map((deal: any, i: number) => (
            <div key={i} className="flex items-start space-x-3 pb-3 border-b last:border-0">
              <DollarSign className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{deal.dealname || 'Untitled Deal'}</p>
                <p className="text-xs text-gray-500">
                  Amount: ${parseFloat(deal.amount || 0).toLocaleString()} • Stage: {deal.dealstage || 'Unknown'}
                </p>
              </div>
              <span className="text-xs text-gray-400">2h ago</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Render Contacts List
  const renderContactsList = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Contacts ({contacts.length})</h2>
          <div className="flex items-center space-x-2">
            <button className="flex items-center space-x-2 px-3 py-2 border rounded-lg hover:bg-gray-50">
              <Filter className="w-4 h-4" />
              <span className="text-sm">Filter</span>
            </button>
            <button className="flex items-center space-x-2 px-3 py-2 border rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" />
              <span className="text-sm">Export</span>
            </button>
            <button
              onClick={() => onCreateContact?.()}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">Create contact</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lifecycle Stage</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {contacts.map((contact: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {(contact.firstname?.[0] || contact.lastname?.[0] || '?').toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {contact.firstname} {contact.lastname}
                        </p>
                        <p className="text-xs text-gray-500">{contact.jobtitle || 'No title'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{contact.email || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{contact.phone || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{contact.company || '-'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {contact.lifecyclestage || 'Lead'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onEditContact?.(contact)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="View details"
                      >
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => onEditContact?.(contact)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Edit contact"
                      >
                        <Edit3 className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => onDeleteContact?.(contact.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Delete contact"
                      >
                        <Trash2 className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Render Companies List
  const renderCompaniesList = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Companies ({companies.length})</h2>
          <div className="flex items-center space-x-2">
            <button className="flex items-center space-x-2 px-3 py-2 border rounded-lg hover:bg-gray-50">
              <Filter className="w-4 h-4" />
              <span className="text-sm">Filter</span>
            </button>
            <button
              onClick={() => onCreateCompany?.()}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">Create company</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Domain</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Industry</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">City</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employees</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {companies.map((company: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-3">
                      <Building className="w-6 h-6 text-purple-600" />
                      <span className="text-sm font-medium text-gray-900">{company.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{company.domain || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{company.industry || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{company.city || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{company.numberofemployees || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onEditCompany?.(company)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="View details"
                      >
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => onEditCompany?.(company)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Edit company"
                      >
                        <Edit3 className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => onDeleteCompany?.(company.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Delete company"
                      >
                        <Trash2 className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Render Deals (will integrate PipelineBoard component later)
  const renderDeals = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Deals Pipeline ({deals.length})</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('board')}
              className={`p-2 rounded ${viewMode === 'board' ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => onCreateDeal?.()}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">Create deal</span>
            </button>
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deal Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Close Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {deals.map((deal: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{deal.dealname || 'Untitled'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">${parseFloat(deal.amount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {deal.dealstage || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{deal.closedate || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onEditDeal?.(deal)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="View details"
                        >
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => onEditDeal?.(deal)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Edit deal"
                        >
                          <Edit3 className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => onDeleteDeal?.(deal.id)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Delete deal"
                        >
                          <Trash2 className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            Kanban board view - PipelineBoard component will be integrated here
          </div>
        )}
      </div>
    </div>
  );

  // Render Tickets
  const renderTickets = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Tickets ({tickets.length})</h2>
          <button
            onClick={() => onCreateTicket?.()}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">Create ticket</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tickets.map((ticket: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{ticket.subject || 'No subject'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      ticket.hs_ticket_priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                      ticket.hs_ticket_priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {ticket.hs_ticket_priority || 'LOW'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {ticket.hs_pipeline_stage || 'Open'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{ticket.createdate || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onEditTicket?.(ticket)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="View details"
                      >
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => onEditTicket?.(ticket)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Edit ticket"
                      >
                        <Edit3 className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => onDeleteTicket?.(ticket.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Delete ticket"
                      >
                        <Trash2 className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Render active section
  const renderActiveSection = () => {
    if (loading && !data.length) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading HubSpot data...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-red-600 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-red-900">Error loading data</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button
                onClick={onRefresh}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (!data.length) {
      return (
        <div className="text-center py-12">
          <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No HubSpot data synced yet</h3>
          <p className="text-sm text-gray-600 mb-6">Click the sync button to fetch your CRM data</p>
          <button
            onClick={onSync}
            disabled={syncing}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      );
    }

    switch (activeSection) {
      case 'home':
        return renderHomeDashboard();
      case 'contacts-list':
        return renderContactsList();
      case 'companies':
        return renderCompaniesList();
      case 'deals':
        return renderDeals();
      case 'tickets':
        return renderTickets();
      default:
        return (
          <div className="text-center py-12 text-gray-500">
            {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)} - Coming Soon
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar - HubSpot Navigation */}
      <div className="w-64 bg-white border-r flex flex-col">
        {/* Logo/Brand */}
        <div className="p-4 border-b">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">HubSpot CRM</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-2">
          {HS_SIDEBAR_ITEMS.map((item) => (
            <div key={item.id} className="mb-1">
              <button
                onClick={() => {
                  if (item.comingSoon) return;
                  if (item.submenu) {
                    setActiveSubmenu(activeSubmenu === item.id ? null : item.id);
                  } else {
                    setActiveSection(item.id);
                    setActiveSubmenu(null);
                  }
                }}
                disabled={item.comingSoon}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  item.comingSoon
                    ? 'text-gray-400 cursor-not-allowed'
                    : activeSection === item.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <item.icon className={`w-5 h-5 ${item.comingSoon ? 'text-gray-300' : ''}`} />
                  <span>{item.label}</span>
                </div>
                {item.comingSoon ? (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Soon</span>
                ) : item.submenu ? (
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      activeSubmenu === item.id ? 'rotate-180' : ''
                    }`}
                  />
                ) : null}
              </button>

              {/* Submenu */}
              {item.submenu && !item.comingSoon && activeSubmenu === item.id && (
                <div className="ml-8 mt-1 space-y-1">
                  {item.submenu.map((subitem) => (
                    <button
                      key={subitem.id}
                      onClick={() => setActiveSection(subitem.id)}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        activeSection === subitem.id
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {subitem.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search contacts, companies, deals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={onSync}
                disabled={syncing}
                className="flex items-center space-x-2 px-3 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                <span className="text-sm">{syncing ? 'Syncing...' : 'Sync'}</span>
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowCreateMenu(!showCreateMenu)}
                  className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">Create</span>
                </button>

                {showCreateMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-10">
                    <div className="p-2">
                      <div className="text-xs font-semibold text-gray-500 px-3 py-2">CONTACTS</div>
                      {CREATE_MENU_ITEMS.contacts.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setShowCreateMenu(false);
                            if (item.id === 'contact') onCreateContact?.();
                            if (item.id === 'company') onCreateCompany?.();
                          }}
                          className="w-full flex items-center space-x-3 px-3 py-2 rounded hover:bg-gray-50"
                        >
                          <item.icon className="w-4 h-4 text-gray-600" />
                          <span className="text-sm text-gray-700">{item.label}</span>
                        </button>
                      ))}

                      <div className="border-t my-2" />

                      <div className="text-xs font-semibold text-gray-500 px-3 py-2">SALES</div>
                      {CREATE_MENU_ITEMS.sales.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setShowCreateMenu(false);
                            if (item.id === 'deal') onCreateDeal?.();
                          }}
                          className="w-full flex items-center space-x-3 px-3 py-2 rounded hover:bg-gray-50"
                        >
                          <item.icon className="w-4 h-4 text-gray-600" />
                          <span className="text-sm text-gray-700">{item.label}</span>
                        </button>
                      ))}

                      <div className="border-t my-2" />

                      <div className="text-xs font-semibold text-gray-500 px-3 py-2">SERVICE</div>
                      {CREATE_MENU_ITEMS.service.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setShowCreateMenu(false);
                            if (item.id === 'ticket') onCreateTicket?.();
                          }}
                          className="w-full flex items-center space-x-3 px-3 py-2 rounded hover:bg-gray-50"
                        >
                          <item.icon className="w-4 h-4 text-gray-600" />
                          <span className="text-sm text-gray-700">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button className="p-2 rounded-lg hover:bg-gray-100">
                <Bell className="w-5 h-5 text-gray-600" />
              </button>

              <button className="p-2 rounded-lg hover:bg-gray-100">
                <Settings className="w-5 h-5 text-gray-600" />
              </button>

              <button className="p-2 rounded-lg hover:bg-gray-100">
                <HelpCircle className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Breadcrumb */}
          {lastSync && (
            <div className="mt-2 flex items-center text-xs text-gray-500">
              <Clock className="w-3 h-3 mr-1" />
              Last synced: {new Date(lastSync).toLocaleString()}
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderActiveSection()}
        </div>
      </div>
    </div>
  );
}
