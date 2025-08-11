# Biconomy MEE Fusion - AAVE Protocol Integration

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue.svg)](https://www.typescriptlang.org/)
[![Biconomy](https://img.shields.io/badge/Biconomy-MEE%20v2.0-green.svg)](https://biconomy.io)

AAVE protocol integration using Biconomy's MEE Fusion for atomic transactions on Ethereum mainnet fork.

**Features:**
- Atomic AAVE approve + supply operations
- Gas fees paid in USDC 
- Smart account with external wallet support
- Automated USDC funding via whale accounts
- Mainnet fork testing environment

## Technology Overview

### MEE Fusion

MEE Fusion enables atomic execution of multiple blockchain operations in a single transaction.

**Core Features:**
- Atomic operations - multiple actions execute together or fail together
- Gas abstraction - pay fees in any supported token (USDC, USDT, etc.)
- Smart account integration - works with external wallets
- Protocol composability - combine multiple DeFi operations

**Benefits:**
- Simplified multi-step DeFi operations
- Reduced gas costs through batching
- Eliminates partial failure states
- Improved user experience

## Project Architecture

```
src/
├── index.ts         # Main application entry point 
├── types/           # TypeScript interfaces and type definitions
│   └── index.ts     # Core types (SDKContext, AaveSupplyResult, etc.)
├── utils/           # Utility functions and helpers
│   ├── config.ts    # Environment configuration management
│   ├── contracts.ts # Smart contract ABIs and addresses
│   ├── errors.ts    # Error handling and custom error types
│   ├── formatting.ts# Token formatting and display utilities
│   ├── logger.ts    # Structured logging system
│   └── validation.ts# Input validation functions
├── sdk/             # Core SDK initialization and management
│   └── init-sdk.ts  # Biconomy SDK setup with MEE client
├── infrastructure/ # Network management and funding
│   ├── fund-account.ts # Automatic USDC funding system
│   └── index.ts     # Infrastructure utilities
└── app/             # Main application implementation
    ├── fusion-aave-demo.ts # Core AAVE Fusion implementation
    └── index.ts     # App module exports
```

### Implementation

- **Fusion Operations** - Atomic AAVE approve + supply on mainnet fork
- **Smart Accounts** - External wallet with account abstraction
- **Gas Abstraction** - Pay fees in USDC instead of ETH
- **Auto-Funding** - Automated USDC funding using whale accounts
- **Mainnet Fork** - Complete Ethereum state via Anvil
- **TypeScript** - Full type safety and error handling

## Quick Start

### Prerequisites

#### System Requirements
- **Node.js** ≥ 18.0.0 ([Download](https://nodejs.org/))
- **npm** ≥ 8.0.0 (included with Node.js)
- **Docker** & **Docker Compose** ([Download](https://docker.com/))
- **Git** ([Download](https://git-scm.com/))

#### Required Services
- **Reliable RPC Provider** - Choose one:
  - [Alchemy](https://alchemy.com/)
  - [Infura](https://infura.io/)
  - [QuickNode](https://quicknode.com/)
  - [Ankr](https://ankr.com/)

> **Critical**: Free public RPCs will fail due to rate limits. A paid/private RPC is **required**.

### Installation

```bash
# Clone and install
git clone 
cd biconomy-mee-fusion-demo
npm install
npm run typecheck
```

### Environment Configuration

```bash
# Copy environment template
cp env.example .env
nano .env
```

**Required Environment Variables:**
```env
# Ethereum Mainnet RPC URL (REQUIRED)
ETH_MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# Test Account Private Key (REQUIRED)
TEST_PRIVATE_KEY=

# Optional Configuration (will use defaults)
MEE_NODE_URL=http://localhost:3000/v3
ANVIL_RPC_URL=http://localhost:8545
ANVIL_PORT=8545
ANVIL_CHAIN_ID=1
ANVIL_BLOCK_TIME=12
LOG_LEVEL=info  # Options: debug, info, warn, error
```

### Infrastructure Setup

**Start Anvil mainnet fork:**
```bash
npm run infra:anvil
```

**Start MEE Node:**
```bash
npm run infra:mee
```

**Verify setup:**
```bash
npm run infra:status
```

**Expected Output:**
```
Anvil is running on port 8545
MEE Node is running on port 3000
```

### Stopping Infrastructure

When you're done developing, you can stop the services:

```bash
# Stop all services at once 
npm run infra:stop:all

# Or stop services individually
npm run infra:stop:mee     # Stop MEE Node containers
npm run infra:stop:anvil   # Stop Anvil blockchain fork
```

### Running the Application

```bash
npm start
```

## AAVE Protocol Integration

**Operations:**
- Supply USDC to AAVE lending pool
- Receive aUSDC tokens atomically
- Pay gas fees in USDC
- Smart account integration with external wallet

### Technical Implementation

```typescript
// Build atomic approve + supply instructions
const instructions = [
  await orchestrator.buildComposable({
    type: 'default',
    data: {
      abi: ERC20_ABI,
      to: USDC_ADDRESS,
      functionName: 'approve',
      args: [AAVE_POOL, supplyAmount]
    }
  }),
  await orchestrator.buildComposable({
    type: 'default', 
    data: {
      abi: AAVE_POOL_ABI,
      to: AAVE_POOL,
      functionName: 'supply',
      args: [USDC_ADDRESS, supplyAmount, userAddress, 0]
    }
  })
];

// Execute atomically with Fusion
const quote = await meeClient.getFusionQuote({
  instructions,
  trigger: { chainId: 1, tokenAddress: USDC_ADDRESS, amount },
  feeToken: { address: USDC_ADDRESS, chainId: 1 }
});

const { hash } = await meeClient.executeFusionQuote({ fusionQuote: quote });
```

### Example Output

```
AAVE Fusion Supertransaction Demo
=================================

SDK initialized successfully
Account automatically funded with 100 USDC
Fusion transaction completed (38s)

Final Results:
  Supply Amount: 50.0000 USDC
  aTokens Received: 49.9999 aUSDC
  Gas Fees: 19.6 USDC

Transaction completed successfully
```

## Architecture

**Core Implementation**: `src/app/fusion-aave-demo.ts`

```typescript
// Build atomic instructions
const instructions = [
  // Token approval
  await orchestrator.buildComposable({
    type: 'default',
    data: { abi: ERC20_ABI, to: USDC_ADDRESS, functionName: 'approve' }
  }),
  // AAVE supply operation  
  await orchestrator.buildComposable({
    type: 'default',
    data: { abi: AAVE_POOL_ABI, to: AAVE_POOL, functionName: 'supply' }
  })
];
```

**Infrastructure:**
- Anvil mainnet fork with complete contract state
- MEE Node for Fusion transaction processing
- Automated USDC funding via whale accounts
- TypeScript with comprehensive error handling

## Development Commands

### Setup
```bash
npm run setup    # Copy environment template and setup .env
```

### Infrastructure Management
```bash
npm run infra:status    # Check service status
npm run infra:anvil     # Start Anvil mainnet fork
npm run infra:mee       # Start MEE Node

# Stop services
npm run infra:stop:all     # Stop all services
npm run infra:stop:anvil   # Stop Anvil
npm run infra:stop:mee     # Stop MEE Node
```

### Application Execution
```bash
npm start               # Run AAVE integration
```

### Development Tools
```bash
npm run build           # Build TypeScript
npm run typecheck       # Type checking
```

### Infrastructure Health Checks
```bash
npm run infra:check:anvil    # Check Anvil status
npm run infra:check:mee      # Check MEE Node status
```

## Contract Addresses

**USDC Token**: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`  
**AAVE v3 Pool**: `0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2`  
**aUSDC Token**: `0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c`

## Troubleshooting

### Common Issues and Solutions

#### "ETH_MAINNET_RPC_URL is required"
Environment not configured properly.

```bash
# Check .env file exists
ls -la .env

# Verify RPC URL format  
cat .env | grep ETH_MAINNET_RPC_URL
```

#### "Anvil is not running"
Blockchain fork failed to start.

```bash
# Check port availability
lsof -i :8545

# Restart Anvil
npm run infra:stop:anvil
npm run infra:anvil
```

#### "MEE Node is not responding"
**Problem**: MEE Node container issues

**Solution**:
```bash
# 1. Check containers
docker compose ps

# 2. View logs
docker compose logs node

# 3. Restart MEE Node
npm run infra:stop:mee
npm run infra:mee
```

#### "Insufficient USDC balance"
**Problem**: Account needs funding

**Solution**:
The application includes **automatic funding**! If you see this error:

1. **Check if funding is working**:
   ```bash
   npm start
   # The application will automatically fund your account
   ```

2. **Alternative**: Use a different account with existing USDC by updating `TEST_PRIVATE_KEY` in `.env`

### Getting Help

1. **Check Logs**: All components provide detailed logging
   ```bash
   # Enable debug logging
   LOG_LEVEL=debug npm start
   
   # View infrastructure logs
   docker compose logs -f
   ```

2. **Health Checks**: Use built-in diagnostics
   ```bash
   npm run infra:status
   ```

3. **Community Support**: 
   - [Biconomy Documentation](https://docs.biconomy.io/)
   - [Discord Community](https://discord.gg/biconomy)
   - [GitHub Issues](https://github.com/bcnmy/abstractjs/issues)

## 🎓 Technical Highlights

### Advanced Error Handling
```typescript
export const executeFusionAaveDemo = withErrorHandling(
  async (): Promise<AaveSupplyResult> => {
    // Implementation with automatic error context
  },
  'AAVE Fusion Demo' // Error context for debugging
);
```

### Type-Safe Configuration
```typescript
interface BiconomyConfig {
  readonly meeNodeUrl: string;
  readonly anvilRpcUrl: string;
  readonly chainId: number;
  readonly testPrivateKey: string;
  readonly contracts: ContractAddresses;
}

// Validated at runtime with detailed error messages
const config = createConfig(); // Throws on invalid configuration
```

### Automatic Balance Management
```typescript
// Ensures minimum USDC balance for demo execution
const targetUSDCAmount = BigInt('100000000'); // 100 USDC
await ensureSufficientUSDC(sdk, targetUSDCAmount);
```

### Comprehensive Logging System
```typescript
log.box('Transaction Successful!', [
  `Supply Amount: ${formatTokenAmount(result.supplyAmount, 6, 'USDC')}`,
  `aTokens Received: ${formatTokenAmount(result.aTokensReceived, 6, 'aUSDC')}`,
  // ... more details
], 'green');
```

## Project Capabilities

This implementation demonstrates several advanced blockchain development concepts:

**Infrastructure Management**: Complete local blockchain environment with MEE Node integration  
**DeFi Protocol Integration**: Real AAVE lending protocol operations with atomic execution  
**Account Abstraction**: Smart account features with external wallet support  
**Gas Optimization**: USDC-denominated fees eliminating ETH dependency  
**Developer Experience**: Automated setup, funding, and comprehensive error handling

### Technical Highlights:
- **Production Architecture** - Scalable, maintainable codebase with TypeScript
- **Automated Infrastructure** - Docker-based MEE Node with Anvil blockchain fork
- **Intelligent Funding** - Automatic USDC balance management for seamless operation
- **Type Safety** - Comprehensive type definitions for all operations
- **Error Resilience** - Robust error handling with detailed diagnostics
- **MEE Fusion Integration** - Real-world demonstration of atomic DeFi operations

## Use Cases & Applications

This project serves as a foundation for developers building:

1. **DeFi Applications** - Atomic operations across lending, trading, and yield protocols
2. **Gasless dApps** - Applications where users pay fees in preferred tokens
3. **Account Abstraction** - Smart wallets with advanced features and external wallet integration
4. **Protocol Composability** - Applications that combine multiple DeFi protocols atomically
5. **Developer Tools** - Infrastructure for blockchain application development and testing


