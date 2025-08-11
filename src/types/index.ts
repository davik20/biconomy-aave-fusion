/**
 * @fileoverview Core type definitions for Biconomy MEE Fusion Demo
 */

import type { Address, Hex } from 'viem';
import type { MeeClient } from '@biconomy/abstractjs';
import type { ethers } from 'ethers';

// Configuration Types
export interface BiconomyConfig {
  readonly meeNodeUrl: string;
  readonly anvilRpcUrl: string;
  readonly chainId: number;
  readonly testPrivateKey: string;
  readonly contracts: ContractAddresses;
}

export interface ContractAddresses {
  readonly usdc: Address;
  readonly aavePool: Address;
  readonly aUsdc: Address;
}

// SDK Types
export interface SDKContext {
  readonly orchestrator: any; // Nexus account instance
  readonly meeClient: MeeClient; // Required for Fusion features
  readonly signer: ethers.Wallet;
  readonly provider: ethers.JsonRpcProvider;
  readonly config: BiconomyConfig;
  readonly eoaAddress: Address;
}

// Transaction Types
export interface FusionQuoteRequest {
  readonly instructions: readonly FusionInstruction[];
  readonly trigger: TriggerConfig;
  readonly feeToken: FeeTokenConfig;
}

export interface FusionInstruction {
  readonly type: 'default' | 'batch' | 'multicall';
  readonly data: InstructionData;
}

export interface InstructionData {
  readonly abi: readonly any[];
  readonly chainId: number;
  readonly to: Address;
  readonly functionName: string;
  readonly args: readonly any[];
  readonly value?: bigint;
}

export interface TriggerConfig {
  readonly chainId: number;
  readonly tokenAddress: Address;
  readonly amount: bigint;
}

export interface FeeTokenConfig {
  readonly address: Address;
  readonly chainId: number;
}

// Balance Types
export interface TokenBalance {
  readonly address: Address;
  readonly symbol: string;
  readonly decimals: number;
  readonly balance: bigint;
  readonly formatted: string;
}

export interface BalanceSnapshot {
  readonly timestamp: number;
  readonly blockNumber: number;
  readonly tokens: readonly TokenBalance[];
}

// Transaction Result Types
export interface TransactionResult {
  readonly hash: Hex;
  readonly success: boolean;
  readonly gasUsed?: bigint;
  readonly effectiveGasPrice?: bigint;
}

export interface AaveSupplyResult extends TransactionResult {
  readonly supplyAmount: bigint;
  readonly aTokensReceived: bigint;
  readonly beforeBalance: BalanceSnapshot;
  readonly afterBalance: BalanceSnapshot;
}

// Error Types
export class BiconomyError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'BiconomyError';
  }
}

export class InfrastructureError extends BiconomyError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'INFRASTRUCTURE_ERROR', originalError);
  }
}

export class SDKError extends BiconomyError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'SDK_ERROR', originalError);
  }
}

export class TransactionError extends BiconomyError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'TRANSACTION_ERROR', originalError);
  }
}

// Utility Types
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type NetworkStatus = 'healthy' | 'degraded' | 'offline';

export interface HealthCheck {
  readonly anvil: NetworkStatus;
  readonly meeNode: NetworkStatus;
  readonly lastChecked: number;
} 