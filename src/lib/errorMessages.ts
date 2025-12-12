/**
 * User-Friendly Error Messages
 *
 * Converts technical errors into friendly, actionable messages.
 * Every error includes:
 * - Simple explanation (what happened)
 * - Why it happened
 * - What to do next (actionable steps)
 */

export interface FriendlyError {
  title: string;
  message: string;
  action?: string;
  severity: 'error' | 'warning' | 'info';
  icon: string;
}

/**
 * Convert any error to a user-friendly message
 */
export function toFriendlyError(error: unknown): FriendlyError {
  const errorMessage =
    (error as Error)?.message ||
    (typeof error === 'string' ? error : null) ||
    (error && typeof error === 'object' && 'toString' in error ? String(error) : null) ||
    'Unknown error';
  const errorString = errorMessage.toLowerCase();

  // Network errors
  if (errorString.includes('network') || errorString.includes('fetch failed') || errorString.includes('econnrefused')) {
    return {
      title: 'Connection Problem',
      message: 'We couldn\'t connect to our servers. This might be a temporary network issue.',
      action: 'Please check your internet connection and try again in a moment.',
      severity: 'error',
      icon: '🌐',
    };
  }

  // Authentication errors
  if (errorString.includes('unauthorized') || errorString.includes('not authenticated') || errorString.includes('401')) {
    return {
      title: 'Please Sign In',
      message: 'Your session has expired or you\'re not signed in.',
      action: 'Please sign in again to continue.',
      severity: 'warning',
      icon: '🔒',
    };
  }

  // Permission errors
  if (errorString.includes('forbidden') || errorString.includes('403') || errorString.includes('permission denied')) {
    return {
      title: 'Access Denied',
      message: 'You don\'t have permission to perform this action.',
      action: 'Contact your administrator if you need access.',
      severity: 'warning',
      icon: '🚫',
    };
  }

  // Wallet errors
  if (errorString.includes('wallet') || errorString.includes('metamask') || errorString.includes('user rejected')) {
    if (errorString.includes('rejected') || errorString.includes('denied')) {
      return {
        title: 'Transaction Cancelled',
        message: 'You cancelled the transaction in your wallet.',
        action: 'Try again when you\'re ready to confirm.',
        severity: 'info',
        icon: '👛',
      };
    }
    return {
      title: 'Wallet Connection Issue',
      message: 'There was a problem connecting to your wallet.',
      action: 'Make sure your wallet is unlocked and try again.',
      severity: 'error',
      icon: '👛',
    };
  }

  // Insufficient funds errors
  if (errorString.includes('insufficient funds') || errorString.includes('insufficient balance')) {
    if (errorString.includes('gas')) {
      return {
        title: 'Not Enough for Gas Fees',
        message: 'You don\'t have enough native tokens to pay for transaction fees.',
        action: 'Add some ETH to your wallet or use gasless transactions.',
        severity: 'error',
        icon: '⛽',
      };
    }
    return {
      title: 'Insufficient Balance',
      message: 'You don\'t have enough tokens for this transaction.',
      action: 'Add funds to your wallet and try again.',
      severity: 'error',
      icon: '💰',
    };
  }

  // Smart contract errors
  if (errorString.includes('revert') || errorString.includes('execution reverted')) {
    return {
      title: 'Transaction Failed',
      message: 'The blockchain rejected this transaction. This could be due to insufficient balance, invalid parameters, or contract rules.',
      action: 'Please check your balance and transaction details, then try again.',
      severity: 'error',
      icon: '⛓️',
    };
  }

  // Timeout errors
  if (errorString.includes('timeout') || errorString.includes('timed out')) {
    return {
      title: 'Request Timed Out',
      message: 'The operation took too long to complete.',
      action: 'The server might be busy. Please wait a moment and try again.',
      severity: 'error',
      icon: '⏱️',
    };
  }

  // Rate limiting
  if (errorString.includes('rate limit') || errorString.includes('429') || errorString.includes('too many requests')) {
    return {
      title: 'Too Many Requests',
      message: 'You\'re making requests too quickly.',
      action: 'Please wait a few seconds and try again.',
      severity: 'warning',
      icon: '🚦',
    };
  }

  // Not found errors
  if (errorString.includes('not found') || errorString.includes('404')) {
    return {
      title: 'Not Found',
      message: 'We couldn\'t find what you\'re looking for.',
      action: 'The item might have been deleted or moved. Please refresh and try again.',
      severity: 'warning',
      icon: '🔍',
    };
  }

  // Server errors
  if (errorString.includes('500') || errorString.includes('server error') || errorString.includes('internal error')) {
    return {
      title: 'Server Error',
      message: 'Something went wrong on our end. Our team has been notified.',
      action: 'Please try again in a few minutes. If the problem continues, contact support.',
      severity: 'error',
      icon: '🔧',
    };
  }

  // Validation errors
  if (errorString.includes('invalid') || errorString.includes('validation')) {
    return {
      title: 'Invalid Input',
      message: 'Some of the information you entered is not valid.',
      action: 'Please check the form and correct any highlighted errors.',
      severity: 'warning',
      icon: '✏️',
    };
  }

  // Generic fallback
  return {
    title: 'Something Went Wrong',
    message: 'We encountered an unexpected problem.',
    action: 'Please try again. If the problem continues, contact our support team.',
    severity: 'error',
    icon: '⚠️',
  };
}

/**
 * Get contextual error message for specific operations
 */
export function getOperationError(operation: string, error: unknown): FriendlyError {
  const baseError = toFriendlyError(error);

  const contextualMessages: Record<string, Partial<FriendlyError>> = {
    'load-dashboard': {
      title: 'Dashboard Loading Failed',
      message: 'We couldn\'t load your dashboard data.',
      action: 'Please refresh the page or try again in a moment.',
    },
    'load-marketplace': {
      title: 'Marketplace Unavailable',
      message: 'We couldn\'t load the marketplace right now.',
      action: 'Please check your connection and refresh the page.',
    },
    'purchase-license': {
      title: 'Purchase Failed',
      message: 'We couldn\'t complete your purchase.',
      action: 'Please check your wallet balance and try again. No charges were made.',
    },
    'connect-integration': {
      title: 'Connection Failed',
      message: 'We couldn\'t connect to this integration.',
      action: 'Please check your credentials and try again.',
    },
    'save-settings': {
      title: 'Settings Not Saved',
      message: 'We couldn\'t save your changes.',
      action: 'Please try again. Your previous settings are still in place.',
    },
    'upload-file': {
      title: 'Upload Failed',
      message: 'We couldn\'t upload your file.',
      action: 'Make sure your file is under 10MB and try again.',
    },
  };

  if (contextualMessages[operation]) {
    return {
      ...baseError,
      ...contextualMessages[operation],
    };
  }

  return baseError;
}

/**
 * Format error for display in toast/notification
 */
export function formatErrorForToast(error: unknown, operation?: string): string {
  const friendlyError = operation ? getOperationError(operation, error) : toFriendlyError(error);
  return `${friendlyError.icon} ${friendlyError.title}: ${friendlyError.message} ${friendlyError.action}`;
}

/**
 * Form validation error messages
 */
export const formErrors = {
  required: (field: string) => `${field} is required`,
  email: 'Please enter a valid email address',
  url: 'Please enter a valid URL (e.g., https://example.com)',
  minLength: (field: string, min: number) => `${field} must be at least ${min} characters`,
  maxLength: (field: string, max: number) => `${field} must be no more than ${max} characters`,
  numeric: 'Please enter a valid number',
  positive: 'Please enter a positive number',
  phone: 'Please enter a valid phone number',
  walletAddress: 'Please enter a valid wallet address (0x...)',
  passwordMismatch: 'Passwords do not match',
  weakPassword: 'Password must include uppercase, lowercase, number, and special character',
  invalidDate: 'Please enter a valid date',
  futureDate: 'Please select a future date',
  pastDate: 'Please select a past date',
  fileSize: (maxSize: string) => `File size must be less than ${maxSize}`,
  fileType: (types: string) => `Please upload a ${types} file`,
  custom: (message: string) => message,
};

/**
 * Success messages for operations
 */
export const successMessages = {
  'save-settings': {
    title: 'Settings Saved',
    message: 'Your changes have been saved successfully.',
    icon: '✅',
  },
  'purchase-license': {
    title: 'Purchase Complete',
    message: 'Your license has been activated.',
    icon: '🎉',
  },
  'connect-integration': {
    title: 'Connected',
    message: 'Integration connected successfully.',
    icon: '🔗',
  },
  'upload-file': {
    title: 'Upload Complete',
    message: 'Your file has been uploaded successfully.',
    icon: '📤',
  },
};
