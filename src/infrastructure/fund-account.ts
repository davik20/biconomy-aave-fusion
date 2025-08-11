/**
 * @fileoverview Infrastructure utilities for funding test accounts
 */

import { ethers } from 'ethers';
import { log } from '../utils/logger';
import { withErrorHandling, InfrastructureError } from '../utils/errors';
import { ERC20_ABI } from '../utils/contracts';
import { formatTokenAmount } from '../utils/formatting';
import type { SDKContext } from '../types';

/**
 * Fund account with USDC to target amount using whale impersonation
 */
export const ensureSufficientUSDC = withErrorHandling(
  async (sdk: SDKContext, targetAmount: bigint = BigInt('100000000')): Promise<void> => {
    log.info('Ensuring sufficient USDC balance for demo execution...');
    
    // Check current balance
    const usdcContract = new ethers.Contract(
      sdk.config.contracts.usdc,
      ERC20_ABI,
      sdk.provider
    );
    
    const currentBalance = await usdcContract.balanceOf!(sdk.eoaAddress) as bigint;
    
    if (currentBalance >= targetAmount) {
      log.success('Sufficient USDC already available', {
        currentBalance: formatTokenAmount(currentBalance, 6, 'USDC'),
        targetAmount: formatTokenAmount(targetAmount, 6, 'USDC'),
      });
      return;
    }
    
    // Calculate funding needed
    const amountToFund = targetAmount - currentBalance;
    
    log.info('Funding needed', {
      currentBalance: formatTokenAmount(currentBalance, 6, 'USDC'),
      targetAmount: formatTokenAmount(targetAmount, 6, 'USDC'),
      amountToFund: formatTokenAmount(amountToFund, 6, 'USDC'),
    });
    
    await fundTestAccount(sdk, amountToFund);
    
    // Confirm funding success
    const newBalance = await usdcContract.balanceOf!(sdk.eoaAddress) as bigint;
    
    if (newBalance < targetAmount) {
      // Try one more time with the full target amount
      log.warn('First funding attempt insufficient, trying again...');
      await fundTestAccount(sdk, targetAmount);
      
      const finalBalance = await usdcContract.balanceOf!(sdk.eoaAddress) as bigint;
      
      if (finalBalance < targetAmount) {
        throw new InfrastructureError(
          `Failed to fund account sufficiently. Target: ${formatTokenAmount(targetAmount, 6, 'USDC')}, Got: ${formatTokenAmount(finalBalance, 6, 'USDC')}`
        );
      }
    }
    
    log.success('Account successfully funded!', {
      finalBalance: formatTokenAmount(newBalance, 6, 'USDC'),
    });
  },
  'USDC Balance Assurance'
);

/**
 * Fund a test account with USDC by impersonating a whale account
 */
export const fundTestAccount = withErrorHandling(
  async (sdk: SDKContext, amount: bigint = BigInt('100000000')): Promise<void> => {
    log.info('Starting automated USDC funding process...');
    
    // USDC whale addresses for funding
    const USDC_WHALES = [
      '0x55fe002aeff02f77364de339a1292923a15844b8', // Circle USDC Treasury
      '0x5414d89a8bf7e99d732bc52f3e6a3ef461c0c078', // Coinbase hot wallet
      '0xdfd5293d8e347dfe59e90efd55b2956a1343963d', // Binance hot wallet
      '0x28c6c06298d514db089934071355e5743bf21d60', // Binance 14
      '0x21a31ee1afc51d94c2efccaa2092ad1028285549', // Binance 15
    ];
    
    let USDC_WHALE = USDC_WHALES[0]; // Start with Circle Treasury
    
    log.info('Setting up whale account impersonation', {
      whale: USDC_WHALE,
      targetAccount: sdk.eoaAddress,
      amount: formatTokenAmount(amount, 6, 'USDC'),
    });

    try {
      // Connect to Anvil RPC for impersonation
      const anvilProvider = new ethers.JsonRpcProvider(sdk.config.anvilRpcUrl);
      
      // Create USDC contract instance for balance checking
      const usdcContract = new ethers.Contract(
        sdk.config.contracts.usdc,
        ERC20_ABI,
        anvilProvider
      );
      
      // Find whale with enough balance
      let whaleBalance: bigint = 0n;
      let whaleFound = false;
      
      for (const whale of USDC_WHALES) {
        try {
          const balance = await usdcContract.balanceOf!(whale) as bigint;
          log.info(`Checking whale balance`, {
            whale: whale,
            balance: formatTokenAmount(balance, 6, 'USDC'),
          });
          
          if (balance >= amount) {
            USDC_WHALE = whale;
            whaleBalance = balance;
            whaleFound = true;
            log.success('Suitable whale found!', {
              whale: USDC_WHALE,
              balance: formatTokenAmount(whaleBalance, 6, 'USDC'),
            });
            break;
          }
        } catch (error) {
          log.warn(`Failed to check whale ${whale}`, { error });
        }
      }
      
      if (!whaleFound) {
        throw new InfrastructureError(
          `No suitable USDC whale found with sufficient balance. Need: ${formatTokenAmount(amount, 6, 'USDC')}`
        );
      }
      
      // Impersonate whale account
      log.info('Enabling impersonation for selected whale...');
      await anvilProvider.send('anvil_impersonateAccount', [USDC_WHALE]);
      
      // Fund the whale account with ETH for gas fees
      log.info('Funding whale account with ETH for gas...');
      await anvilProvider.send('anvil_setBalance', [
        USDC_WHALE,
        ethers.toBeHex(ethers.parseEther('10')) // 10 ETH for gas
      ]);
      
      // Re-setup whale wallet with the selected whale
      const selectedWhaleWallet = await anvilProvider.getSigner(USDC_WHALE);
      const finalUsdcContract = new ethers.Contract(
        sdk.config.contracts.usdc,
        ERC20_ABI,
        selectedWhaleWallet
      );
      
      // Transfer USDC from whale to target account
      log.info('Transferring USDC to target account...');
      const transferTx = await finalUsdcContract.transfer!(sdk.eoaAddress, amount);
      
      log.info('USDC transfer transaction submitted', {
        hash: transferTx.hash,
        to: sdk.eoaAddress,
        amount: formatTokenAmount(amount, 6, 'USDC'),
      });
      
      // Wait for confirmation
      const receipt = await transferTx.wait();
      
      if (!receipt || receipt.status !== 1) {
        throw new InfrastructureError('USDC transfer transaction failed');
      }
      
      // Verify the transfer was successful
      const targetUsdcContract = new ethers.Contract(
        sdk.config.contracts.usdc,
        ERC20_ABI,
        sdk.provider
      );
      
      const newBalance = await targetUsdcContract.balanceOf!(sdk.eoaAddress) as bigint;
      
      // Disable impersonation (cleanup)
      await anvilProvider.send('anvil_stopImpersonatingAccount', [USDC_WHALE]);
      
      log.success('USDC funding completed successfully!', {
        targetAccount: sdk.eoaAddress,
        finalBalance: formatTokenAmount(newBalance, 6, 'USDC'),
        transactionHash: receipt.hash,
        gasUsed: receipt.gasUsed?.toString(),
      });
      
    } catch (error) {
      // Ensure impersonation is disabled even if there's an error
      try {
        const anvilProvider = new ethers.JsonRpcProvider(sdk.config.anvilRpcUrl);
        await anvilProvider.send('anvil_stopImpersonatingAccount', [USDC_WHALE]);
      } catch (cleanupError) {
        log.warn('Failed to cleanup impersonation', { error: cleanupError });
      }
      
      if (error instanceof Error) {
        if (error.message.includes('anvil_impersonateAccount')) {
          throw new InfrastructureError(
            'Anvil impersonation failed. Ensure Anvil is running with mainnet fork: npm run infra:anvil'
          );
        }
        throw new InfrastructureError(`USDC funding failed: ${error.message}`);
      }
      
      throw new InfrastructureError('USDC funding failed with unknown error');
    }
  },
  'USDC Account Funding'
); 