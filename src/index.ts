/**
 * @fileoverview Biconomy MEE Fusion - AAVE Integration
 * 
 * Main entry point for AAVE protocol integration using MEE Fusion.
 */

import { executeFusionAaveDemo } from './app/fusion-aave-demo';

/**
 * Main application entry point
 */
async function main(): Promise<void> {
  try {
    await executeFusionAaveDemo();
    process.exit(0);
  } catch (error) {
    console.error('Application failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Execute main function if this file is run directly
if (require.main === module) {
  main();
}

export { executeFusionAaveDemo };
export default main; 