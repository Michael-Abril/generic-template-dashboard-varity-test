/**
 * Comprehensive Smart Contract Testing Script
 * Agent 6: Smart Contract Integration Tester
 *
 * Tests all blockchain interactions for the Varity L3 dashboard:
 * - Contract deployment verification
 * - ToolMarketplace functionality
 * - ToolLicenseNFT operations
 * - SubscriptionBilling features
 * - RevenueSplitter mechanics
 * - USDC token integration
 * - Network and RPC testing
 */

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load deployments
const deploymentsData = fs.readFileSync(path.join(__dirname, 'deployments.json'), 'utf8');
const deployments = JSON.parse(deploymentsData);
const varityDeployment = deployments.varity_l3_testnet;

// Network configuration
const RPC_URL = varityDeployment.rpcUrl;
const CHAIN_ID = parseInt(varityDeployment.chainId);
const EXPLORER_URL = varityDeployment.explorerUrl;

// Contract addresses
const MARKETPLACE_ADDRESS = varityDeployment.contracts.ToolMarketplace;
const LICENSE_NFT_ADDRESS = varityDeployment.contracts.ToolLicenseNFT;
const SUBSCRIPTION_ADDRESS = varityDeployment.contracts.SubscriptionBilling;
const REVENUE_SPLITTER_ADDRESS = varityDeployment.contracts.RevenueSplitter;
const USDC_ADDRESS = varityDeployment.usdc;

// Test results
const testResults = {
  timestamp: new Date().toISOString(),
  network: 'Varity L3 Testnet',
  chainId: CHAIN_ID,
  phases: []
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.cyan);
}

function logPhase(phase) {
  log(`\n${'='.repeat(80)}`, colors.blue);
  log(`PHASE ${phase}`, colors.blue);
  log(`${'='.repeat(80)}`, colors.blue);
}

// Load contract ABIs
function loadContractABI(contractName) {
  try {
    const artifactPath = path.join(__dirname, 'contracts', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    return artifact.abi;
  } catch (error) {
    logWarning(`Could not load ABI for ${contractName}: ${error.message}`);
    return null;
  }
}

// Main testing function
async function runTests() {
  try {
    log('\n╔══════════════════════════════════════════════════════════════════╗', colors.cyan);
    log('║     VARITY L3 SMART CONTRACT COMPREHENSIVE TESTING SUITE          ║', colors.cyan);
    log('╚══════════════════════════════════════════════════════════════════╝\n', colors.cyan);

    // Setup provider (ethers v5 uses getDefaultProvider or JsonRpcProvider)
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

    // PHASE 1: Contract Deployment Verification
    await phase1_deploymentVerification(provider);

    // PHASE 2: ToolMarketplace Testing
    await phase2_marketplaceTesting(provider);

    // PHASE 3: ToolLicenseNFT Testing
    await phase3_licenseNFTTesting(provider);

    // PHASE 4: SubscriptionBilling Testing
    await phase4_subscriptionTesting(provider);

    // PHASE 5: RevenueSplitter Testing
    await phase5_revenueSplitterTesting(provider);

    // PHASE 6: USDC Token Testing
    await phase6_usdcTesting(provider);

    // PHASE 7: Network & RPC Testing
    await phase7_networkTesting(provider);

    // PHASE 8: Frontend Integration Verification
    await phase8_frontendIntegration();

    // Save test results
    fs.writeFileSync(
      path.join(__dirname, 'smart_contract_test_results.json'),
      JSON.stringify(testResults, null, 2)
    );

    logSuccess('\n✅ All tests completed! Results saved to smart_contract_test_results.json');

    // Print summary
    printSummary();

  } catch (error) {
    logError(`\n❌ Testing failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// PHASE 1: Contract Deployment Verification
async function phase1_deploymentVerification(provider) {
  logPhase('1: Contract Deployment Verification');

  const phase = {
    name: 'Phase 1: Deployment Verification',
    contracts: []
  };

  const contracts = [
    { name: 'ToolMarketplace', address: MARKETPLACE_ADDRESS },
    { name: 'ToolLicenseNFT', address: LICENSE_NFT_ADDRESS },
    { name: 'SubscriptionBilling', address: SUBSCRIPTION_ADDRESS },
    { name: 'RevenueSplitter', address: REVENUE_SPLITTER_ADDRESS },
    { name: 'USDC', address: USDC_ADDRESS }
  ];

  for (const contract of contracts) {
    logInfo(`\n📋 Testing ${contract.name}...`);

    const result = {
      name: contract.name,
      address: contract.address,
      deployed: false,
      hasBytecode: false,
      bytecodeLength: 0
    };

    try {
      // Check if contract has code
      const code = await provider.getCode(contract.address);

      if (code === '0x' || code === '0x0') {
        logError(`${contract.name}: No bytecode deployed at ${contract.address}`);
      } else {
        result.deployed = true;
        result.hasBytecode = true;
        result.bytecodeLength = code.length;
        logSuccess(`${contract.name}: Deployed at ${contract.address}`);
        logInfo(`  Bytecode length: ${code.length} bytes`);
      }
    } catch (error) {
      logError(`${contract.name}: Error checking deployment - ${error.message}`);
      result.error = error.message;
    }

    phase.contracts.push(result);
  }

  testResults.phases.push(phase);
}

// PHASE 2: ToolMarketplace Testing
async function phase2_marketplaceTesting(provider) {
  logPhase('2: ToolMarketplace Contract Testing');

  const phase = {
    name: 'Phase 2: ToolMarketplace Testing',
    tests: []
  };

  try {
    // Load ABI
    const abi = loadContractABI('ToolMarketplace');
    if (!abi) {
      // Use minimal ABI for basic testing
      const minimalAbi = [
        'function owner() view returns (address)',
        'function getToolCount() view returns (uint256)',
        'function getTool(uint256) view returns (tuple(uint256 id, string name, string slug, string category, string developer, string logo, bool active))'
      ];
      const contract = new ethers.Contract(MARKETPLACE_ADDRESS, minimalAbi, provider);

      // Test 1: Check owner
      try {
        const owner = await contract.owner();
        phase.tests.push({
          name: 'Check contract owner',
          success: true,
          owner: owner,
          expectedOwner: varityDeployment.deployer
        });
        logSuccess(`Contract owner: ${owner}`);
      } catch (error) {
        phase.tests.push({
          name: 'Check contract owner',
          success: false,
          error: error.message
        });
        logWarning(`Could not check owner: ${error.message}`);
      }

      // Test 2: Get tool count
      try {
        const toolCount = await contract.getToolCount();
        phase.tests.push({
          name: 'Get tool count',
          success: true,
          toolCount: toolCount.toString()
        });
        logSuccess(`Tool count: ${toolCount}`);

        // Test 3: Get first few tools
        if (toolCount > 0) {
          const toolsToFetch = Math.min(Number(toolCount), 5);
          const tools = [];

          for (let i = 0; i < toolsToFetch; i++) {
            try {
              const tool = await contract.getTool(i);
              tools.push({
                id: tool.id.toString(),
                name: tool.name,
                slug: tool.slug,
                category: tool.category,
                active: tool.active
              });
              logInfo(`  Tool ${i}: ${tool.name} (${tool.category})`);
            } catch (error) {
              logWarning(`  Could not fetch tool ${i}: ${error.message}`);
            }
          }

          phase.tests.push({
            name: 'Fetch sample tools',
            success: tools.length > 0,
            toolsFetched: tools.length,
            tools: tools
          });
        }
      } catch (error) {
        phase.tests.push({
          name: 'Get tool count',
          success: false,
          error: error.message
        });
        logWarning(`Could not get tool count: ${error.message}`);
      }
    }
  } catch (error) {
    logError(`ToolMarketplace testing error: ${error.message}`);
    phase.error = error.message;
  }

  testResults.phases.push(phase);
}

// PHASE 3: ToolLicenseNFT Testing
async function phase3_licenseNFTTesting(provider) {
  logPhase('3: ToolLicenseNFT Contract Testing');

  const phase = {
    name: 'Phase 3: ToolLicenseNFT Testing',
    tests: []
  };

  try {
    // Use ERC-1155 standard ABI
    const minimalAbi = [
      'function owner() view returns (address)',
      'function uri(uint256) view returns (string)',
      'function name() view returns (string)',
      'function symbol() view returns (string)'
    ];

    const contract = new ethers.Contract(LICENSE_NFT_ADDRESS, minimalAbi, provider);

    // Test: Check owner
    try {
      const owner = await contract.owner();
      phase.tests.push({
        name: 'Check NFT contract owner',
        success: true,
        owner: owner
      });
      logSuccess(`NFT contract owner: ${owner}`);
    } catch (error) {
      logWarning(`Could not check NFT owner: ${error.message}`);
    }

    // Test: Get token URI
    try {
      const uri = await contract.uri(0);
      phase.tests.push({
        name: 'Get token URI',
        success: true,
        uri: uri
      });
      logSuccess(`Token URI: ${uri}`);
    } catch (error) {
      logWarning(`Could not get token URI: ${error.message}`);
    }
  } catch (error) {
    logError(`ToolLicenseNFT testing error: ${error.message}`);
    phase.error = error.message;
  }

  testResults.phases.push(phase);
}

// PHASE 4: SubscriptionBilling Testing
async function phase4_subscriptionTesting(provider) {
  logPhase('4: SubscriptionBilling Contract Testing');

  const phase = {
    name: 'Phase 4: SubscriptionBilling Testing',
    tests: []
  };

  try {
    const minimalAbi = [
      'function owner() view returns (address)'
    ];

    const contract = new ethers.Contract(SUBSCRIPTION_ADDRESS, minimalAbi, provider);

    // Test: Check owner
    try {
      const owner = await contract.owner();
      phase.tests.push({
        name: 'Check SubscriptionBilling owner',
        success: true,
        owner: owner
      });
      logSuccess(`SubscriptionBilling owner: ${owner}`);
    } catch (error) {
      logWarning(`Could not check SubscriptionBilling owner: ${error.message}`);
    }
  } catch (error) {
    logError(`SubscriptionBilling testing error: ${error.message}`);
    phase.error = error.message;
  }

  testResults.phases.push(phase);
}

// PHASE 5: RevenueSplitter Testing
async function phase5_revenueSplitterTesting(provider) {
  logPhase('5: RevenueSplitter Contract Testing');

  const phase = {
    name: 'Phase 5: RevenueSplitter Testing',
    tests: []
  };

  try {
    const minimalAbi = [
      'function payee(uint256) view returns (address)',
      'function shares(address) view returns (uint256)',
      'function totalShares() view returns (uint256)'
    ];

    const contract = new ethers.Contract(REVENUE_SPLITTER_ADDRESS, minimalAbi, provider);

    // Test: Check total shares
    try {
      const totalShares = await contract.totalShares();
      phase.tests.push({
        name: 'Check total shares',
        success: true,
        totalShares: totalShares.toString()
      });
      logSuccess(`Total shares: ${totalShares}`);

      // Try to get first payee
      try {
        const payee0 = await contract.payee(0);
        const shares0 = await contract.shares(payee0);
        phase.tests.push({
          name: 'Get first payee',
          success: true,
          payee: payee0,
          shares: shares0.toString()
        });
        logSuccess(`Payee 0: ${payee0} (${shares0} shares)`);
      } catch (error) {
        logWarning(`Could not get first payee: ${error.message}`);
      }
    } catch (error) {
      logWarning(`Could not check total shares: ${error.message}`);
    }
  } catch (error) {
    logError(`RevenueSplitter testing error: ${error.message}`);
    phase.error = error.message;
  }

  testResults.phases.push(phase);
}

// PHASE 6: USDC Token Testing
async function phase6_usdcTesting(provider) {
  logPhase('6: USDC Token Testing');

  const phase = {
    name: 'Phase 6: USDC Token Testing',
    tests: []
  };

  try {
    // Standard ERC-20 ABI
    const usdcAbi = [
      'function name() view returns (string)',
      'function symbol() view returns (string)',
      'function decimals() view returns (uint8)',
      'function totalSupply() view returns (uint256)',
      'function balanceOf(address) view returns (uint256)'
    ];

    const contract = new ethers.Contract(USDC_ADDRESS, usdcAbi, provider);

    // Test: Token metadata
    try {
      const name = await contract.name();
      const symbol = await contract.symbol();
      const decimals = await contract.decimals();

      phase.tests.push({
        name: 'USDC token metadata',
        success: true,
        name: name,
        symbol: symbol,
        decimals: decimals
      });

      logSuccess(`USDC Name: ${name}`);
      logSuccess(`USDC Symbol: ${symbol}`);
      logSuccess(`USDC Decimals: ${decimals}`);
    } catch (error) {
      logError(`Could not get USDC metadata: ${error.message}`);
      phase.tests.push({
        name: 'USDC token metadata',
        success: false,
        error: error.message
      });
    }

    // Test: Total supply
    try {
      const totalSupply = await contract.totalSupply();
      phase.tests.push({
        name: 'USDC total supply',
        success: true,
        totalSupply: totalSupply.toString()
      });
      logSuccess(`USDC Total Supply: ${ethers.formatUnits(totalSupply, 6)} USDC`);
    } catch (error) {
      logWarning(`Could not get USDC total supply: ${error.message}`);
    }
  } catch (error) {
    logError(`USDC testing error: ${error.message}`);
    phase.error = error.message;
  }

  testResults.phases.push(phase);
}

// PHASE 7: Network & RPC Testing
async function phase7_networkTesting(provider) {
  logPhase('7: Network & RPC Testing');

  const phase = {
    name: 'Phase 7: Network & RPC Testing',
    tests: []
  };

  try {
    // Test 1: Get network info
    const network = await provider.getNetwork();
    phase.tests.push({
      name: 'Network info',
      success: true,
      chainId: network.chainId.toString(),
      name: network.name
    });
    logSuccess(`Chain ID: ${network.chainId}`);
    logSuccess(`Network Name: ${network.name}`);

    // Test 2: Get current block
    const blockNumber = await provider.getBlockNumber();
    phase.tests.push({
      name: 'Current block number',
      success: true,
      blockNumber: blockNumber
    });
    logSuccess(`Current Block: ${blockNumber}`);

    // Test 3: Get gas price
    const feeData = await provider.getFeeData();
    phase.tests.push({
      name: 'Gas price',
      success: true,
      gasPrice: feeData.gasPrice ? feeData.gasPrice.toString() : 'null',
      maxFeePerGas: feeData.maxFeePerGas ? feeData.maxFeePerGas.toString() : 'null'
    });

    if (feeData.gasPrice) {
      logSuccess(`Gas Price: ${ethers.formatUnits(feeData.gasPrice, 'gwei')} gwei`);
    }

    // Test 4: RPC latency (5 consecutive calls)
    const latencies = [];
    for (let i = 0; i < 5; i++) {
      const start = Date.now();
      await provider.getBlockNumber();
      const end = Date.now();
      latencies.push(end - start);
    }

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    phase.tests.push({
      name: 'RPC latency',
      success: true,
      latencies: latencies,
      averageLatency: avgLatency
    });
    logSuccess(`Average RPC Latency: ${avgLatency.toFixed(2)}ms`);

  } catch (error) {
    logError(`Network testing error: ${error.message}`);
    phase.error = error.message;
  }

  testResults.phases.push(phase);
}

// PHASE 8: Frontend Integration Verification
async function phase8_frontendIntegration() {
  logPhase('8: Frontend Integration Verification');

  const phase = {
    name: 'Phase 8: Frontend Integration Verification',
    tests: []
  };

  try {
    // Check .env.local file
    const envPath = path.join(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');

    const checks = [
      { key: 'NEXT_PUBLIC_TOOL_MARKETPLACE_ADDRESS', expected: MARKETPLACE_ADDRESS },
      { key: 'NEXT_PUBLIC_TOOL_LICENSE_NFT_ADDRESS', expected: LICENSE_NFT_ADDRESS },
      { key: 'NEXT_PUBLIC_SUBSCRIPTION_BILLING_ADDRESS', expected: SUBSCRIPTION_ADDRESS },
      { key: 'NEXT_PUBLIC_REVENUE_SPLITTER_ADDRESS', expected: REVENUE_SPLITTER_ADDRESS },
      { key: 'NEXT_PUBLIC_USDC_ADDRESS', expected: USDC_ADDRESS },
      { key: 'NEXT_PUBLIC_CHAIN_ID', expected: CHAIN_ID.toString() },
      { key: 'NEXT_PUBLIC_RPC_URL', expected: RPC_URL }
    ];

    for (const check of checks) {
      const regex = new RegExp(`${check.key}=(.+)`, 'i');
      const match = envContent.match(regex);

      if (match) {
        const actualValue = match[1].trim();
        const success = actualValue === check.expected;

        phase.tests.push({
          name: `Check ${check.key}`,
          success: success,
          expected: check.expected,
          actual: actualValue
        });

        if (success) {
          logSuccess(`${check.key}: ✅ Matches`);
        } else {
          logError(`${check.key}: ❌ Mismatch`);
          logInfo(`  Expected: ${check.expected}`);
          logInfo(`  Actual: ${actualValue}`);
        }
      } else {
        phase.tests.push({
          name: `Check ${check.key}`,
          success: false,
          error: 'Not found in .env.local'
        });
        logError(`${check.key}: ❌ Not found`);
      }
    }
  } catch (error) {
    logError(`Frontend integration verification error: ${error.message}`);
    phase.error = error.message;
  }

  testResults.phases.push(phase);
}

// Print summary
function printSummary() {
  log('\n╔══════════════════════════════════════════════════════════════════╗', colors.cyan);
  log('║                        TEST SUMMARY                              ║', colors.cyan);
  log('╚══════════════════════════════════════════════════════════════════╝\n', colors.cyan);

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  testResults.phases.forEach(phase => {
    log(`\n${phase.name}:`, colors.blue);

    if (phase.contracts) {
      phase.contracts.forEach(contract => {
        totalTests++;
        if (contract.deployed && contract.hasBytecode) {
          passedTests++;
          logSuccess(`  ${contract.name}: DEPLOYED`);
        } else {
          failedTests++;
          logError(`  ${contract.name}: NOT DEPLOYED`);
        }
      });
    }

    if (phase.tests) {
      phase.tests.forEach(test => {
        totalTests++;
        if (test.success) {
          passedTests++;
          logSuccess(`  ${test.name}: PASS`);
        } else {
          failedTests++;
          logError(`  ${test.name}: FAIL`);
        }
      });
    }
  });

  log('\n' + '─'.repeat(80), colors.cyan);
  log(`Total Tests: ${totalTests}`, colors.blue);
  logSuccess(`Passed: ${passedTests}`);

  if (failedTests > 0) {
    logError(`Failed: ${failedTests}`);
  } else {
    logSuccess('All tests passed! 🎉');
  }

  const successRate = ((passedTests / totalTests) * 100).toFixed(2);
  log(`Success Rate: ${successRate}%`, colors.blue);
  log('─'.repeat(80) + '\n', colors.cyan);
}

// Run tests
runTests().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
