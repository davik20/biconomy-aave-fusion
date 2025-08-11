/**
 * @fileoverview Error handling utilities and custom error classes
 */

export * from '../types';

/**
 * Wraps async functions with retry logic and error handling
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context: string
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        const friendlyError = createFriendlyErrorMessage(error);
        lastError = new Error(`[${context}] ${friendlyError.message}`);
        
        if (attempt < 3) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // Append suggestions if available
        if (friendlyError.suggestions.length > 0) {
          lastError.message += '\n\nSuggestions:\n' + 
            friendlyError.suggestions.map(s => `  • ${s}`).join('\n');
        }
        
        break;
      }
    }
  
    throw lastError || new Error(`[${context}] Unknown error occurred`);
  }
}

/**
 * Format error message with actionable suggestions
 */
function createFriendlyErrorMessage(error: unknown): {
  message: string;
  suggestions: string[];
} {
  const message = extractErrorMessage(error);
  const suggestions: string[] = [];
  
  // Network connection errors
  if (message.includes('ECONNREFUSED') || message.includes('network')) {
    suggestions.push('Check if Anvil is running: npm run infra:anvil');
    suggestions.push('Check if MEE Node is running: npm run infra:mee');
    suggestions.push('Verify network connectivity');
  }
  
  // Contract errors
  if (message.includes('revert') || message.includes('execution reverted')) {
    suggestions.push('Check if contracts are deployed on the fork');
    suggestions.push('Verify transaction parameters');
    suggestions.push('Check account balance and allowances');
  }
  
  // Gas errors
  if (message.includes('gas') || message.includes('out of gas')) {
    suggestions.push('Increase gas limit in transaction');
    suggestions.push('Check if account has sufficient ETH for gas');
  }
  
  // Authentication errors
  if (message.includes('unauthorized') || message.includes('access denied')) {
    suggestions.push('Check private key configuration');
    suggestions.push('Verify account permissions');
  }
  
  // Rate limiting
  if (message.includes('rate limit') || message.includes('too many requests')) {
    suggestions.push('Wait before retrying');
    suggestions.push('Consider using a different RPC provider');
  }
  
  return { message, suggestions };
}

/**
 * Extract error message from different error formats
 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object') {
    const errorObj = error as any;
    
    // Handle ethers errors
    if (errorObj.reason) return errorObj.reason;
    if (errorObj.message) return errorObj.message;
    if (errorObj.error?.message) return errorObj.error.message;
    
    // Handle viem errors
    if (errorObj.shortMessage) return errorObj.shortMessage;
    if (errorObj.details) return errorObj.details;
  }
  
  return 'Unknown error occurred';
}

/**
 * Parse error objects for MEE Fusion and blockchain errors
 */
export function extractErrorDetails(error: any): string {
  try {
    // Handle the specific error format from MEE Fusion: { error: { errors: [...] } }
    if (error?.error?.errors && Array.isArray(error.error.errors)) {
      return error.error.errors.join('; ');
    }
    
    // Handle other common error formats
    if (error?.message) {
      return error.message;
    }
    
    if (error?.error?.message) {
      return error.error.message;
    }
    
    // Handle arrays of errors
    if (Array.isArray(error?.errors)) {
      return error.errors.join('; ');
    }
    
    // Handle reason field (common in blockchain errors)
    if (error?.reason) {
      return error.reason;
    }
    
    // Handle data field (sometimes contains decoded error)
    if (error?.data) {
      return JSON.stringify(error.data);
    }
    
    // Fallback to string representation
    return JSON.stringify(error);
  } catch (parseError) {
    // If parsing fails, return a safe string representation
    return String(error);
  }
} 