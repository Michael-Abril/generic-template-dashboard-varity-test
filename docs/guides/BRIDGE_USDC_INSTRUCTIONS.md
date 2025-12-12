# BRIDGE USDC TO VARITY L3 - UPDATED INSTRUCTIONS

## IMPORTANT: Varity L3 Uses USDC as Gas Token (Not ETH)

Your Varity L3 testnet is configured to use **USDC (6 decimals)** as the native gas token instead of ETH. This is why Superbridge only shows USDC bridging options.

**USDC Contract on Varity L3**: `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`

---

## STEP 1: CHECK YOUR USDC BALANCE ON ARBITRUM SEPOLIA

First, let's verify you have USDC on Arbitrum Sepolia to bridge:

```bash
# Check deployer USDC balance on Arbitrum Sepolia
curl -X POST https://sepolia-rollup.arbitrum.io/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"eth_call",
    "params":[{
      "to":"0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
      "data":"0x70a0823100000000000000000000000020b7d1426649d9a573ba7fd10592456264220cbf"
    },"latest"],
    "id":1
  }'
```

**Deployer Address**: `0x20B7d1426649D9a573ba7Fd10592456264220cbf`

---

## STEP 2: BRIDGE USDC (If You Have It)

### Option A: You Have USDC on Arbitrum Sepolia ✅

**Bridge Instructions**:

1. **Open Superbridge**: https://varity-testnet-rroe52pwjp-86d3bf2e4517f78c.testnets.rollbridge.app/

2. **Connect Wallet**: `0x20B7d1426649D9a573ba7Fd10592456264220cbf`

3. **Bridge Settings**:
   - **Token**: USDC
   - **From**: Arbitrum Sepolia
   - **To**: Varity L3 Testnet
   - **Amount**: **100 USDC** (recommended for deployment + gas buffer)

4. **Confirm & Wait**: 10-15 minutes for bridge completion

5. **Verify Arrival**:
```bash
# Check USDC balance on Varity L3
curl -X POST https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"eth_call",
    "params":[{
      "to":"0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
      "data":"0x70a0823100000000000000000000000020b7d1426649d9a573ba7fd10592456264220cbf"
    },"latest"],
    "id":1
  }'
```

---

### Option B: You DON'T Have USDC on Arbitrum Sepolia ❌

**You need to get testnet USDC first:**

#### Method 1: Arbitrum Sepolia Faucet (Recommended)

1. **Visit Arbitrum Sepolia Faucet**: https://faucet.quicknode.com/arbitrum/sepolia

2. **Or use Circle's Testnet Faucet**: https://faucet.circle.com/

3. **Request USDC** to your deployer address: `0x20B7d1426649D9a573ba7Fd10592456264220cbf`

4. **Wait** for USDC to arrive (usually 1-5 minutes)

5. **Then proceed** with Bridge instructions (Option A above)

#### Method 2: Swap ETH for USDC on Arbitrum Sepolia

If faucets aren't working, you can swap your 0.179751 ETH for USDC:

1. **Visit Uniswap Testnet**: https://app.uniswap.org/

2. **Connect** to Arbitrum Sepolia network

3. **Swap**: ETH → USDC

4. **Amount**: Swap ~0.1 ETH to get ~100-150 USDC (depending on testnet rates)

5. **Then bridge** USDC to Varity L3

---

## STEP 3: DEPLOY CONTRACTS AFTER USDC ARRIVES

Once you have USDC on Varity L3:

```bash
cd /home/macoding/blokko-internal-os/varity/chains/arbitrum/deployments/testnet/testing/generic-company-dashboard

# Deploy all 4 contracts (will use USDC for gas)
./deploy_to_varity_l3.sh
```

**Important Notes**:
- ✅ Hardhat will automatically use USDC for gas fees (configured in hardhat.config.js)
- ✅ Deployment costs will be deducted from your USDC balance
- ✅ Expected cost: ~20-50 USDC for all 4 contract deployments

---

## WHY VARITY L3 USES USDC AS GAS TOKEN

**Advantages**:
1. **Stable Gas Costs**: No ETH price volatility
2. **Predictable Budgeting**: Business users can forecast costs accurately
3. **Direct Payment**: No need to swap to pay for transactions
4. **Better UX**: Users already hold USDC for payments

**This is a feature, not a bug!** 🎯

---

## ALTERNATIVE: DEPLOY ON ARBITRUM SEPOLIA (TEMPORARY)

If you can't get USDC right now, we have two options:

### Option 1: Keep Contracts on Arbitrum Sepolia for Now
- **Pro**: Contracts are already deployed and working
- **Pro**: No bridging needed
- **Con**: Backend expects Varity L3 (33529), contracts on Arbitrum Sepolia (421614)
- **Con**: Contradicts the vision of using Varity L3

**To use this option**, update backend `.env`:
```bash
# Change from Varity L3 to Arbitrum Sepolia
BLOCKCHAIN_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
VARITY_CHAIN_ID=421614
```

### Option 2: Wait and Get USDC
- **Pro**: Properly aligned with Varity L3 architecture
- **Pro**: Tests USDC-as-gas-token functionality
- **Pro**: Follows the approved plan
- **Con**: Requires waiting for USDC faucet/swap

---

## RECOMMENDED NEXT STEPS

**Short Term** (if you need to keep developing):
1. Update backend to use Arbitrum Sepolia temporarily
2. Continue with Agent 12 (Lit Protocol encryption)
3. Get USDC when convenient
4. Redeploy to Varity L3 later

**Long Term** (proper architecture):
1. Get 100 USDC on Arbitrum Sepolia (faucet or swap)
2. Bridge 100 USDC to Varity L3 via Superbridge
3. Deploy all contracts to Varity L3
4. Update frontend .env.local
5. Backend already configured correctly (no changes needed)

---

## QUESTIONS?

**Q: Why can't I use the 0.179751 ETH I have?**
A: Varity L3 doesn't accept ETH as gas token. Only USDC works.

**Q: Can I convert my ETH to USDC?**
A: Yes! Swap on Uniswap testnet (Arbitrum Sepolia), then bridge the USDC.

**Q: Is this normal for L3 rollups?**
A: Yes! Custom gas tokens are a feature of Arbitrum Orbit chains. Many use stablecoins for better UX.

**Q: What happens to my ETH?**
A: Keep it on Arbitrum Sepolia for other testing, or swap some to USDC.

---

**Status**: Waiting for you to obtain USDC and bridge to Varity L3 before deployment can proceed.
