/**
 * @fileoverview AAVE integration using Biconomy MEE Fusion
 * 
 * Handles atomic approve + supply operations using Fusion supertransactions.
 * Gas fees are abstracted and paid in USDC.
 */

import { ethers } from 'ethers';

import type { SDKContext, AaveSupplyResult, TokenBalance, BalanceSnapshot } from '../types';
import { log } from '../utils/logger';
import { withErrorHandling, TransactionError, extractErrorDetails } from '../utils/errors';
import { ERC20_ABI, AAVE_POOL_ABI } from '../utils/contracts';
import { formatTokenAmount, formatDuration } from '../utils/formatting';
import { initializeBiconomySDK } from '../sdk/init-sdk';
import { ensureSufficientUSDC, } from '../infrastructure/fund-account';

/**
 * Execute AAVE supply transaction using Fusion
 */
export const executeFusionAaveDemo = withErrorHandling(
  async (): Promise<AaveSupplyResult> => {
    log.clear();
    log.header('AAVE Fusion Supertransaction Demo');
    log.section('Features', [
      'External wallet integration',
      'Atomic DeFi operations', 
      'MEE Fusion technology',
      'Gas abstraction with USDC'
    ]);

    // Initialize SDK and connect to MEE
    log.step(1, 'Initializing Biconomy SDK');
    const sdk = await initializeBiconomySDK();
    log.success('SDK initialized successfully');

    // Capture current account state
    log.step(2, 'Checking initial token balances');
    const beforeBalance = await captureBalanceSnapshot(sdk);
    
    displayBalanceSnapshot('Initial Balances', beforeBalance);

    // Fund account if needed
    log.step(3, 'Ensuring sufficient USDC balance');
    
    // Need at least 100 USDC for transaction
    const targetUSDCAmount = BigInt('100000000'); // 100 USDC
    await ensureSufficientUSDC(sdk, targetUSDCAmount);
    
    // Update balance after funding
    const updatedBalance = await captureBalanceSnapshot(sdk);
    Object.assign(beforeBalance, updatedBalance);
    
    displayBalanceSnapshot('Updated Balances After Funding', beforeBalance);

    // Get the final USDC balance after funding
    const finalUsdcBalance = beforeBalance.tokens.find(t => t.symbol === 'USDC');
    if (!finalUsdcBalance) {
      throw new TransactionError(
        'USDC token not found in balance snapshot. Unable to proceed with demo.'
      );
    }
    
    if (finalUsdcBalance.balance < BigInt('20000000')) {
      throw new TransactionError(
        'Insufficient USDC balance for demo execution. ' +
        `Current balance: ${finalUsdcBalance.formatted} USDC. ` +
        'Minimum required: 20 USDC. Please fund your account.'
      );
    }
    
    // Use 50% of balance for safety
    const supplyAmount = finalUsdcBalance.balance / 2n;
    log.info('Transaction parameters calculated', {
      supplyAmount: formatTokenAmount(supplyAmount, 6, 'USDC'),
      percentage: '50% of total balance',
    });

    // Execute atomic AAVE transaction
    log.step(4, 'Executing Fusion Supertransaction');
    let transactionResult = await executeFusionTransaction(sdk, supplyAmount);

         // Check final state
     log.step(5, 'Capturing final balances');
     const afterBalance = await captureBalanceSnapshot(sdk);
     transactionResult = { ...transactionResult, afterBalance };

    displayBalanceSnapshot('Final Balances', afterBalance);
    displayBalanceChanges(beforeBalance, afterBalance);

    // Show transaction summary
    displayTransactionSummary(transactionResult);

    return transactionResult;
  },
  'AAVE Fusion Demo'
);

/**
 * Execute the transaction using MEE Fusion
 */
async function executeFusionTransaction(
  sdk: SDKContext,
  supplyAmount: bigint
): Promise<AaveSupplyResult> {
  const startTime = Date.now();

  try {
    log.info('Building Fusion instructions...');

    // Build approve instruction
    const approveInstruction = await sdk.orchestrator.buildComposable({
      type: 'default',
      data: {
        abi: ERC20_ABI,
        chainId: sdk.config.chainId,
        to: sdk.config.contracts.usdc,
        functionName: 'approve',
        args: [sdk.config.contracts.aavePool, supplyAmount],
      },
    });

    // Build supply instruction
    const supplyInstruction = await sdk.orchestrator.buildComposable({
      type: 'default',
      data: {
        abi: AAVE_POOL_ABI,
        chainId: sdk.config.chainId,
        to: sdk.config.contracts.aavePool,
        functionName: 'supply',
        args: [
          sdk.config.contracts.usdc,
          supplyAmount,
          sdk.eoaAddress,
          0, // No referral code
        ],
      },
    });

    const instructions = [approveInstruction, supplyInstruction];

    log.info('Getting Fusion quote...');
    const fusionQuote = await sdk.meeClient.getFusionQuote({
      instructions,
      trigger: {
        chainId: sdk.config.chainId,
        tokenAddress: sdk.config.contracts.usdc,
        amount: supplyAmount,
      },
      feeToken: {
        address: sdk.config.contracts.usdc,
        chainId: sdk.config.chainId,
      },
    });

    log.info('Executing Fusion quote...');
    const { hash } = await sdk.meeClient.executeFusionQuote({ fusionQuote });

    log.info('Transaction submitted', {
      hash: hash,
    });

    log.info('Waiting for transaction completion...');
    const receipt = await sdk.meeClient.waitForSupertransactionReceipt({ hash });

    const executionTime = Date.now() - startTime;

    if (receipt.transactionStatus === 'FAILED' || receipt.transactionStatus === 'MINED_FAIL') {
      // Extract detailed error information from the receipt
      const errorDetails = extractErrorDetails(receipt);
      throw new TransactionError(`Fusion transaction failed: ${errorDetails}`);
    }

    log.success('Fusion transaction completed', {
      executionTime: formatDuration(executionTime),
    });

    return {
      hash: hash as `0x${string}`,
      success: true,
      supplyAmount,
      aTokensReceived: supplyAmount, // TODO: Calculate actual aTokens from receipt
      beforeBalance: {} as BalanceSnapshot, // Populated by caller
      afterBalance: {} as BalanceSnapshot,  // Populated by caller
    };

  } catch (error) {
    // Extract error details for logging
    let errorMessage = 'Unknown error';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      // Parse error object for details
      const detailedError = extractErrorDetails(error);
      errorMessage = detailedError || JSON.stringify(error);
    }
    
    throw new TransactionError(`Fusion execution failed: ${errorMessage}`);
  }
}

/**
 * Capture current token balances
 */
async function captureBalanceSnapshot(sdk: SDKContext): Promise<BalanceSnapshot> {
  const blockNumber = await sdk.provider.getBlockNumber();
  
  // Get USDC balance
  const usdcContract = new ethers.Contract(
    sdk.config.contracts.usdc,
    ERC20_ABI,
    sdk.provider
  );
  const usdcBalance = await usdcContract.balanceOf!(sdk.eoaAddress) as bigint;

  // Check aUSDC balance
  const aUsdcContract = new ethers.Contract(
    sdk.config.contracts.aUsdc,
    ERC20_ABI,
    sdk.provider
  );
  const aUsdcBalance = await aUsdcContract.balanceOf!(sdk.eoaAddress) as bigint;

  const tokens: TokenBalance[] = [
    {
      address: sdk.config.contracts.usdc,
      symbol: 'USDC',
      decimals: 6,
      balance: usdcBalance,
      formatted: ethers.formatUnits(usdcBalance, 6),
    },
    {
      address: sdk.config.contracts.aUsdc,
      symbol: 'aUSDC',
      decimals: 6,
      balance: aUsdcBalance,
      formatted: ethers.formatUnits(aUsdcBalance, 6),
    },
  ];

  return {
    timestamp: Date.now(),
    blockNumber,
    tokens,
  };
}

/**
 * Display balance snapshot in a simple format
 */
function displayBalanceSnapshot(title: string, snapshot: BalanceSnapshot): void {
  console.log(`\n${title}:`);
  console.log(`  Block: ${snapshot.blockNumber}`);
  console.log(`  Time: ${new Date(snapshot.timestamp).toLocaleTimeString()}`);
  
  snapshot.tokens.forEach(token => {
    console.log(`  ${token.symbol}: ${token.formatted} ${token.symbol}`);
  });
}

/**
 * Display balance changes between two snapshots
 */
function displayBalanceChanges(before: BalanceSnapshot, after: BalanceSnapshot): void {
  console.log(`\nBalance Changes:`);
  
  before.tokens.forEach(beforeToken => {
    const afterToken = after.tokens.find(t => t.symbol === beforeToken.symbol);
    if (!afterToken) return;

    const change = afterToken.balance - beforeToken.balance;
    const prefix = change >= 0n ? '+' : '';
    const changeFormatted = `${prefix}${ethers.formatUnits(change, beforeToken.decimals)}`;

    console.log(`  ${beforeToken.symbol}: ${changeFormatted} ${beforeToken.symbol}`);
  });
}

/**
 * Display comprehensive transaction summary
 */
function displayTransactionSummary(result: AaveSupplyResult): void {
  if (result.success) {
    log.success('Transaction Successful!', {
      supplyAmount: formatTokenAmount(result.supplyAmount, 6, 'USDC'),
      aTokensReceived: formatTokenAmount(result.aTokensReceived, 6, 'aUSDC'),
      transactionHash: result.hash,
    });

    console.log('\nKey Features Demonstrated:');
    console.log('  • External wallet with smart account features');
    console.log('  • Automatic USDC funding when balance is insufficient');
    console.log('  • Atomic approve + supply in one transaction');
    console.log('  • Gas fees paid in USDC (not ETH)');
    console.log('  • Comprehensive error handling');
    console.log('  • Full TypeScript type safety');

    log.success('AAVE Fusion Demo completed successfully!');
    log.info('Pro tip: The demo automatically funded your account with USDC when needed!');
  } else {
    log.error('Transaction Failed: The transaction was not successful. Check the logs above for details.');
  }
}

// Run demo if executed directly
if (require.main === module) {
  executeFusionAaveDemo()
    .then((result) => {
      log.info('Demo execution completed', {
        success: result.success,
        hash: result.hash,
      });
      process.exit(0);
    })
    .catch((error) => {
      log.error('Demo execution failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      process.exit(1);
    });
} 