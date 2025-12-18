/**
 * Formatting Utilities
 *
 * Helper functions for formatting data for display
 */

/**
 * Format USDC amount (6 decimals) to human-readable string
 */
export function formatUSDC(amount: bigint | string | number, decimals: number = 6): string {
  const amountBigInt = typeof amount === 'bigint' ? amount : BigInt(amount);
  const divisor = BigInt(10 ** decimals);
  const wholePart = amountBigInt / divisor;
  const fractionalPart = amountBigInt % divisor;

  // Format with commas and 2 decimal places
  const wholeStr = wholePart.toLocaleString('en-US');
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0').slice(0, 2);

  return `$${wholeStr}.${fractionalStr}`;
}

/**
 * Format ETH amount (18 decimals) to human-readable string
 */
export function formatETH(amount: bigint | string, maxDecimals: number = 4): string {
  const amountBigInt = typeof amount === 'bigint' ? amount : BigInt(amount);
  const divisor = BigInt(10 ** 18);
  const wholePart = amountBigInt / divisor;
  const fractionalPart = amountBigInt % divisor;

  const wholeStr = wholePart.toString();
  const fractionalStr = fractionalPart.toString().padStart(18, '0').slice(0, maxDecimals);

  return `${wholeStr}.${fractionalStr} ETH`;
}

/**
 * Format wallet address for display (0x1234...5678)
 */
export function formatAddress(address: string, startChars: number = 6, endChars: number = 4): string {
  if (!address || address.length < startChars + endChars) {
    return address;
  }

  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Format transaction hash for display
 */
export function formatTxHash(hash: string): string {
  return formatAddress(hash, 8, 6);
}

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string | number): string {
  const dateObj = typeof date === 'object' && date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

  return dateObj.toLocaleDateString();
}

/**
 * Format number with commas
 */
export function formatNumber(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num.toLocaleString('en-US');
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
