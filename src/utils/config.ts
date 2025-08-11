/**
 * @fileoverview Configuration management and validation utilities
 */

import type { BiconomyConfig, ContractAddresses, LogLevel } from '../types';
import type { Address } from 'viem';
import { isValidAddress, isValidPrivateKey, isValidUrl } from './validation';

// Environment variable interface
interface EnvConfig {
  ETH_MAINNET_RPC_URL: string;
  TEST_PRIVATE_KEY: string;
  MEE_NODE_URL?: string;
  ANVIL_RPC_URL?: string;
  ANVIL_PORT?: string;
  ANVIL_CHAIN_ID?: string;
  ANVIL_BLOCK_TIME?: string;
  LOG_LEVEL?: LogLevel;
}

// Default configuration
const DEFAULT_CONFIG = {
  meeNodeUrl: 'http://localhost:3000/v3',
} as const;

// Mainnet contract addresses
const MAINNET_CONTRACTS: ContractAddresses = {
  usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
  aavePool: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2' as Address,
  aUsdc: '0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c' as Address,
};

/**
 * Load and validate environment variables
 */
export function loadEnvironment(): EnvConfig {
  const env = {
    ETH_MAINNET_RPC_URL: process.env.ETH_MAINNET_RPC_URL,
    TEST_PRIVATE_KEY: process.env.TEST_PRIVATE_KEY,
    MEE_NODE_URL: process.env.MEE_NODE_URL,
    ANVIL_RPC_URL: process.env.ANVIL_RPC_URL,
    ANVIL_PORT: process.env.ANVIL_PORT,
    ANVIL_CHAIN_ID: process.env.ANVIL_CHAIN_ID,
    ANVIL_BLOCK_TIME: process.env.ANVIL_BLOCK_TIME,
    LOG_LEVEL: process.env.LOG_LEVEL as LogLevel | undefined,
  };

  const errors: string[] = [];

  // Validate required fields
  if (!env.ETH_MAINNET_RPC_URL) {
    errors.push('ETH_MAINNET_RPC_URL is required');
  } else if (!isValidUrl(env.ETH_MAINNET_RPC_URL)) {
    errors.push('ETH_MAINNET_RPC_URL must be a valid URL');
  }

  if (!env.TEST_PRIVATE_KEY) {
    errors.push('TEST_PRIVATE_KEY is required');
  } else if (!isValidPrivateKey(env.TEST_PRIVATE_KEY)) {
    errors.push('TEST_PRIVATE_KEY must be a valid private key');
  }

  // Validate optional fields
  if (env.MEE_NODE_URL && !isValidUrl(env.MEE_NODE_URL)) {
    errors.push('MEE_NODE_URL must be a valid URL');
  }

  if (env.ANVIL_RPC_URL && !isValidUrl(env.ANVIL_RPC_URL)) {
    errors.push('ANVIL_RPC_URL must be a valid URL');
  }

  // Validate Anvil configuration
  if (env.ANVIL_PORT && (isNaN(Number(env.ANVIL_PORT)) || Number(env.ANVIL_PORT) <= 0)) {
    errors.push('ANVIL_PORT must be a positive number');
  }

  if (env.ANVIL_CHAIN_ID && (isNaN(Number(env.ANVIL_CHAIN_ID)) || Number(env.ANVIL_CHAIN_ID) <= 0)) {
    errors.push('ANVIL_CHAIN_ID must be a positive number');
  }

  if (env.ANVIL_BLOCK_TIME && (isNaN(Number(env.ANVIL_BLOCK_TIME)) || Number(env.ANVIL_BLOCK_TIME) <= 0)) {
    errors.push('ANVIL_BLOCK_TIME must be a positive number');
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
  }

  return env as EnvConfig;
}

/**
 * Create Biconomy configuration from environment and defaults
 */
export function createConfig(): BiconomyConfig {
  const env = loadEnvironment();

  // Use environment variables for Anvil configuration, with fallbacks to defaults
  const anvilPort = env.ANVIL_PORT ? Number(env.ANVIL_PORT) : 8545;
  const anvilChainId = env.ANVIL_CHAIN_ID ? Number(env.ANVIL_CHAIN_ID) : 1;
  const anvilRpcUrl = env.ANVIL_RPC_URL ?? `http://localhost:${anvilPort}`;

  const config: BiconomyConfig = {
    meeNodeUrl: env.MEE_NODE_URL ?? DEFAULT_CONFIG.meeNodeUrl,
    anvilRpcUrl,
    chainId: anvilChainId,
    testPrivateKey: env.TEST_PRIVATE_KEY,
    contracts: MAINNET_CONTRACTS,
  };

  // Validate the final configuration
  const errors: string[] = [];

  if (!isValidUrl(config.meeNodeUrl)) {
    errors.push('Invalid MEE Node URL');
  }

  if (!isValidUrl(config.anvilRpcUrl)) {
    errors.push('Invalid Anvil RPC URL');
  }

  if (!Number.isInteger(config.chainId) || config.chainId <= 0) {
    errors.push('Chain ID must be a positive integer');
  }

  if (!isValidPrivateKey(config.testPrivateKey)) {
    errors.push('Invalid private key format');
  }

  if (!isValidAddress(config.contracts.usdc)) {
    errors.push('Invalid USDC contract address');
  }

  if (!isValidAddress(config.contracts.aavePool)) {
    errors.push('Invalid AAVE Pool contract address');
  }

  if (!isValidAddress(config.contracts.aUsdc)) {
    errors.push('Invalid aUSDC contract address');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }

  return config;
}

