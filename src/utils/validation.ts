/**
 * @fileoverview Validation utilities for addresses, private keys, and other inputs
 */


/**
 * Validate an Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate a private key
 */
export function isValidPrivateKey(privateKey: string): boolean {
  // Remove 0x prefix if present
  const key = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
  return /^[a-fA-F0-9]{64}$/.test(key);
}

/**
 * Validate a URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
} 