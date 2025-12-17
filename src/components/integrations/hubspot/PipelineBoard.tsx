'use client';

import { useState } from 'react';
import {
  DollarSign,
  Calendar,
  User,
  MoreVertical,
  Plus,
  TrendingUp,
  Eye,
  Edit3,
  Trash2,
  Building
} from 'lucide-react';

interface Deal {
  id: string;
  dealname: string;
  amount: string | number;
  dealstage: string;
  closedate?: string;
  hubspot_owner_id?: string;
  company?: string;
  probability?: number;
}

interface PipelineBoardProps {
  deals: Deal[];
  onDealClick?: (deal: Deal) => void;
  onDealUpdate?: (dealId: string, newStage: string) => void;
  onCreateDeal?: (stage: string) => void;
}

// HubSpot Default Sales Pipeline Stages
const PIPELINE_STAGES = [
  { id: 'appointmentscheduled', label: 'Appointment Scheduled', probability: 20, color: 'bg-gray-100' },
  { id: 'qualifiedtobuy', label: 'Qualified to Buy', probability: 40, color: 'bg-blue-100' },
  { id: 'presentationscheduled', label: 'Presentation Scheduled', probability: 60, color: 'bg-indigo-100' },
  { id: 'decisionmakerboughtin', label: 'Decision Maker Bought-In', probability: 80, color: 'bg-purple-100' },
  { id: 'contractsent', label: 'Contract Sent', probability: 90, color: 'bg-green-100' },
  { id: 'closedwon', label: 'Closed Won', probability: 100, color: 'bg-green-200' },
  { id: 'closedlost', label: 'Closed Lost', probability: 0, color: 'bg-red-100' },
];

export function PipelineBoard({ deals, onDealClick, onDealUpdate, onCreateDeal }: PipelineBoardProps) {
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);

  // Group deals by stage
  const dealsByStage = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage.id] = deals.filter(d =>
      d.dealstage?.toLowerCase().replace(/\s+/g, '') === stage.id.toLowerCase()
    );
    return acc;
  }, {} as Record<string, Deal[]>);

  // Calculate stage totals
  const getStageTotals = (stageId: string) => {
    const stageDeals = dealsByStage[stageId] || [];
    const total = stageDeals.reduce((sum, deal) => {
      const amount = parseFloat(deal.amount?.toString() || '0');
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    return { count: stageDeals.length, total };
  };

  // Handle drag start
  const handleDragStart = (deal: Deal) => {
    setDraggedDeal(deal);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setHoveredStage(stageId);
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setHoveredStage(null);

    if (draggedDeal && draggedDeal.dealstage !== stageId) {
      onDealUpdate?.(draggedDeal.id, stageId);
    }

    setDraggedDeal(null);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedDeal(null);
    setHoveredStage(null);
  };

  return (
    <div className="h-full overflow-x-auto">
      <div className="flex space-x-4 pb-4 min-w-max">
        {PIPELINE_STAGES.map((stage) => {
          const { count, total } = getStageTotals(stage.id);
          const isHovered = hoveredStage === stage.id;

          return (
            <div
              key={stage.id}
              className={`flex-shrink-0 w-80 ${stage.color} rounded-lg transition-all ${
                isHovered ? 'ring-2 ring-blue-500' : ''
              }`}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              {/* Stage Header */}
              <div className="p-4 border-b border-gray-300">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{stage.label}</h3>
                  <button
                    onClick={() => onCreateDeal?.(stage.id)}
                    className="p-1 hover:bg-white/50 rounded"
                  >
                    <Plus className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{count} deals</span>
                  <span className="font-medium text-gray-900">${total.toLocaleString()}</span>
                </div>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Win Probability</span>
                    <span>{stage.probability}%</span>
                  </div>
                  <div className="w-full bg-gray-300 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        stage.probability === 100 ? 'bg-green-600' :
                        stage.probability === 0 ? 'bg-red-600' :
                        'bg-blue-600'
                      }`}
                      style={{ width: `${stage.probability}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Deals List */}
              <div className="p-2 space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                {(dealsByStage[stage.id] || []).map((deal) => (
                  <div
                    key={deal.id}
                    draggable
                    onDragStart={() => handleDragStart(deal)}
                    onDragEnd={handleDragEnd}
                    className={`bg-white rounded-lg border p-3 cursor-move hover:shadow-md transition-shadow ${
                      draggedDeal?.id === deal.id ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Deal Header */}
                    <div className="flex items-start justify-between mb-2">
                      <h4
                        className="font-medium text-gray-900 text-sm line-clamp-2 cursor-pointer hover:text-blue-600"
                        onClick={() => onDealClick?.(deal)}
                      >
                        {deal.dealname || 'Untitled Deal'}
                      </h4>
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>

                    {/* Deal Amount */}
                    <div className="flex items-center space-x-2 mb-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span className="text-lg font-semibold text-gray-900">
                        ${parseFloat(deal.amount?.toString() || '0').toLocaleString()}
                      </span>
                    </div>

                    {/* Deal Meta */}
                    <div className="space-y-1.5">
                      {deal.company && (
                        <div className="flex items-center space-x-2 text-xs text-gray-600">
                          <Building className="w-3 h-3" />
                          <span className="truncate">{deal.company}</span>
                        </div>
                      )}

                      {deal.closedate && (
                        <div className="flex items-center space-x-2 text-xs text-gray-600">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(deal.closedate).toLocaleDateString()}</span>
                        </div>
                      )}

                      {deal.hubspot_owner_id && (
                        <div className="flex items-center space-x-2 text-xs text-gray-600">
                          <User className="w-3 h-3" />
                          <span className="truncate">Owner: {deal.hubspot_owner_id}</span>
                        </div>
                      )}

                      {deal.probability !== undefined && (
                        <div className="flex items-center space-x-2 text-xs">
                          <TrendingUp className="w-3 h-3 text-blue-600" />
                          <span className="text-blue-600 font-medium">{deal.probability}% to close</span>
                        </div>
                      )}
                    </div>

                    {/* Deal Actions */}
                    <div className="mt-3 pt-3 border-t flex items-center justify-end space-x-2">
                      <button
                        onClick={() => onDealClick?.(deal)}
                        className="p-1.5 hover:bg-gray-100 rounded"
                        title="View details"
                      >
                        <Eye className="w-3.5 h-3.5 text-gray-600" />
                      </button>
                      <button
                        className="p-1.5 hover:bg-gray-100 rounded"
                        title="Edit deal"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-gray-600" />
                      </button>
                      <button
                        className="p-1.5 hover:bg-gray-100 rounded"
                        title="Delete deal"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-gray-600" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Empty State */}
                {(!dealsByStage[stage.id] || dealsByStage[stage.id].length === 0) && (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-sm">No deals in this stage</div>
                    <button
                      onClick={() => onCreateDeal?.(stage.id)}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-700"
                    >
                      + Add deal
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
