# Varity Smart Contracts - Makefile
# Foundry deployment and management commands

# Include environment variables
-include .env

# ============================================================================
# CONFIGURATION
# ============================================================================

# Varity L3 Testnet Configuration
VARITY_RPC := https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz
VARITY_CHAIN_ID := 33529
VARITY_EXPLORER := https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz

# Forge standard arguments
FORGE_ARGS := --via-ir

# ============================================================================
# SETUP
# ============================================================================

.PHONY: install
install: ## Install Foundry dependencies
	@echo "Installing Foundry dependencies..."
	forge install foundry-rs/forge-std --no-commit
	@echo "Dependencies installed!"

.PHONY: update
update: ## Update Foundry dependencies
	forge update

.PHONY: clean
clean: ## Clean build artifacts
	forge clean
	rm -rf out cache

# ============================================================================
# BUILD
# ============================================================================

.PHONY: build
build: ## Compile contracts
	@echo "Compiling contracts..."
	forge build $(FORGE_ARGS)
	@echo "Build complete!"

.PHONY: build-size
build-size: ## Compile and show contract sizes
	forge build --sizes $(FORGE_ARGS)

# ============================================================================
# TEST
# ============================================================================

.PHONY: test
test: ## Run all tests
	forge test -vvv $(FORGE_ARGS)

.PHONY: test-gas
test-gas: ## Run tests with gas reporting
	forge test --gas-report $(FORGE_ARGS)

.PHONY: test-coverage
test-coverage: ## Run tests with coverage
	forge coverage $(FORGE_ARGS)

.PHONY: test-fuzz
test-fuzz: ## Run fuzz tests with more iterations
	forge test -vvv --fuzz-runs 1000 $(FORGE_ARGS)

# ============================================================================
# STATIC ANALYSIS
# ============================================================================

.PHONY: format
format: ## Format Solidity files
	forge fmt

.PHONY: lint
lint: ## Lint Solidity files
	forge fmt --check

.PHONY: slither
slither: ## Run Slither static analysis
	slither .

# ============================================================================
# LOCAL DEVELOPMENT
# ============================================================================

.PHONY: anvil
anvil: ## Start local Anvil node
	anvil --chain-id 31337

.PHONY: deploy-local
deploy-local: ## Deploy to local Anvil
	@echo "Deploying to local Anvil..."
	forge script script/Deploy.s.sol:DeployVarityDataCommitments \
		--rpc-url http://127.0.0.1:8545 \
		--private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
		--broadcast \
		$(FORGE_ARGS)

# ============================================================================
# VARITY L3 TESTNET DEPLOYMENT
# ============================================================================

.PHONY: deploy-varity
deploy-varity: ## Deploy to Varity L3 Testnet
	@echo "=========================================="
	@echo "Deploying to Varity L3 Testnet"
	@echo "Chain ID: $(VARITY_CHAIN_ID)"
	@echo "RPC: $(VARITY_RPC)"
	@echo "=========================================="
	@if [ -z "$(DEPLOYER_PRIVATE_KEY)" ]; then \
		echo "ERROR: DEPLOYER_PRIVATE_KEY not set"; \
		echo "Run: export DEPLOYER_PRIVATE_KEY=your_key"; \
		exit 1; \
	fi
	forge script script/Deploy.s.sol:DeployVarityDataCommitments \
		--rpc-url $(VARITY_RPC) \
		--private-key $(DEPLOYER_PRIVATE_KEY) \
		--broadcast \
		--slow \
		$(FORGE_ARGS)

.PHONY: deploy-varity-verify
deploy-varity-verify: ## Deploy to Varity L3 and verify
	@echo "Deploying and verifying on Varity L3..."
	forge script script/Deploy.s.sol:DeployVarityDataCommitments \
		--rpc-url $(VARITY_RPC) \
		--private-key $(DEPLOYER_PRIVATE_KEY) \
		--broadcast \
		--verify \
		--verifier blockscout \
		--verifier-url $(VARITY_EXPLORER)/api \
		--slow \
		$(FORGE_ARGS)

.PHONY: verify-varity
verify-varity: ## Verify already deployed contract on Varity L3
	@if [ -z "$(CONTRACT_ADDRESS)" ]; then \
		echo "ERROR: CONTRACT_ADDRESS not set"; \
		echo "Run: make verify-varity CONTRACT_ADDRESS=0x..."; \
		exit 1; \
	fi
	forge verify-contract \
		$(CONTRACT_ADDRESS) \
		VarityDataCommitments \
		--chain-id $(VARITY_CHAIN_ID) \
		--verifier blockscout \
		--verifier-url $(VARITY_EXPLORER)/api \
		$(FORGE_ARGS)

# ============================================================================
# POST-DEPLOYMENT
# ============================================================================

.PHONY: test-commitment
test-commitment: ## Test commitment on deployed contract
	@if [ -z "$(CONTRACT_ADDRESS)" ]; then \
		echo "ERROR: CONTRACT_ADDRESS not set"; \
		exit 1; \
	fi
	forge script script/Deploy.s.sol:TestCommitment \
		--rpc-url $(VARITY_RPC) \
		--private-key $(DEPLOYER_PRIVATE_KEY) \
		--broadcast \
		--sig "run(address)" \
		$(CONTRACT_ADDRESS) \
		$(FORGE_ARGS)

.PHONY: verify-deployment
verify-deployment: ## Verify contract exists at address
	@if [ -z "$(CONTRACT_ADDRESS)" ]; then \
		echo "ERROR: CONTRACT_ADDRESS not set"; \
		exit 1; \
	fi
	forge script script/Deploy.s.sol:VerifyDeployment \
		--rpc-url $(VARITY_RPC) \
		--sig "run(address)" \
		$(CONTRACT_ADDRESS) \
		$(FORGE_ARGS)

# ============================================================================
# ABI EXPORT
# ============================================================================

.PHONY: abi
abi: build ## Export ABI to backend
	@echo "Exporting ABI..."
	@mkdir -p ../app/contracts/abis
	@cat out/VarityDataCommitments.sol/VarityDataCommitments.json | \
		jq '{abi: .abi}' > ../app/contracts/abis/VarityDataCommitments.json
	@echo "ABI exported to ../app/contracts/abis/VarityDataCommitments.json"

# ============================================================================
# UTILITIES
# ============================================================================

.PHONY: network-info
network-info: ## Display Varity L3 network info
	@echo "=========================================="
	@echo "Varity L3 Testnet Configuration"
	@echo "=========================================="
	@echo "Chain ID:     $(VARITY_CHAIN_ID)"
	@echo "RPC URL:      $(VARITY_RPC)"
	@echo "Explorer:     $(VARITY_EXPLORER)"
	@echo "Native Token: USDC (0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d)"
	@echo "DA Layer:     AnyTrust"
	@echo "Framework:    Arbitrum Stack via Conduit"
	@echo "=========================================="

.PHONY: balance
balance: ## Check deployer balance on Varity L3
	@echo "Checking balance on Varity L3..."
	cast balance --rpc-url $(VARITY_RPC) $(shell cast wallet address --private-key $(DEPLOYER_PRIVATE_KEY))

.PHONY: help
help: ## Show this help
	@echo "Varity Smart Contracts - Available Commands"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-25s\033[0m %s\n", $$1, $$2}'

# Default target
.DEFAULT_GOAL := help
