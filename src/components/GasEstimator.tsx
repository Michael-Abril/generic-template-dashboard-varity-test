'use client';
import { logger } from '@/lib/logger';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { AlertTriangle } from 'lucide-react';

interface GasEstimatorProps {
  contract: ethers.Contract | null;
  method: string;
  args: unknown[];
  value?: string;
  className?: string;
}

/**
 * Gas Estimator Component
 *
 * Displays estimated gas fees before executing transactions
 * Features:
 * - Real-time gas estimation
 * - USDC conversion (6 decimals)
 * - Loading states
 * - Error handling
 * - Refresh capability
 */
export function GasEstimator({
  contract,
  method,
  args,
  value,
  className = ''
}: GasEstimatorProps) {
  const [estimating, setEstimating] = useState(false);
  const [gasEstimate, setGasEstimate] = useState<string | null>(null);
  const [gasCostUSDC, setGasCostUSDC] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (contract && method && args) {
      estimateGas();
    }
  }, [contract, method, JSON.stringify(args), value]);

  const estimateGas = async () => {
    if (!contract) {
      setError('Contract not initialized');
      return;
    }

    try {
      setEstimating(true);
      setError(null);

      // Estimate gas for the transaction
      const gasEstimate = await contract.estimateGas[method](...args, {
        ...(value ? { value } : {})
      });

      // Get current gas price
      const provider = contract.provider;
      const gasPrice = await provider.getGasPrice();

      // Calculate total gas cost in wei
      const gasCost = gasEstimate.mul(gasPrice);

      // Convert to USDC (assuming 1 ETH = ~2000 USDC as approximation)
      // In production, fetch real ETH/USDC price from oracle
      const gasCostEth = ethers.utils.formatEther(gasCost);
      const gasCostUSDCValue = (parseFloat(gasCostEth) * 2000).toFixed(6);

      setGasEstimate(gasEstimate.toString());
      setGasCostUSDC(gasCostUSDCValue);
    } catch (err) {
      logger.error('Gas estimation error:', err);

      // User-friendly error messages
      const errorMessage = err instanceof Error ? err.message : '';
      if (errorMessage.includes('insufficient funds')) {
        setError('Insufficient balance for gas fees');
      } else if (errorMessage.includes('execution reverted')) {
        setError('Transaction would fail (contract reverted)');
      } else {
        setError('Unable to estimate gas fees');
      }
    } finally {
      setEstimating(false);
    }
  };

  if (estimating) {
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <div>
            <p className="text-sm font-medium text-blue-900">Estimating Gas Fees...</p>
            <p className="text-xs text-blue-700">Calculating transaction costs</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Gas Estimation Failed</p>
              <p className="text-xs text-red-700 mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={estimateGas}
            className="text-sm text-red-700 hover:text-red-900 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!gasEstimate || !gasCostUSDC) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">⛽</span>
            <h4 className="font-semibold text-gray-900">Estimated Gas Fee</h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600">Gas Units</p>
              <p className="text-lg font-bold text-gray-900">{parseInt(gasEstimate).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Cost (approx.)</p>
              <p className="text-lg font-bold text-green-600">${gasCostUSDC} USDC</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            ⚡ This is an estimate. Actual cost may vary slightly.
          </p>
        </div>
        <button
          onClick={estimateGas}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          title="Refresh gas estimate"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * Simple Gas Badge Component
 * Displays just the estimated cost in a compact badge format
 */
export function GasEstimateBadge({
  contract,
  method,
  args,
  value
}: GasEstimatorProps) {
  const [gasCostUSDC, setGasCostUSDC] = useState<string | null>(null);

  useEffect(() => {
    estimateGasQuick();
  }, [contract, method, JSON.stringify(args), value]);

  const estimateGasQuick = async () => {
    if (!contract) return;

    try {
      const gasEstimate = await contract.estimateGas[method](...args, {
        ...(value ? { value } : {})
      });
      const provider = contract.provider;
      const gasPrice = await provider.getGasPrice();
      const gasCost = gasEstimate.mul(gasPrice);
      const gasCostEth = ethers.utils.formatEther(gasCost);
      const gasCostUSDCValue = (parseFloat(gasCostEth) * 2000).toFixed(6);
      setGasCostUSDC(gasCostUSDCValue);
    } catch (err) {
      logger.error('Quick gas estimation error:', err);
    }
  };

  if (!gasCostUSDC) {
    return (
      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-xs font-medium px-2 py-1 rounded">
        <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-600"></div>
        Estimating gas...
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
      ⛽ ~${gasCostUSDC} gas
    </span>
  );
}
