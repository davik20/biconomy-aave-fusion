/**
 * @fileoverview Formatting utilities for tokens, addresses, and display values
 */

import { ethers } from 'ethers';
import type { Address } from 'viem';

/**
 * Format a token amount with proper decimals and symbol
 */
export function formatTokenAmount(
  amount: bigint,
  decimals: number,
  symbol: string,
  precision: number = 4
): string {
  const formatted = ethers.formatUnits(amount, decimals);
  const number = parseFloat(formatted);
  let displayPrecision = precision;
  if (number >= 1000) {
    displayPrecision = 2;
  } else if (number >= 1) {
    displayPrecision = 4;
  } else {
    displayPrecision = 6;
  }
  
  return `${number.toFixed(displayPrecision)} ${symbol}`;
}

/**
 * Format duration in human readable format
 */
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
} 