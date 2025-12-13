'use client';
import { logger } from '@/lib/logger';

import { useState, useEffect } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { useWalletSync } from '../app/providers';
import { Check, X, ShoppingCart, ArrowRightLeft, CheckCircle, FileText } from 'lucide-react';

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  status: 'pending' | 'success' | 'failed';
  type: 'purchase' | 'transfer' | 'approval';
  description?: string;
  gasUsed?: string;
  blockNumber?: number;
}

interface TransactionHistoryProps {
  maxTransactions?: number;
  showFilters?: boolean;
}

/**
 * Transaction History Component
 *
 * Displays user's transaction history on Varity L3
 * Features:
 * - Real-time transaction tracking
 * - Status indicators (pending/success/failed)
 * - Transaction type filters
 * - Links to block explorer
 * - Gas usage display
 */
export function TransactionHistory({
  maxTransactions = 10,
  showFilters = true
}: TransactionHistoryProps) {
  const { wallets } = useWallets();
  const { address } = useWalletSync();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'purchase' | 'transfer' | 'approval'>('all');
  const [error, setError] = useState<string | null>(null);

  // Load transaction history from localStorage and blockchain
  useEffect(() => {
    loadTransactionHistory();
  }, [address]);

  const loadTransactionHistory = async () => {
    if (!address) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Load from localStorage (recent transactions)
      const storageKey = `varity_tx_history_${address}`;
      const stored = localStorage.getItem(storageKey);
      const storedTxs: Transaction[] = stored ? JSON.parse(stored) : [];

      // TODO: Fetch from blockchain using RPC
      // For now, use stored transactions
      setTransactions(storedTxs.slice(0, maxTransactions));
    } catch (err) {
      logger.error('Error loading transaction history:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load transaction history';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Add new transaction to history
  const addTransaction = (tx: Transaction) => {
    const storageKey = `varity_tx_history_${address}`;
    const updated = [tx, ...transactions];
    setTransactions(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  // Update transaction status
  const updateTransactionStatus = (hash: string, status: 'success' | 'failed', receipt?: { gasUsed?: bigint | string; blockNumber?: number }) => {
    const storageKey = `varity_tx_history_${address}`;
    const updated = transactions.map(tx =>
      tx.hash === hash
        ? {
            ...tx,
            status,
            gasUsed: receipt?.gasUsed?.toString(),
            blockNumber: receipt?.blockNumber
          }
        : tx
    );
    setTransactions(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const filteredTransactions = filter === 'all'
    ? transactions
    : transactions.filter(tx => tx.type === filter);

  const getStatusBadge = (status: Transaction['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-1 rounded">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600"></div>
            Pending
          </span>
        );
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
            <Check className="w-3 h-3" /> Success
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-xs font-semibold px-2 py-1 rounded">
            <X className="w-3 h-3" /> Failed
          </span>
        );
    }
  };

  const getTypeIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'purchase':
        return <ShoppingCart className="w-6 h-6 text-blue-600" />;
      case 'transfer':
        return <ArrowRightLeft className="w-6 h-6 text-purple-600" />;
      case 'approval':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;

    // Less than 1 minute
    if (diff < 60000) return 'Just now';

    // Less than 1 hour
    if (diff < 3600000) {
      const mins = Math.floor(diff / 60000);
      return `${mins}m ago`;
    }

    // Less than 1 day
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    }

    // Format as date
    return date.toLocaleDateString();
  };

  const shortenHash = (hash: string) => {
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction History</h3>
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
        {transactions.length > 0 && (
          <button
            onClick={loadTransactionHistory}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {showFilters && transactions.length > 0 && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('purchase')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
              filter === 'purchase'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Purchases
          </button>
          <button
            onClick={() => setFilter('transfer')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
              filter === 'transfer'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Transfers
          </button>
          <button
            onClick={() => setFilter('approval')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
              filter === 'approval'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Approvals
          </button>
        </div>
      )}

      {filteredTransactions.length === 0 ? (
        <div className="text-center py-8">
          <div className="flex justify-center mb-2">
            <FileText className="w-10 h-10 text-gray-400" />
          </div>
          <p className="text-gray-600">No transactions yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Your transaction history will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTransactions.map((tx) => (
            <div
              key={tx.hash}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">{getTypeIcon(tx.type)}</div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {tx.description || tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <a
                        href={`https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz/tx/${tx.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-700 font-mono flex items-center gap-1"
                      >
                        {shortenHash(tx.hash)}
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs text-gray-500">{formatTimestamp(tx.timestamp)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {getStatusBadge(tx.status)}
                  {tx.value && (
                    <p className="text-sm text-gray-600 mt-1">
                      {Number(tx.value) / 1e6} USDC
                    </p>
                  )}
                </div>
              </div>

              {tx.gasUsed && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Gas Used: {tx.gasUsed} • Block: {tx.blockNumber}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Export helper functions for use in other components
export const transactionHistoryHelpers = {
  addTransaction: (address: string, tx: Transaction) => {
    const storageKey = `varity_tx_history_${address}`;
    const stored = localStorage.getItem(storageKey);
    const txs: Transaction[] = stored ? JSON.parse(stored) : [];
    txs.unshift(tx);
    localStorage.setItem(storageKey, JSON.stringify(txs));
  },

  updateTransactionStatus: (address: string, hash: string, status: 'success' | 'failed', receipt?: { gasUsed?: bigint | string; blockNumber?: number }) => {
    const storageKey = `varity_tx_history_${address}`;
    const stored = localStorage.getItem(storageKey);
    if (!stored) return;

    const txs: Transaction[] = JSON.parse(stored);
    const updated = txs.map(tx =>
      tx.hash === hash
        ? {
            ...tx,
            status,
            gasUsed: receipt?.gasUsed?.toString(),
            blockNumber: receipt?.blockNumber
          }
        : tx
    );
    localStorage.setItem(storageKey, JSON.stringify(updated));
  },
};
