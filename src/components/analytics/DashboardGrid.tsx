'use client';

import React, { useState, useCallback, useEffect } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';
import { Trash2, GripVertical, Maximize2, Minimize2, MoreVertical } from 'lucide-react';
import DynamicChart from './DynamicChart';

import 'react-grid-layout/css/styles.css';

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

interface Widget {
  id: string;
  chart: ChartConfig;
  layout: Layout;
}

interface DashboardGridProps {
  widgets: Widget[];
  onLayoutChange: (layout: Layout[]) => void;
  onRemoveWidget: (widgetId: string) => void;
  isEditing?: boolean;
}

const GRID_COLS = 12;
const ROW_HEIGHT = 100;

export default function DashboardGrid({
  widgets,
  onLayoutChange,
  onRemoveWidget,
  isEditing = true
}: DashboardGridProps) {
  const [containerWidth, setContainerWidth] = useState(1200);
  const [expandedWidget, setExpandedWidget] = useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Update container width on resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const handleLayoutChange = useCallback((newLayout: Layout[]) => {
    onLayoutChange(newLayout);
  }, [onLayoutChange]);

  const toggleExpand = (widgetId: string) => {
    setExpandedWidget(prev => prev === widgetId ? null : widgetId);
  };

  // Generate layout from widgets
  const layout: Layout[] = widgets.map((widget, index) => ({
    i: widget.id,
    x: widget.layout?.x ?? (index % 2) * 6,
    y: widget.layout?.y ?? Math.floor(index / 2) * 3,
    w: widget.layout?.w ?? 6,
    h: widget.layout?.h ?? 3,
    minW: 3,
    minH: 2
  }));

  if (widgets.length === 0) {
    return (
      <div
        ref={containerRef}
        className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200"
      >
        <div className="text-gray-400 mb-2">
          <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-gray-500 font-medium">No charts yet</p>
        <p className="text-sm text-gray-400 mt-1">
          Use the AI sidebar to create your first chart
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Expanded Widget Overlay */}
      {expandedWidget && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-8">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {widgets.find(w => w.id === expandedWidget) && (
              <>
                <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                  <h3 className="font-semibold text-gray-900">
                    {widgets.find(w => w.id === expandedWidget)?.chart.title}
                  </h3>
                  <button
                    onClick={() => setExpandedWidget(null)}
                    className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <Minimize2 className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
                <div className="p-6 h-[500px]">
                  <DynamicChart
                    chart={widgets.find(w => w.id === expandedWidget)!.chart}
                    height={450}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <GridLayout
        className="layout"
        layout={layout}
        cols={GRID_COLS}
        rowHeight={ROW_HEIGHT}
        width={containerWidth}
        onLayoutChange={handleLayoutChange}
        isDraggable={isEditing}
        isResizable={isEditing}
        draggableHandle=".drag-handle"
        margin={[16, 16]}
        containerPadding={[0, 0]}
      >
        {widgets.map((widget) => (
          <div
            key={widget.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden group"
          >
            {/* Widget Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
              <div className="flex items-center gap-2">
                {isEditing && (
                  <div className="drag-handle cursor-grab active:cursor-grabbing">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                  </div>
                )}
                <h3 className="font-medium text-sm text-gray-700 truncate">
                  {widget.chart.title}
                </h3>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => toggleExpand(widget.id)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title="Expand"
                >
                  <Maximize2 className="w-4 h-4 text-gray-500" />
                </button>
                {isEditing && (
                  <button
                    onClick={() => onRemoveWidget(widget.id)}
                    className="p-1 hover:bg-red-100 rounded transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                )}
              </div>
            </div>

            {/* Widget Content */}
            <div className="p-3 h-[calc(100%-44px)]">
              <DynamicChart
                chart={widget.chart}
                height={ROW_HEIGHT * (widget.layout?.h || 3) - 80}
              />
            </div>
          </div>
        ))}
      </GridLayout>
    </div>
  );
}
