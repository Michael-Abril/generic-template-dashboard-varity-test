'use client';

import React, { useState } from 'react';
import {
  X,
  DollarSign,
  Users,
  ShoppingCart,
  BarChart3,
  Mail,
  Calendar,
  TrendingUp,
  Activity,
  Briefcase,
  Building2,
  Check
} from 'lucide-react';

interface LayoutTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  preview: string; // Grid preview description
  widgets: Array<{
    type: string;
    subtype?: string;
    title: string;
    x: number;
    y: number;
    w: number;
    h: number;
    config?: Record<string, unknown>;
  }>;
}

interface LayoutTemplatesProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate: (template: LayoutTemplate) => void;
}

const LAYOUT_TEMPLATES: LayoutTemplate[] = [
  {
    id: 'financial-overview',
    name: 'Financial Overview',
    description: 'Revenue, expenses, and cash flow metrics',
    icon: <DollarSign className="w-6 h-6" />,
    category: 'Finance',
    preview: '4 KPIs + Revenue Chart + Expense Breakdown',
    widgets: [
      { type: 'kpi', subtype: 'revenue', title: 'Total Revenue', x: 0, y: 0, w: 3, h: 2, config: { prefix: '$' } },
      { type: 'kpi', subtype: 'expenses', title: 'Total Expenses', x: 3, y: 0, w: 3, h: 2, config: { prefix: '$' } },
      { type: 'kpi', subtype: 'profit', title: 'Net Profit', x: 6, y: 0, w: 3, h: 2, config: { prefix: '$' } },
      { type: 'kpi', subtype: 'margin', title: 'Profit Margin', x: 9, y: 0, w: 3, h: 2, config: { suffix: '%' } },
      { type: 'chart', subtype: 'line', title: 'Revenue Trend', x: 0, y: 2, w: 8, h: 3 },
      { type: 'chart', subtype: 'pie', title: 'Expense Breakdown', x: 8, y: 2, w: 4, h: 3 },
      { type: 'table', subtype: 'invoices', title: 'Recent Invoices', x: 0, y: 5, w: 6, h: 4 },
      { type: 'list', subtype: 'customers', title: 'Top Customers', x: 6, y: 5, w: 6, h: 4 }
    ]
  },
  {
    id: 'sales-dashboard',
    name: 'Sales Dashboard',
    description: 'Pipeline, deals, and sales performance',
    icon: <TrendingUp className="w-6 h-6" />,
    category: 'Sales',
    preview: '3 KPIs + Pipeline Chart + Deal List',
    widgets: [
      { type: 'kpi', subtype: 'pipeline', title: 'Pipeline Value', x: 0, y: 0, w: 4, h: 2, config: { prefix: '$' } },
      { type: 'kpi', subtype: 'deals', title: 'Open Deals', x: 4, y: 0, w: 4, h: 2 },
      { type: 'kpi', subtype: 'conversion', title: 'Win Rate', x: 8, y: 0, w: 4, h: 2, config: { suffix: '%' } },
      { type: 'chart', subtype: 'bar', title: 'Pipeline by Stage', x: 0, y: 2, w: 6, h: 3 },
      { type: 'chart', subtype: 'line', title: 'Sales Trend', x: 6, y: 2, w: 6, h: 3 },
      { type: 'list', subtype: 'deals', title: 'Recent Deals', x: 0, y: 5, w: 6, h: 4 },
      { type: 'list', subtype: 'activity', title: 'Sales Activity', x: 6, y: 5, w: 6, h: 4 }
    ]
  },
  {
    id: 'customer-analytics',
    name: 'Customer Analytics',
    description: 'Customer insights and engagement metrics',
    icon: <Users className="w-6 h-6" />,
    category: 'Customers',
    preview: '3 KPIs + Growth Chart + Customer List',
    widgets: [
      { type: 'kpi', subtype: 'customers', title: 'Total Customers', x: 0, y: 0, w: 4, h: 2 },
      { type: 'kpi', subtype: 'new_customers', title: 'New This Month', x: 4, y: 0, w: 4, h: 2 },
      { type: 'kpi', subtype: 'churn', title: 'Churn Rate', x: 8, y: 0, w: 4, h: 2, config: { suffix: '%' } },
      { type: 'chart', subtype: 'area', title: 'Customer Growth', x: 0, y: 2, w: 8, h: 3 },
      { type: 'chart', subtype: 'pie', title: 'Customer Segments', x: 8, y: 2, w: 4, h: 3 },
      { type: 'list', subtype: 'customers', title: 'Top Customers', x: 0, y: 5, w: 6, h: 4 },
      { type: 'table', subtype: 'customers', title: 'Customer Details', x: 6, y: 5, w: 6, h: 4 }
    ]
  },
  {
    id: 'ecommerce',
    name: 'E-commerce Overview',
    description: 'Orders, products, and sales metrics',
    icon: <ShoppingCart className="w-6 h-6" />,
    category: 'E-commerce',
    preview: '4 KPIs + Orders Chart + Product List',
    widgets: [
      { type: 'kpi', subtype: 'revenue', title: 'Total Sales', x: 0, y: 0, w: 3, h: 2, config: { prefix: '$' } },
      { type: 'kpi', subtype: 'orders', title: 'Orders', x: 3, y: 0, w: 3, h: 2 },
      { type: 'kpi', subtype: 'aov', title: 'Avg Order Value', x: 6, y: 0, w: 3, h: 2, config: { prefix: '$' } },
      { type: 'kpi', subtype: 'conversion', title: 'Conversion', x: 9, y: 0, w: 3, h: 2, config: { suffix: '%' } },
      { type: 'chart', subtype: 'bar', title: 'Daily Orders', x: 0, y: 2, w: 8, h: 3 },
      { type: 'list', subtype: 'products', title: 'Top Products', x: 8, y: 2, w: 4, h: 3 },
      { type: 'table', subtype: 'orders', title: 'Recent Orders', x: 0, y: 5, w: 12, h: 4 }
    ]
  },
  {
    id: 'operations',
    name: 'Operations Dashboard',
    description: 'Activity, tasks, and team metrics',
    icon: <Activity className="w-6 h-6" />,
    category: 'Operations',
    preview: 'Activity Feed + Calendar + Tasks',
    widgets: [
      { type: 'kpi', subtype: 'tasks', title: 'Open Tasks', x: 0, y: 0, w: 3, h: 2 },
      { type: 'kpi', subtype: 'completed', title: 'Completed Today', x: 3, y: 0, w: 3, h: 2 },
      { type: 'kpi', subtype: 'team', title: 'Team Members', x: 6, y: 0, w: 3, h: 2 },
      { type: 'kpi', subtype: 'productivity', title: 'Productivity', x: 9, y: 0, w: 3, h: 2, config: { suffix: '%' } },
      { type: 'list', subtype: 'activity', title: 'Recent Activity', x: 0, y: 2, w: 6, h: 5 },
      { type: 'list', subtype: 'events', title: 'Upcoming Events', x: 6, y: 2, w: 6, h: 3 },
      { type: 'list', subtype: 'tasks', title: 'Priority Tasks', x: 6, y: 5, w: 6, h: 2 }
    ]
  },
  {
    id: 'marketing',
    name: 'Marketing Dashboard',
    description: 'Campaigns, leads, and engagement',
    icon: <Mail className="w-6 h-6" />,
    category: 'Marketing',
    preview: 'Campaign Metrics + Lead Funnel + Engagement',
    widgets: [
      { type: 'kpi', subtype: 'leads', title: 'Total Leads', x: 0, y: 0, w: 3, h: 2 },
      { type: 'kpi', subtype: 'mql', title: 'MQLs', x: 3, y: 0, w: 3, h: 2 },
      { type: 'kpi', subtype: 'conversion', title: 'Conversion Rate', x: 6, y: 0, w: 3, h: 2, config: { suffix: '%' } },
      { type: 'kpi', subtype: 'cac', title: 'CAC', x: 9, y: 0, w: 3, h: 2, config: { prefix: '$' } },
      { type: 'chart', subtype: 'bar', title: 'Lead Sources', x: 0, y: 2, w: 6, h: 3 },
      { type: 'chart', subtype: 'line', title: 'Lead Trend', x: 6, y: 2, w: 6, h: 3 },
      { type: 'list', subtype: 'campaigns', title: 'Active Campaigns', x: 0, y: 5, w: 6, h: 4 },
      { type: 'table', subtype: 'leads', title: 'Recent Leads', x: 6, y: 5, w: 6, h: 4 }
    ]
  },
  {
    id: 'executive',
    name: 'Executive Summary',
    description: 'High-level KPIs and business health',
    icon: <Briefcase className="w-6 h-6" />,
    category: 'Executive',
    preview: '6 KPIs + Trend Charts',
    widgets: [
      { type: 'kpi', subtype: 'revenue', title: 'Revenue', x: 0, y: 0, w: 4, h: 2, config: { prefix: '$' } },
      { type: 'kpi', subtype: 'customers', title: 'Customers', x: 4, y: 0, w: 4, h: 2 },
      { type: 'kpi', subtype: 'growth', title: 'Growth', x: 8, y: 0, w: 4, h: 2, config: { suffix: '%' } },
      { type: 'chart', subtype: 'line', title: 'Revenue Trend', x: 0, y: 2, w: 6, h: 3 },
      { type: 'chart', subtype: 'line', title: 'Customer Growth', x: 6, y: 2, w: 6, h: 3 },
      { type: 'kpi', subtype: 'profit', title: 'Net Profit', x: 0, y: 5, w: 4, h: 2, config: { prefix: '$' } },
      { type: 'kpi', subtype: 'margin', title: 'Margin', x: 4, y: 5, w: 4, h: 2, config: { suffix: '%' } },
      { type: 'kpi', subtype: 'ltv', title: 'Avg LTV', x: 8, y: 5, w: 4, h: 2, config: { prefix: '$' } }
    ]
  },
  {
    id: 'blank',
    name: 'Start from Scratch',
    description: 'Empty dashboard - build your own',
    icon: <Building2 className="w-6 h-6" />,
    category: 'Custom',
    preview: 'Empty canvas',
    widgets: []
  }
];

const TEMPLATE_CATEGORIES = ['All', 'Finance', 'Sales', 'Customers', 'E-commerce', 'Operations', 'Marketing', 'Executive', 'Custom'];

export default function LayoutTemplates({
  isOpen,
  onClose,
  onApplyTemplate
}: LayoutTemplatesProps) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const filteredTemplates = LAYOUT_TEMPLATES.filter(
    t => selectedCategory === 'All' || t.category === selectedCategory
  );

  const handleApply = () => {
    const template = LAYOUT_TEMPLATES.find(t => t.id === selectedTemplate);
    if (template) {
      onApplyTemplate(template);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Layout Templates</h2>
            <p className="text-sm text-gray-500">Choose a pre-built layout or start from scratch</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="px-6 py-3 border-b overflow-x-auto">
          <div className="flex items-center gap-2">
            {TEMPLATE_CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className={`relative flex flex-col p-4 rounded-xl border-2 transition-all text-left ${
                  selectedTemplate === template.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                {/* Selected Check */}
                {selectedTemplate === template.id && (
                  <div className="absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}

                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                  selectedTemplate === template.id
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {template.icon}
                </div>

                {/* Content */}
                <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
                <p className="text-sm text-gray-500 mb-3">{template.description}</p>

                {/* Preview */}
                <div className="mt-auto">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    {template.preview}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <p className="text-sm text-gray-500">
            {selectedTemplate
              ? `Selected: ${LAYOUT_TEMPLATES.find(t => t.id === selectedTemplate)?.name}`
              : 'Select a template to continue'
            }
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!selectedTemplate}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { LAYOUT_TEMPLATES };
export type { LayoutTemplate };
