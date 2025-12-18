'use client';

import { useState } from 'react';
import {
  DollarSign,
  Calendar,
  TrendingUp,
  User,
  Building,
  MoreVertical,
  Plus,
  Edit3,
  Trash2,
  Eye
} from 'lucide-react';

interface KanbanCard {
  id: string;
  name: string;
  amount?: number;
  close_date?: string;
  probability?: number;
  account_name?: string;
  company?: string;
  email?: string;
  phone?: string;
  status?: string;
  source?: string;
  [key: string]: any;
}

interface KanbanColumn {
  id: string;
  title: string;
  probability?: number;
  color: string;
  cards: KanbanCard[];
}

interface KanbanBoardProps {
  type: 'leads' | 'opportunities';
  data: KanbanCard[];
  onCardClick?: (card: KanbanCard) => void;
  onCardMove?: (cardId: string, newStage: string) => void;
  onCardEdit?: (card: KanbanCard) => void;
  onCardDelete?: (cardId: string) => void;
}

// Lead pipeline stages
const LEAD_STAGES: Omit<KanbanColumn, 'cards'>[] = [
  { id: 'new', title: 'New', color: 'bg-blue-500' },
  { id: 'open-not-contacted', title: 'Open - Not Contacted', color: 'bg-purple-500' },
  { id: 'working-contacted', title: 'Working - Contacted', color: 'bg-yellow-500' },
  { id: 'closed-converted', title: 'Closed - Converted', color: 'bg-green-500' },
  { id: 'closed-not-converted', title: 'Closed - Not Converted', color: 'bg-gray-500' },
];

// Opportunity pipeline stages (default Salesforce stages)
const OPPORTUNITY_STAGES: Omit<KanbanColumn, 'cards'>[] = [
  { id: 'prospecting', title: 'Prospecting', probability: 10, color: 'bg-blue-500' },
  { id: 'qualification', title: 'Qualification', probability: 20, color: 'bg-indigo-500' },
  { id: 'needs-analysis', title: 'Needs Analysis', probability: 30, color: 'bg-purple-500' },
  { id: 'value-proposition', title: 'Value Proposition', probability: 50, color: 'bg-pink-500' },
  { id: 'id-decision-makers', title: 'Id. Decision Makers', probability: 60, color: 'bg-orange-500' },
  { id: 'perception-analysis', title: 'Perception Analysis', probability: 70, color: 'bg-yellow-500' },
  { id: 'proposal-quote', title: 'Proposal/Price Quote', probability: 75, color: 'bg-lime-500' },
  { id: 'negotiation-review', title: 'Negotiation/Review', probability: 80, color: 'bg-green-500' },
  { id: 'closed-won', title: 'Closed Won', probability: 100, color: 'bg-emerald-600' },
  { id: 'closed-lost', title: 'Closed Lost', probability: 0, color: 'bg-red-500' },
];

export default function KanbanBoard({
  type,
  data,
  onCardClick,
  onCardMove,
  onCardEdit,
  onCardDelete
}: KanbanBoardProps) {
  const [draggedCard, setDraggedCard] = useState<KanbanCard | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);

  const stages = type === 'leads' ? LEAD_STAGES : OPPORTUNITY_STAGES;

  // Organize cards into columns
  const columns: KanbanColumn[] = stages.map(stage => ({
    ...stage,
    cards: data.filter(card => {
      const cardStage = card.stage || card.status || '';
      return cardStage.toLowerCase().replace(/\s+/g, '-') === stage.id;
    })
  }));

  // Calculate total value per column (for opportunities)
  const getColumnTotal = (cards: KanbanCard[]) => {
    return cards.reduce((sum, card) => sum + (card.amount || 0), 0);
  };

  // Handle drag start
  const handleDragStart = (card: KanbanCard) => {
    setDraggedCard(card);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setHoveredColumn(columnId);
  };

  // Handle drop
  const handleDrop = (columnId: string) => {
    if (draggedCard && onCardMove) {
      const newStage = stages.find(s => s.id === columnId)?.title || columnId;
      onCardMove(draggedCard.id, newStage);
    }
    setDraggedCard(null);
    setHoveredColumn(null);
  };

  // Render Lead Card
  const renderLeadCard = (card: KanbanCard) => (
    <div
      draggable
      onDragStart={() => handleDragStart(card)}
      onClick={() => onCardClick?.(card)}
      className="bg-white rounded-lg border border-gray-200 p-4 mb-3 cursor-pointer hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="font-semibold text-gray-900 mb-1">{card.name}</div>
          <div className="text-sm text-gray-600">{card.company}</div>
        </div>
        <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-1 hover:bg-gray-100 rounded">
            <MoreVertical className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        {card.email && (
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span className="truncate">{card.email}</span>
          </div>
        )}
        {card.phone && (
          <div className="flex items-center gap-2">
            <span className="text-gray-400">📞</span>
            <span>{card.phone}</span>
          </div>
        )}
        {card.source && (
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span>{card.source}</span>
          </div>
        )}
      </div>

      {card.rating && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
            card.rating === 'Hot' ? 'bg-red-100 text-red-800' :
            card.rating === 'Warm' ? 'bg-yellow-100 text-yellow-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {card.rating}
          </span>
        </div>
      )}
    </div>
  );

  // Render Opportunity Card
  const renderOpportunityCard = (card: KanbanCard) => (
    <div
      draggable
      onDragStart={() => handleDragStart(card)}
      onClick={() => onCardClick?.(card)}
      className="bg-white rounded-lg border border-gray-200 p-4 mb-3 cursor-pointer hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="font-semibold text-gray-900 mb-1">{card.name}</div>
          {card.account_name && (
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <Building className="w-3.5 h-3.5" />
              <span>{card.account_name}</span>
            </div>
          )}
        </div>
        <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-1 hover:bg-gray-100 rounded">
            <MoreVertical className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {card.amount && (
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span className="font-semibold text-gray-900">
              ${card.amount.toLocaleString()}
            </span>
          </div>
        )}
        {card.close_date && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>{new Date(card.close_date).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {card.probability !== undefined && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Probability</span>
            <span className="font-semibold text-gray-900">{card.probability}%</span>
          </div>
          <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all"
              style={{ width: `${card.probability}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex gap-4 overflow-x-auto pb-6">
        {columns.map(column => (
          <div
            key={column.id}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDrop={() => handleDrop(column.id)}
            className={`flex-shrink-0 w-80 ${
              hoveredColumn === column.id ? 'ring-2 ring-blue-400 rounded-lg' : ''
            }`}
          >
            {/* Column Header */}
            <div className="bg-gray-100 rounded-t-lg p-4 border-b-2 border-gray-300">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${column.color}`}></div>
                  <h3 className="font-semibold text-gray-900">{column.title}</h3>
                </div>
                <span className="text-sm text-gray-600">{column.cards.length}</span>
              </div>

              {column.probability !== undefined && (
                <div className="text-xs text-gray-500 mb-2">
                  {column.probability}% probability
                </div>
              )}

              {type === 'opportunities' && column.cards.length > 0 && (
                <div className="text-sm font-semibold text-gray-900">
                  ${getColumnTotal(column.cards).toLocaleString()}
                </div>
              )}
            </div>

            {/* Cards Container */}
            <div className="bg-gray-50 rounded-b-lg p-4 min-h-[500px] max-h-[calc(100vh-300px)] overflow-y-auto">
              {column.cards.map(card =>
                type === 'leads' ? renderLeadCard(card) : renderOpportunityCard(card)
              )}

              {column.cards.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-sm">No items</div>
                </div>
              )}

              {/* Add New Card Button */}
              <button className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" />
                <span className="text-sm">Add {type === 'leads' ? 'Lead' : 'Opportunity'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pipeline Summary */}
      {type === 'opportunities' && (
        <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Pipeline Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-gray-600 mb-1">Total Opportunities</div>
              <div className="text-2xl font-bold text-gray-900">{data.length}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Total Value</div>
              <div className="text-2xl font-bold text-gray-900">
                ${data.reduce((sum, card) => sum + (card.amount || 0), 0).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Avg. Deal Size</div>
              <div className="text-2xl font-bold text-gray-900">
                ${Math.round(data.reduce((sum, card) => sum + (card.amount || 0), 0) / (data.length || 1)).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Win Rate</div>
              <div className="text-2xl font-bold text-green-600">
                {Math.round((data.filter(d => d.stage?.includes('Closed Won')).length / (data.length || 1)) * 100)}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
