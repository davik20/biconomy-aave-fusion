#!/bin/bash

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo ".env file not found. Please create one from env.example"
    exit 1
fi

# Check if RPC URL is configured
if [ -z "$ETH_MAINNET_RPC_URL" ] || [[ "$ETH_MAINNET_RPC_URL" == *"YOUR_API_KEY"* ]]; then
    echo "Please configure ETH_MAINNET_RPC_URL in your .env file"
    echo "   You need a reliable RPC provider (Alchemy, Infura, QuickNode, etc.)"
    exit 1
fi

echo "Starting Anvil - Forking Ethereum Mainnet"
echo "Fork URL: $ETH_MAINNET_RPC_URL"
echo "Local RPC: http://localhost:${ANVIL_PORT:-8545}"
echo "Chain ID: ${ANVIL_CHAIN_ID:-1}"
echo "Block Time: ${ANVIL_BLOCK_TIME:-12}s"
echo ""
echo "Default Test Accounts (10 ETH each):"
echo "----------------------------------------"

# Start Anvil with mainnet fork
anvil \
    --fork-url "$ETH_MAINNET_RPC_URL" \
    --port "${ANVIL_PORT:-8545}" \
    --chain-id "${ANVIL_CHAIN_ID:-1}" \
    --block-time "${ANVIL_BLOCK_TIME:-12}" \
    --accounts 10 \
    --balance 10000 \
    --mnemonic "test test test test test test test test test test test junk" 