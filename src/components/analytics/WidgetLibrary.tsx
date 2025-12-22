'use client';

import React, { useState } from 'react';
import {
  X,
  Search,
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  Table2,
  FileText,
  List,
  Hash,
  Calendar,
  Users,
  DollarSign,
  ShoppingCart,
  Mail,
  Activity,
  Zap,
  Target,
  Clock,
  AreaChart
} from 'lucide-react';

export interface WidgetTemplate {
  id: string;
  type: 'chart' | 'kpi' | 'table' | 'list' | 'text' | 'metric';
  subtype?: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  defaultSize: { w: number; h: number };
  config?: Record<string, unknown>;
}

interface WidgetLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWidget: (widget: WidgetTemplate) => void;
}

const WIDGET_CATEGORIES = [
  { id: 'charts', name: 'Charts', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'metrics', name: 'Metrics & KPIs', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'data', name: 'Data & Tables', icon: <Table2 className="w-4 h-4" /> },
  { id: 'lists', name: 'Lists', icon: <List className="w-4 h-4" /> },
  { id: 'content', name: 'Content', icon: <FileText className="w-4 h-4" /> },
];

const WIDGET_TEMPLATES: WidgetTemplate[] = [
  // Charts
  {
    id: 'bar-chart',
    type: 'chart',
    subtype: 'bar',
    name: 'Bar Chart',
    description: 'Compare values across categories',
    icon: <BarChart3 className="w-6 h-6" />,
    category: 'charts',
    defaultSize: { w: 6, h: 3 }
  },
  {
    id: 'line-chart',
    type: 'chart',
    subtype: 'line',
    name: 'Line Chart',
    description: 'Show trends over time',
    icon: <LineChart className="w-6 h-6" />,
    category: 'charts',
    defaultSize: { w: 6, h: 3 }
  },
  {
    id: 'area-chart',
    type: 'chart',
    subtype: 'area',
    name: 'Area Chart',
    description: 'Display cumulative values',
    icon: <AreaChart className="w-6 h-6" />,
    category: 'charts',
    defaultSize: { w: 6, h: 3 }
  },
  {
    id: 'pie-chart',
    type: 'chart',
    subtype: 'pie',
    name: 'Pie Chart',
    description: 'Show distribution of parts',
    icon: <PieChart className="w-6 h-6" />,
    category: 'charts',
    defaultSize: { w: 4, h: 3 }
  },
  {
    id: 'donut-chart',
    type: 'chart',
    subtype: 'donut',
    name: 'Donut Chart',
    description: 'Pie chart with center metric',
    icon: <PieChart className="w-6 h-6" />,
    category: 'charts',
    defaultSize: { w: 4, h: 3 }
  },

  // Metrics & KPIs
  {
    id: 'kpi-revenue',
    type: 'kpi',
    subtype: 'revenue',
    name: 'Revenue KPI',
    description: 'Total revenue with trend',
    icon: <DollarSign className="w-6 h-6" />,
    category: 'metrics',
    defaultSize: { w: 3, h: 2 },
    config: { metric: 'revenue', prefix: '$' }
  },
  {
    id: 'kpi-customers',
    type: 'kpi',
    subtype: 'customers',
    name: 'Customers KPI',
    description: 'Total customers count',
    icon: <Users className="w-6 h-6" />,
    category: 'metrics',
    defaultSize: { w: 3, h: 2 },
    config: { metric: 'customers' }
  },
  {
    id: 'kpi-orders',
    type: 'kpi',
    subtype: 'orders',
    name: 'Orders KPI',
    description: 'Total orders count',
    icon: <ShoppingCart className="w-6 h-6" />,
    category: 'metrics',
    defaultSize: { w: 3, h: 2 },
    config: { metric: 'orders' }
  },
  {
    id: 'kpi-conversion',
    type: 'kpi',
    subtype: 'conversion',
    name: 'Conversion Rate',
    description: 'Conversion percentage',
    icon: <Target className="w-6 h-6" />,
    category: 'metrics',
    defaultSize: { w: 3, h: 2 },
    config: { metric: 'conversion', suffix: '%' }
  },
  {
    id: 'kpi-activity',
    type: 'kpi',
    subtype: 'activity',
    name: 'Activity Score',
    description: 'Activity level indicator',
    icon: <Activity className="w-6 h-6" />,
    category: 'metrics',
    defaultSize: { w: 3, h: 2 }
  },
  {
    id: 'metric-sparkline',
    type: 'metric',
    subtype: 'sparkline',
    name: 'Metric with Sparkline',
    description: 'KPI with mini trend chart',
    icon: <Zap className="w-6 h-6" />,
    category: 'metrics',
    defaultSize: { w: 4, h: 2 }
  },

  // Data & Tables
  {
    id: 'data-table',
    type: 'table',
    subtype: 'basic',
    name: 'Data Table',
    description: 'Sortable and filterable table',
    icon: <Table2 className="w-6 h-6" />,
    category: 'data',
    defaultSize: { w: 6, h: 4 }
  },
  {
    id: 'invoices-table',
    type: 'table',
    subtype: 'invoices',
    name: 'Invoices Table',
    description: 'Recent invoices overview',
    icon: <Hash className="w-6 h-6" />,
    category: 'data',
    defaultSize: { w: 6, h: 4 },
    config: { dataSource: 'invoices' }
  },
  {
    id: 'transactions-table',
    type: 'table',
    subtype: 'transactions',
    name: 'Transactions',
    description: 'Recent transactions log',
    icon: <DollarSign className="w-6 h-6" />,
    category: 'data',
    defaultSize: { w: 6, h: 4 },
    config: { dataSource: 'transactions' }
  },

  // Lists
  {
    id: 'top-customers',
    type: 'list',
    subtype: 'customers',
    name: 'Top Customers',
    description: 'Best customers by revenue',
    icon: <Users className="w-6 h-6" />,
    category: 'lists',
    defaultSize: { w: 4, h: 3 },
    config: { dataSource: 'customers', sortBy: 'revenue', limit: 5 }
  },
  {
    id: 'top-products',
    type: 'list',
    subtype: 'products',
    name: 'Top Products',
    description: 'Best selling products',
    icon: <ShoppingCart className="w-6 h-6" />,
    category: 'lists',
    defaultSize: { w: 4, h: 3 },
    config: { dataSource: 'products', sortBy: 'sales', limit: 5 }
  },
  {
    id: 'recent-emails',
    type: 'list',
    subtype: 'emails',
    name: 'Recent Emails',
    description: 'Latest email activity',
    icon: <Mail className="w-6 h-6" />,
    category: 'lists',
    defaultSize: { w: 4, h: 3 },
    config: { dataSource: 'emails', limit: 5 }
  },
  {
    id: 'upcoming-events',
    type: 'list',
    subtype: 'events',
    name: 'Upcoming Events',
    description: 'Calendar events preview',
    icon: <Calendar className="w-6 h-6" />,
    category: 'lists',
    defaultSize: { w: 4, h: 3 },
    config: { dataSource: 'events', limit: 5 }
  },
  {
    id: 'recent-activity',
    type: 'list',
    subtype: 'activity',
    name: 'Recent Activity',
    description: 'Activity feed',
    icon: <Clock className="w-6 h-6" />,
    category: 'lists',
    defaultSize: { w: 4, h: 4 },
    config: { dataSource: 'activity', limit: 10 }
  },

  // Content
  {
    id: 'text-note',
    type: 'text',
    subtype: 'note',
    name: 'Text Note',
    description: 'Add notes or instructions',
    icon: <FileText className="w-6 h-6" />,
    category: 'content',
    defaultSize: { w: 4, h: 2 }
  },
  {
    id: 'text-header',
    type: 'text',
    subtype: 'header',
    name: 'Section Header',
    description: 'Add a section title',
    icon: <FileText className="w-6 h-6" />,
    category: 'content',
    defaultSize: { w: 12, h: 1 }
  },
];

export default function WidgetLibrary({
  isOpen,
  onClose,
  onAddWidget
}: WidgetLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredWidgets = WIDGET_TEMPLATES.filter(widget => {
    const matchesSearch = !searchQuery ||
      widget.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      widget.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || widget.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedWidgets = WIDGET_CATEGORIES.map(category => ({
    ...category,
    widgets: filteredWidgets.filter(w => w.category === category.id)
  })).filter(category => category.widgets.length > 0);

  const handleAddWidget = (widget: WidgetTemplate) => {
    onAddWidget(widget);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed right-0 top-0 h-full w-full sm:w-[400px] bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <div>
            <h2 className="font-semibold text-gray-900">Widget Library</h2>
            <p className="text-xs text-gray-500">Add any widget to your dashboard</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search widgets..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm"
            />
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                !selectedCategory
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {WIDGET_CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {category.icon}
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Widget List */}
        <div className="flex-1 overflow-y-auto p-4 h-[calc(100%-180px)]">
          {groupedWidgets.map((category) => (
            <div key={category.id} className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                {category.icon}
                {category.name}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {category.widgets.map((widget) => (
                  <button
                    key={widget.id}
                    onClick={() => handleAddWidget(widget)}
                    className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-xl hover:bg-blue-50 hover:border-blue-200 border border-transparent transition-all group text-center"
                  >
                    <div className="p-3 bg-white rounded-lg shadow-sm group-hover:shadow-md group-hover:bg-blue-100 transition-all text-gray-600 group-hover:text-blue-600">
                      {widget.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                        {widget.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {widget.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {filteredWidgets.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No widgets found</p>
              <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export { WIDGET_TEMPLATES, WIDGET_CATEGORIES };
