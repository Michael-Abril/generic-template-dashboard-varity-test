'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ChartConfig {
  id: string;
  type: 'bar' | 'line' | 'area' | 'pie' | 'donut' | 'kpi';
  title: string;
  data: Array<{ label: string; value: number; [key: string]: unknown }>;
  config: {
    xAxisLabel?: string;
    yAxisLabel?: string;
    colors?: string[];
    showLegend?: boolean;
    valuePrefix?: string;
    valueSuffix?: string;
  };
  summary?: string;
  suggested_queries?: string[];
}

interface DynamicChartProps {
  chart: ChartConfig;
  height?: number;
}

const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label, prefix = '', suffix = '' }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white px-3 py-2 shadow-lg rounded-lg border border-gray-200">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {payload.map((entry: { color?: string; value?: number | string }, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {prefix}{typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}{suffix}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function DynamicChart({ chart, height = 300 }: DynamicChartProps) {
  const colors = chart.config.colors || DEFAULT_COLORS;
  const prefix = chart.config.valuePrefix || '';
  const suffix = chart.config.valueSuffix || '';

  // Format data for Recharts
  const formattedData = chart.data.map(item => ({
    ...item,
    name: item.label
  }));

  const formatValue = (value: number) => {
    return `${prefix}${value.toLocaleString()}${suffix}`;
  };

  // KPI Card
  if (chart.type === 'kpi') {
    const item = chart.data[0];
    if (!item) return null;

    const change = typeof item.change === 'number' ? item.change : 0;
    const previousValue = typeof item.previousValue === 'number' ? item.previousValue : null;

    return (
      <div className="h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
        <p className="text-sm text-gray-500 mb-2">{chart.title}</p>
        <p className="text-4xl font-bold text-gray-900">
          {formatValue(item.value)}
        </p>
        {change !== 0 && (
          <div className={`flex items-center gap-1 mt-2 ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500'}`}>
            {change > 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : change < 0 ? (
              <TrendingDown className="w-4 h-4" />
            ) : (
              <Minus className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">
              {change > 0 ? '+' : ''}{change}%
            </span>
            {previousValue !== null && (
              <span className="text-xs text-gray-400 ml-1">
                vs {formatValue(previousValue)}
              </span>
            )}
          </div>
        )}
        {chart.summary && (
          <p className="text-xs text-gray-500 mt-3 text-center max-w-[200px]">
            {chart.summary}
          </p>
        )}
      </div>
    );
  }

  // Bar Chart
  if (chart.type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatValue(value)}
          />
          <Tooltip content={<CustomTooltip prefix={prefix} suffix={suffix} />} />
          {chart.config.showLegend && <Legend />}
          <Bar
            dataKey="value"
            radius={[4, 4, 0, 0]}
            maxBarSize={50}
          >
            {formattedData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // Line Chart
  if (chart.type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatValue(value)}
          />
          <Tooltip content={<CustomTooltip prefix={prefix} suffix={suffix} />} />
          {chart.config.showLegend && <Legend />}
          <Line
            type="monotone"
            dataKey="value"
            stroke={colors[0]}
            strokeWidth={2}
            dot={{ fill: colors[0], strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: colors[0], strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // Area Chart
  if (chart.type === 'area') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradient-${chart.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors[0]} stopOpacity={0.3} />
              <stop offset="95%" stopColor={colors[0]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatValue(value)}
          />
          <Tooltip content={<CustomTooltip prefix={prefix} suffix={suffix} />} />
          {chart.config.showLegend && <Legend />}
          <Area
            type="monotone"
            dataKey="value"
            stroke={colors[0]}
            strokeWidth={2}
            fill={`url(#gradient-${chart.id})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // Pie Chart & Donut Chart
  if (chart.type === 'pie' || chart.type === 'donut') {
    const innerRadius = chart.type === 'donut' ? '55%' : 0;
    const total = formattedData.reduce((sum, item) => sum + item.value, 0);

    return (
      <div className="h-full flex flex-col">
        <ResponsiveContainer width="100%" height={height - 60}>
          <PieChart>
            <Pie
              data={formattedData}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius="80%"
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} (${((percent || 0) * 100).toFixed(0)}%)`}
              labelLine={false}
            >
              {formattedData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                  stroke="white"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [formatValue(Number(value) || 0), '']}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 px-2">
          {formattedData.slice(0, 6).map((item, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span className="text-xs text-gray-600">
                {item.name}: {formatValue(item.value)} ({((item.value / total) * 100).toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="h-full flex items-center justify-center text-gray-500">
      Unsupported chart type: {chart.type}
    </div>
  );
}
