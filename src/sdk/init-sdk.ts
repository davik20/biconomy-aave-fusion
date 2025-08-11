/**
 * @fileoverview Biconomy SDK initialization with proper error handling
 */

import 'dotenv/config';
import { 
  createMeeClient,
  toMultichainNexusAccount,
} from '@biconomy/abstractjs';
import { ethers } from 'ethers';
import { http, type Chain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';

import type { SDKContext } from '../types';
import { log } from '../utils/logger';
import { withErrorHandling, SDKError, InfrastructureError } from '../utils/errors';
import { createConfig } from '../utils/config';

/**
 * Initialize the Biconomy SDK with proper error handling and validation
 */
export const initializeBiconomySDK = withErrorHandling(
  async (): Promise<SDKContext> => {
    log.clear();
    log.header('Biconomy MEE SDK Initialization');

    // Load configuration and validate environment
    log.step(1, 'Loading configuration');
    const config = createConfig();
    log.success('Configuration loaded and validated');

    // Connect to blockchain and verify network
    log.step(2, 'Connecting to Anvil fork');
    const provider = new ethers.JsonRpcProvider(config.anvilRpcUrl);
    
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== config.chainId) {
      throw new InfrastructureError(
        `Chain ID mismatch: expected ${config.chainId}, got ${network.chainId}`
      );
    }
    
    log.success('Connected to Anvil fork', {
      chainId: network.chainId.toString(),
      rpcUrl: config.anvilRpcUrl,
    });

    // Setup wallet with private key
    log.step(3, 'Setting up wallet signer');
    const signer = new ethers.Wallet(config.testPrivateKey, provider);
    
    // Check wallet has gas funds
    const ethBalance = await provider.getBalance(signer.address);
    if (ethBalance === 0n) {
      log.warn('Signer has zero ETH balance', {
        address: signer.address,
      });
    }
    
    log.success('Wallet signer initialized', {
      address: signer.address,
      ethBalance: ethers.formatEther(ethBalance),
    });

    // Configure chain for Nexus
    log.step(4, 'Creating chain configuration');
    const customChain: Chain = {
      ...mainnet,
      rpcUrls: {
        default: { http: [config.anvilRpcUrl] },
        public: { http: [config.anvilRpcUrl] },
      },
    };

    // Create smart account instance
    log.step(5, 'Creating Nexus Smart Account');
    const orchestrator = await toMultichainNexusAccount({
      signer: privateKeyToAccount(config.testPrivateKey as `0x${string}`),
      chains: [customChain],
      transports: [http(config.anvilRpcUrl)],
    });

    log.success('Nexus Smart Account created');

    // Setup MEE client for Fusion
    log.step(6, 'Initializing MEE Client');
    
    // Verify MEE Node is accessible  
    const response = await fetch(`${config.meeNodeUrl}/info`);
    if (!response.ok) {
      throw new InfrastructureError(
        `MEE Node is not accessible at ${config.meeNodeUrl}. ` +
        `Status: ${response.status}. ` +
        `Please ensure MEE Node is running: npm run infra:mee`
      );
    }
    
    const nodeInfo = await response.json() as any;
    log.info('MEE Node is operational', {
      version: nodeInfo.version || 'unknown',
      url: config.meeNodeUrl,
    });

    const meeClient = await createMeeClient({
      account: orchestrator as any,
      url: config.meeNodeUrl as any,
    });

    log.success('MEE Client initialized - Fusion features ready');

        // Check account balances
    log.step(7, 'Checking token balances');
         const usdcContract = new ethers.Contract(
      config.contracts.usdc,
      ['function balanceOf(address) view returns (uint256)'],
      provider
    );

     const usdcBalance = await usdcContract.balanceOf!(signer.address) as bigint;
    
    log.info('Token balances checked', {
      usdc: ethers.formatUnits(usdcBalance, 6),
      usdcAddress: config.contracts.usdc,
    });

    // Build SDK context object
    const sdkContext: SDKContext = {
      orchestrator,
      meeClient,
      signer,
      provider,
      config,
      eoaAddress: signer.address as `0x${string}`,
    };

    log.success('SDK initialization complete!', {
      eoaAddress: signer.address,
      chainId: config.chainId.toString(),
      meeNodeConnected: !!meeClient,
    });

    return sdkContext;
  },
  'SDK Initialization'
);

