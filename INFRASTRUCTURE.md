# Varity Infrastructure & Corporate Treasury Guide

**Last Updated:** December 11, 2025
**Status:** Beta Launch Ready
**Author:** Varity Engineering Team

---

## Executive Summary

This document outlines the infrastructure requirements, cost analysis, and corporate treasury strategy for operating the Varity Generic AI Dashboard platform. Understanding these economics is critical for:

1. **Beta Launch** - Minimize costs while validating product-market fit
2. **Mainnet Launch** - Plan for $5,000/month Conduit fee
3. **Corporate Treasury** - Hold required crypto tokens for DePin operations

---

## Table of Contents

1. [Infrastructure Overview](#infrastructure-overview)
2. [Beta Deployment (Railway + Vercel)](#beta-deployment-railway--vercel)
3. [Mainnet Deployment (Full DePin)](#mainnet-deployment-full-depin)
4. [LLM Cost Analysis](#llm-cost-analysis)
5. [Corporate Treasury Requirements](#corporate-treasury-requirements)
6. [Break-Even Analysis](#break-even-analysis)
7. [Token Acquisition Guide](#token-acquisition-guide)

---

## Infrastructure Overview

### Architecture Layers

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER LAYER                                     │
│                    Businesses accessing dashboards                       │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────────────────┐
│                         APPLICATION LAYER                                │
│  ┌─────────────────────────┐    ┌─────────────────────────┐            │
│  │   Frontend (Next.js)    │    │   Backend (FastAPI)     │            │
│  │   - Vercel (Beta)       │    │   - Railway (Beta)      │            │
│  │   - Akash (Mainnet)     │    │   - Akash (Mainnet)     │            │
│  └─────────────────────────┘    └─────────────────────────┘            │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────────────────┐
│                           DATA LAYER                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ PostgreSQL  │  │   Redis     │  │   Qdrant    │  │   Ollama    │    │
│  │  Database   │  │   Cache     │  │  Vector DB  │  │    LLM      │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────────────────┐
│                         BLOCKCHAIN LAYER                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Varity L3 (Arbitrum Orbit)                    │   │
│  │  - Testnet: Chain ID 33529 (FREE)                               │   │
│  │  - Mainnet: $5,000/month (Conduit)                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│                    ┌───────────────┴───────────────┐                    │
│                    ▼                               ▼                    │
│  ┌─────────────────────────┐    ┌─────────────────────────┐            │
│  │    Arbitrum One (L2)    │    │    Ethereum (L1)        │            │
│  │    Settlement Layer     │    │    Final Settlement     │            │
│  └─────────────────────────┘    └─────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────────────────┐
│                          STORAGE LAYER                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Filecoin/IPFS (Pinata)                        │   │
│  │  - Encrypted business data                                       │   │
│  │  - OAuth tokens                                                  │   │
│  │  - RAG knowledge base                                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Beta Deployment (Railway + Vercel)

### Why Railway + Vercel for Beta?

| Consideration | Railway + Vercel | Akash (Full DePin) |
|---------------|------------------|---------------------|
| **Setup Time** | 30 minutes | 2-4 hours |
| **Cost (10 customers)** | ~$50/month | ~$200/month |
| **Technical Complexity** | Low | Medium-High |
| **Decentralization** | Centralized | Decentralized |
| **Migration Effort** | Medium | None |

**Decision:** Use Railway + Vercel for beta to validate product quickly, migrate to Akash after proving demand.

### Beta Infrastructure Cost Breakdown

#### Fixed Costs (Shared Across All Customers)

| Service | Provider | Free Tier | Paid Tier | Notes |
|---------|----------|-----------|-----------|-------|
| Frontend Hosting | Vercel | 100GB bandwidth | $20/mo | Free tier sufficient for beta |
| Backend Hosting | Railway | $5 credit | $20/mo | Includes 8GB RAM |
| PostgreSQL | Railway | 1GB | Included | Managed, auto-backups |
| Redis | Railway | 25MB | Included | Managed |
| Filecoin Storage | Pinata | 1GB | $20/mo | 100GB storage |
| **Total Fixed** | | ~$0 | **~$60/month** | |

#### Variable Costs (Per Customer)

| Service | Cost Per Customer | Notes |
|---------|-------------------|-------|
| LLM API (1,000 queries) | $1-3/month | Together.ai or OpenAI |
| Storage (50GB/customer) | $0.50/month | Pinata overage |
| Blockchain Gas | $0.10/month | Testnet (free) |
| **Total Per Customer** | **~$2-4/month** | |

#### Scaling Projection (Beta)

| Customers | Fixed Cost | Variable Cost | Total Cost | Revenue ($99/ea) | Margin |
|-----------|------------|---------------|------------|------------------|--------|
| 5 | $60 | $15 | $75 | $495 | 85% |
| 10 | $60 | $30 | $90 | $990 | 91% |
| 25 | $60 | $75 | $135 | $2,475 | 95% |
| 50 | $100 | $150 | $250 | $4,950 | 95% |
| 100 | $150 | $300 | $450 | $9,900 | 95% |

---

## Mainnet Deployment (Full DePin)

### Mainnet Cost Breakdown

#### Conduit L3 Rollup Fee

| Item | Cost | Billing | Notes |
|------|------|---------|-------|
| **Varity L3 Mainnet** | **$5,000/month** | Monthly | Fixed Conduit fee |

This is the largest cost and must be covered before other expenses.

#### Akash Network Compute

| Service | Specs | Cost/Month | Notes |
|---------|-------|------------|-------|
| API Server | 4 vCPU, 8GB RAM | $60 | FastAPI backend |
| Worker Server | 2 vCPU, 4GB RAM | $30 | Background jobs |
| **GPU Instance** | 8 vCPU, 32GB RAM, RTX 4090 | **$150** | Llama 3.1 70B |
| Database | 4 vCPU, 16GB RAM | $50 | PostgreSQL |
| Redis | 2 vCPU, 4GB RAM | $20 | Cache |
| Qdrant | 2 vCPU, 8GB RAM | $30 | Vector DB |
| **Total Compute** | | **$340/month** | |

#### Filecoin Storage (Direct)

| Storage Tier | Size | Cost/Month | Notes |
|--------------|------|------------|-------|
| Platform Data | 100GB | $5 | Internal data |
| Customer Data | 50GB × customers | $0.05/GB | Encrypted |
| RAG Knowledge | 500GB | $25 | Industry docs |
| **Base Storage** | | **$30/month** | |
| **Per Customer** | 50GB | **$2.50/month** | |

#### Blockchain Operations

| Operation | Cost | Frequency | Monthly Est. |
|-----------|------|-----------|--------------|
| L3 Contract Calls | $0.001/tx | ~1,000/mo | $1 |
| L2 Settlement | $0.10/batch | ~100/mo | $10 |
| L1 Settlement | $5/finalization | ~10/mo | $50 |
| **Total Blockchain** | | | **~$60/month** |

#### Total Mainnet Cost

| Component | Cost/Month |
|-----------|------------|
| Conduit L3 Fee | $5,000 |
| Akash Compute | $340 |
| Filecoin Storage | $30 + $2.50/customer |
| Blockchain Ops | $60 |
| **Base Total** | **$5,430/month** |
| **Per Customer Add** | **~$5/customer** |

---

## LLM Cost Analysis

### Business Plan: 1,000 AI Queries/Month

#### Option 1: Cloud LLM APIs (Recommended for Beta)

| Provider | Model | Cost/1K Tokens | Est. Cost/Query | 1,000 Queries |
|----------|-------|----------------|-----------------|---------------|
| **Together.ai** | Llama 3.1 70B | $0.0009 | $0.001 | **$1.00** |
| OpenAI | GPT-3.5 Turbo | $0.002 | $0.002 | $2.00 |
| Anthropic | Claude 3 Haiku | $0.003 | $0.003 | $3.00 |
| OpenAI | GPT-4 Turbo | $0.030 | $0.030 | $30.00 |

**Recommendation:** Use Together.ai (Llama 3.1 70B) for beta - best quality/cost ratio.

#### Option 2: Self-Hosted on Akash (Recommended for Mainnet)

| Item | Cost/Month | Notes |
|------|------------|-------|
| GPU Instance (RTX 4090) | $150 | Runs Llama 3.1 70B |
| Per-Query Cost | $0 | Unlimited queries |

**Break-even Analysis:**
- Cloud API at $1/1,000 queries = $1/customer/month
- Akash GPU at $150/month
- Break-even at **150 customers** (150 × $1 = $150)

**For 100 customers:**
- Cloud API: $100/month
- Akash GPU: $150/month
- **Cloud wins until 150 customers**

**For 200 customers:**
- Cloud API: $200/month
- Akash GPU: $150/month
- **Akash wins after 150 customers**

---

## Corporate Treasury Requirements

### Why Varity Needs a Crypto Treasury

DePin infrastructure requires payment in native tokens:
- **Akash (AKT)** - Pay for compute hosting
- **Filecoin (FIL)** - Pay for decentralized storage
- **Arbitrum (ARB)** - Pay for L2/L3 gas
- **Ethereum (ETH)** - Pay for L1 settlement
- **USDC** - Bridge liquidity, operational expenses

### Beta Treasury (Immediate Need)

| Token | Amount | USD Value | Purpose |
|-------|--------|-----------|---------|
| USDC | 1,000 | $1,000 | Operational buffer |
| ARB | 50 | $50 | Testnet gas (buffer) |
| ETH | 0.02 | $50 | Emergency L1 |
| **Total** | | **$1,100** | |

### Mainnet Treasury (After Beta)

| Token | Amount | USD Value | Purpose | Runway |
|-------|--------|-----------|---------|--------|
| USDC | 15,000 | $15,000 | Conduit fees (3 mo) | 3 months |
| AKT | 500 | $1,000 | Akash compute | 3 months |
| FIL | 100 | $500 | Filecoin storage | 6 months |
| ARB | 500 | $500 | L2/L3 gas | 3 months |
| ETH | 0.2 | $500 | L1 settlement | 6 months |
| **Total** | | **$17,500** | | |

### Monthly Token Consumption (Mainnet, 100 customers)

| Token | Monthly Use | USD Value |
|-------|-------------|-----------|
| USDC (Conduit) | $5,000 | $5,000 |
| AKT | ~150 AKT | $300 |
| FIL | ~20 FIL | $100 |
| ARB | ~100 ARB | $100 |
| ETH | ~0.02 ETH | $50 |
| **Total Monthly** | | **$5,550** |

---

## Break-Even Analysis

### Beta Phase (Testnet)

| Metric | Value |
|--------|-------|
| Fixed Costs | $60/month |
| Variable Cost/Customer | $3/month |
| Revenue/Customer | $99/month |
| Contribution Margin | $96/customer |
| **Break-even** | **1 customer** |

### Mainnet Phase

| Metric | Value |
|--------|-------|
| Fixed Costs | $5,430/month |
| Variable Cost/Customer | $5/month |
| Revenue/Customer | $99/month |
| Contribution Margin | $94/customer |
| **Break-even** | **58 customers** |

### Customer Growth Scenarios

| Scenario | Customers | Monthly Revenue | Monthly Cost | Monthly Profit |
|----------|-----------|-----------------|--------------|----------------|
| **Beta Start** | 10 | $990 | $90 | $900 |
| **Beta Goal** | 50 | $4,950 | $250 | $4,700 |
| **Mainnet Launch** | 60 | $5,940 | $5,730 | $210 |
| **Growth** | 100 | $9,900 | $5,930 | $3,970 |
| **Scale** | 200 | $19,800 | $6,430 | $13,370 |
| **Target Y1** | 500 | $49,500 | $7,930 | $41,570 |

### Key Decision Points

1. **Launch Mainnet When:** 60+ committed paying customers
2. **Self-Host LLM When:** 150+ customers (Akash GPU more economical)
3. **Hire Support When:** 200+ customers (need dedicated support)
4. **Raise Prices When:** >90% capacity utilization

---

## Token Acquisition Guide

### Step 1: Create Exchange Accounts

| Exchange | Tokens Available | KYC Required | Notes |
|----------|------------------|--------------|-------|
| **Coinbase** | USDC, ETH, FIL, ARB | Yes | Easiest for US |
| **Kraken** | All + AKT | Yes | Best for AKT |
| **KuCoin** | All + AKT | Optional | No US restrictions |

### Step 2: Purchase Tokens

```
1. Buy USDC on Coinbase (primary operational currency)
2. Buy ETH on Coinbase (for gas on L1)
3. Buy ARB on Coinbase (for Arbitrum L2/L3 gas)
4. Buy FIL on Coinbase (for Filecoin storage)
5. Buy AKT on Kraken or KuCoin (for Akash compute)
```

### Step 3: Bridge to Required Networks

| Token | Source | Destination | Bridge |
|-------|--------|-------------|--------|
| USDC | Ethereum | Arbitrum One | Arbitrum Bridge |
| USDC | Arbitrum One | Varity L3 | Superbridge |
| ARB | Ethereum | Arbitrum One | Arbitrum Bridge |
| AKT | Akash | Akash (native) | No bridge needed |
| FIL | Filecoin | Filecoin (native) | No bridge needed |

### Step 4: Set Up Wallets

| Wallet | Purpose | Networks |
|--------|---------|----------|
| **Varity Admin Wallet** | L3 operations, gas | Varity L3, Arbitrum |
| **Akash Wallet** | Compute payments | Akash Network |
| **Filecoin Wallet** | Storage payments | Filecoin |
| **Treasury Wallet** | Reserve holdings | Multi-chain |

### Step 5: Automate Payments

- Set up recurring Akash deployment renewals
- Configure Pinata billing (accepts USDC or credit card)
- Monitor Conduit invoice (monthly $5,000)

---

## Risk Mitigation

### Price Volatility

| Risk | Mitigation |
|------|------------|
| AKT price spike | Hold 3-month reserve |
| FIL price spike | Use Filecoin+ grants |
| ETH gas spike | Use L2/L3 for most operations |

### Infrastructure Failure

| Risk | Mitigation |
|------|------------|
| Akash provider failure | Multi-provider deployment |
| Pinata outage | Backup to Lighthouse.storage |
| Railway outage | Docker images ready for Akash migration |

### Regulatory

| Risk | Mitigation |
|------|------------|
| Exchange restrictions | Multi-exchange accounts |
| Token classification | Legal consultation |
| Data sovereignty | Customer chooses storage region |

---

## Appendix: Token Information

### Akash (AKT)
- **Purpose:** Pay for decentralized compute on Akash Network
- **Current Price:** ~$2.00
- **Purchase:** Kraken, KuCoin, Osmosis DEX
- **Staking:** 15-20% APY (stake while holding reserve)

### Filecoin (FIL)
- **Purpose:** Pay for decentralized storage
- **Current Price:** ~$5.00
- **Purchase:** Coinbase, Kraken, Binance
- **Filecoin+:** Apply for free storage allocation

### Arbitrum (ARB)
- **Purpose:** Pay for L2 gas, governance
- **Current Price:** ~$1.00
- **Purchase:** Coinbase, Kraken, Uniswap
- **Note:** Also receive ARB airdrops for L2 activity

### Ethereum (ETH)
- **Purpose:** L1 settlement, ultimate security
- **Current Price:** ~$2,500
- **Purchase:** Any major exchange
- **Note:** Minimize L1 transactions, use L2/L3

### USDC
- **Purpose:** Stable value, operational expenses
- **Current Price:** $1.00 (pegged)
- **Purchase:** Coinbase, Circle
- **Note:** Primary treasury currency

---

## Summary

### Beta Launch Checklist

- [ ] Railway account created
- [ ] Vercel account created
- [ ] $1,000 USDC in operational wallet
- [ ] $50 ARB for testnet operations
- [ ] Together.ai API key for LLM
- [ ] Pinata account configured

### Mainnet Launch Checklist

- [ ] 60+ committed customers
- [ ] $17,500 treasury funded
- [ ] Akash deployment configured
- [ ] Filecoin storage contracts
- [ ] Conduit mainnet contract signed
- [ ] Multi-sig treasury wallet

---

**Document Version:** 1.0
**Last Updated:** December 11, 2025
