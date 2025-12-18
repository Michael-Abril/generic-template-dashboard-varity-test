#!/usr/bin/env python3
"""
Varity L3 Network Configuration Validator

This script performs comprehensive validation of the Varity L3 testnet configuration:
1. RPC endpoint connectivity and performance (100 test requests)
2. Chain ID verification across all configuration files
3. USDC contract validation (6 decimals)
4. Block explorer functionality
5. Load testing (100 concurrent requests)
6. Response time analysis

Target Score: 100/100
Author: Network Configuration Expert
Date: 2025-11-20
"""

import asyncio
import json
import time
import statistics
from typing import Dict, List, Tuple
from pathlib import Path
from web3 import Web3
from web3.middleware import geth_poa_middleware
import aiohttp
from concurrent.futures import ThreadPoolExecutor
import sys

# Add backend to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

# Configuration
VARITY_L3_CONFIG = {
    "chain_id": 33529,
    "rpc_url": "https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz",
    "explorer_url": "https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz",
    "usdc_address": "0x6Fd8ee6B4C2193e9E2e0E2EC5D295689B607c0cE",
    "usdc_decimals": 6,
}

# Test thresholds
RESPONSE_TIME_THRESHOLD_MS = 500  # 500ms max average
SUCCESS_RATE_THRESHOLD = 95  # 95% minimum success rate
LOAD_TEST_CONCURRENT = 100  # 100 concurrent requests

# ERC-20 ABI for USDC testing
ERC20_ABI = [
    {
        "constant": True,
        "inputs": [],
        "name": "decimals",
        "outputs": [{"name": "", "type": "uint8"}],
        "type": "function",
    },
    {
        "constant": True,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function",
    },
    {
        "constant": True,
        "inputs": [],
        "name": "symbol",
        "outputs": [{"name": "", "type": "string"}],
        "type": "function",
    },
    {
        "constant": True,
        "inputs": [],
        "name": "name",
        "outputs": [{"name": "", "type": "string"}],
        "type": "function",
    },
]


class Colors:
    """ANSI color codes for terminal output"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'


def print_header(text: str):
    """Print formatted header"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'=' * 80}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text.center(80)}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'=' * 80}{Colors.END}\n")


def print_success(text: str):
    """Print success message"""
    print(f"{Colors.GREEN}✓ {text}{Colors.END}")


def print_error(text: str):
    """Print error message"""
    print(f"{Colors.RED}✗ {text}{Colors.END}")


def print_warning(text: str):
    """Print warning message"""
    print(f"{Colors.YELLOW}⚠ {text}{Colors.END}")


def print_info(text: str):
    """Print info message"""
    print(f"{Colors.BLUE}ℹ {text}{Colors.END}")


class VarityL3Validator:
    """Main validator class for Varity L3 network configuration"""

    def __init__(self):
        self.w3 = Web3(Web3.HTTPProvider(VARITY_L3_CONFIG["rpc_url"]))
        # Add PoA middleware for Arbitrum chains
        self.w3.middleware_onion.inject(geth_poa_middleware, layer=0)
        self.results = {
            "rpc_connectivity": False,
            "chain_id": False,
            "usdc_contract": False,
            "block_explorer": False,
            "load_test": False,
            "response_times": [],
            "errors": [],
        }

    async def validate_rpc_endpoint(self) -> Dict:
        """Test RPC endpoint with 100 requests and measure performance"""
        print_header("TASK 1: RPC Endpoint Validation (100 Requests)")

        response_times = []
        successful_requests = 0
        failed_requests = 0

        print_info("Testing RPC endpoint connectivity...")

        # Test different RPC methods
        test_methods = [
            ("eth_blockNumber", []),
            ("eth_chainId", []),
            ("eth_gasPrice", []),
            ("net_version", []),
        ]

        for i in range(100):
            method_name, params = test_methods[i % len(test_methods)]

            start_time = time.time()
            try:
                result = self.w3.provider.make_request(method_name, params)
                end_time = time.time()
                response_time = (end_time - start_time) * 1000  # Convert to ms

                if "result" in result:
                    response_times.append(response_time)
                    successful_requests += 1
                else:
                    failed_requests += 1
                    self.results["errors"].append(f"Request {i+1}: {result.get('error', 'Unknown error')}")

                # Progress indicator
                if (i + 1) % 20 == 0:
                    print_info(f"Progress: {i+1}/100 requests completed...")

            except Exception as e:
                failed_requests += 1
                self.results["errors"].append(f"Request {i+1}: {str(e)}")

        # Calculate statistics
        success_rate = (successful_requests / 100) * 100
        avg_response_time = statistics.mean(response_times) if response_times else 0
        median_response_time = statistics.median(response_times) if response_times else 0
        min_response_time = min(response_times) if response_times else 0
        max_response_time = max(response_times) if response_times else 0

        self.results["response_times"] = response_times

        # Print results
        print(f"\n{Colors.BOLD}RPC Endpoint Test Results:{Colors.END}")
        print(f"  Total Requests: 100")
        print(f"  Successful: {successful_requests}")
        print(f"  Failed: {failed_requests}")
        print(f"  Success Rate: {success_rate:.1f}%")
        print(f"\n{Colors.BOLD}Response Time Statistics:{Colors.END}")
        print(f"  Average: {avg_response_time:.2f}ms")
        print(f"  Median: {median_response_time:.2f}ms")
        print(f"  Min: {min_response_time:.2f}ms")
        print(f"  Max: {max_response_time:.2f}ms")

        # Validation
        if success_rate >= SUCCESS_RATE_THRESHOLD:
            print_success(f"Success rate {success_rate:.1f}% meets threshold ({SUCCESS_RATE_THRESHOLD}%)")
        else:
            print_error(f"Success rate {success_rate:.1f}% below threshold ({SUCCESS_RATE_THRESHOLD}%)")

        if avg_response_time <= RESPONSE_TIME_THRESHOLD_MS:
            print_success(f"Average response time {avg_response_time:.2f}ms meets threshold ({RESPONSE_TIME_THRESHOLD_MS}ms)")
            self.results["rpc_connectivity"] = True
        else:
            print_warning(f"Average response time {avg_response_time:.2f}ms exceeds threshold ({RESPONSE_TIME_THRESHOLD_MS}ms)")

        return {
            "success_rate": success_rate,
            "avg_response_time": avg_response_time,
            "response_times": response_times,
        }

    def verify_chain_id(self) -> bool:
        """Verify chain ID across all configuration files"""
        print_header("TASK 2: Chain ID Verification Across Configuration Files")

        files_to_check = {
            "varity-chain.ts": Path(__file__).parent.parent / "src/lib/varity-chain.ts",
            "testnet_addresses.py": Path(__file__).parent.parent / "backend/app/core/testnet_addresses.py",
            ".env": Path(__file__).parent.parent / ".env",
            "hardhat.config.ts": Path(__file__).parent.parent / "contracts/hardhat.config.ts",
        }

        all_correct = True
        expected_chain_id = VARITY_L3_CONFIG["chain_id"]

        for filename, filepath in files_to_check.items():
            if not filepath.exists():
                print_warning(f"{filename}: File not found at {filepath}")
                continue

            content = filepath.read_text()

            # Check for chain ID
            if str(expected_chain_id) in content:
                print_success(f"{filename}: Contains chain ID {expected_chain_id}")
            else:
                print_error(f"{filename}: Chain ID {expected_chain_id} not found")
                all_correct = False

            # Check for incorrect chain IDs (Arbitrum Sepolia = 421614)
            if "421614" in content:
                print_warning(f"{filename}: Contains legacy Arbitrum Sepolia chain ID (421614)")
                all_correct = False

        # Verify via RPC
        try:
            chain_id = self.w3.eth.chain_id
            if chain_id == expected_chain_id:
                print_success(f"RPC confirms chain ID: {chain_id}")
            else:
                print_error(f"RPC returns chain ID {chain_id}, expected {expected_chain_id}")
                all_correct = False
        except Exception as e:
            print_error(f"Failed to verify chain ID via RPC: {str(e)}")
            all_correct = False

        self.results["chain_id"] = all_correct
        return all_correct

    def test_usdc_contract(self) -> bool:
        """Test USDC contract and verify 6 decimals"""
        print_header("TASK 3: USDC Contract Validation")

        usdc_address = VARITY_L3_CONFIG["usdc_address"]
        expected_decimals = VARITY_L3_CONFIG["usdc_decimals"]

        print_info(f"Testing USDC contract at: {usdc_address}")

        try:
            # Create contract instance
            usdc_contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(usdc_address),
                abi=ERC20_ABI
            )

            # Test decimals()
            decimals = usdc_contract.functions.decimals().call()
            print(f"  Decimals: {decimals}")

            if decimals == expected_decimals:
                print_success(f"USDC decimals correct: {decimals} (expected {expected_decimals})")
            else:
                print_error(f"USDC decimals incorrect: {decimals} (expected {expected_decimals})")
                return False

            # Test symbol()
            try:
                symbol = usdc_contract.functions.symbol().call()
                print(f"  Symbol: {symbol}")
                print_success(f"USDC symbol retrieved: {symbol}")
            except Exception as e:
                print_warning(f"Could not retrieve symbol: {str(e)}")

            # Test name()
            try:
                name = usdc_contract.functions.name().call()
                print(f"  Name: {name}")
                print_success(f"USDC name retrieved: {name}")
            except Exception as e:
                print_warning(f"Could not retrieve name: {str(e)}")

            # Test balanceOf() with zero address
            try:
                balance = usdc_contract.functions.balanceOf("0x0000000000000000000000000000000000000000").call()
                print(f"  Zero address balance: {balance}")
                print_success("balanceOf() function working")
            except Exception as e:
                print_warning(f"Could not test balanceOf: {str(e)}")

            # Check code exists at address
            code = self.w3.eth.get_code(Web3.to_checksum_address(usdc_address))
            if code and len(code) > 2:  # More than just '0x'
                print_success(f"Contract code exists at address (size: {len(code)} bytes)")
            else:
                print_error("No contract code found at address")
                return False

            # Search codebase for hardcoded "18" that should be "6"
            print_info("\nSearching codebase for hardcoded decimal issues...")
            self._check_decimal_hardcoding()

            self.results["usdc_contract"] = True
            return True

        except Exception as e:
            print_error(f"USDC contract test failed: {str(e)}")
            self.results["errors"].append(f"USDC contract error: {str(e)}")
            return False

    def _check_decimal_hardcoding(self):
        """Check for hardcoded decimal values in codebase"""
        base_path = Path(__file__).parent.parent

        # Files to check for decimal hardcoding
        files_to_check = [
            "src/lib/varity-chain.ts",
            "backend/app/core/testnet_addresses.py",
        ]

        issues_found = False

        for file_path in files_to_check:
            full_path = base_path / file_path
            if not full_path.exists():
                continue

            content = full_path.read_text()

            # Check for correct decimals: 6
            if 'decimals: 6' in content or 'decimals": 6' in content or "decimals': 6" in content or '"decimals": 6' in content:
                print_success(f"{file_path}: Correctly uses 6 decimals")

            # Check for incorrect decimals: 18 (common ERC-20 default)
            if 'decimals: 18' in content or 'decimals": 18' in content or "decimals': 18" in content or '"decimals": 18' in content:
                print_error(f"{file_path}: Contains incorrect decimals=18 (should be 6)")
                issues_found = True

        if not issues_found:
            print_success("No decimal hardcoding issues found")

    async def test_block_explorer(self) -> bool:
        """Test block explorer functionality"""
        print_header("TASK 4: Block Explorer Validation")

        explorer_url = VARITY_L3_CONFIG["explorer_url"]
        usdc_address = VARITY_L3_CONFIG["usdc_address"]

        print_info(f"Testing block explorer: {explorer_url}")

        try:
            async with aiohttp.ClientSession() as session:
                # Test main explorer page
                start_time = time.time()
                async with session.get(explorer_url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                    end_time = time.time()
                    response_time = (end_time - start_time) * 1000

                    if response.status == 200:
                        print_success(f"Explorer homepage accessible ({response_time:.2f}ms)")
                    else:
                        print_error(f"Explorer returned status {response.status}")
                        return False

                # Test contract address page
                contract_url = f"{explorer_url}/address/{usdc_address}"
                print_info(f"Testing contract page: {contract_url}")

                start_time = time.time()
                async with session.get(contract_url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                    end_time = time.time()
                    response_time = (end_time - start_time) * 1000

                    if response.status == 200:
                        print_success(f"Contract page accessible ({response_time:.2f}ms)")
                    else:
                        print_warning(f"Contract page returned status {response.status}")

                # Test API endpoint (if available)
                api_url = f"{explorer_url}/api"
                try:
                    async with session.get(api_url, timeout=aiohttp.ClientTimeout(total=5)) as response:
                        if response.status in [200, 404]:  # 404 is ok, means API exists but needs params
                            print_success("Explorer API endpoint exists")
                        else:
                            print_info(f"Explorer API returned status {response.status}")
                except:
                    print_info("Explorer API endpoint not tested (optional)")

            self.results["block_explorer"] = True
            return True

        except Exception as e:
            print_error(f"Block explorer test failed: {str(e)}")
            self.results["errors"].append(f"Block explorer error: {str(e)}")
            return False

    async def load_test_rpc(self) -> Dict:
        """Load test RPC with 100 concurrent requests"""
        print_header("TASK 5: Load Testing (100 Concurrent Requests)")

        print_info("Starting load test with 100 concurrent requests...")

        async def make_request(session, request_id):
            """Make a single async HTTP request"""
            start_time = time.time()
            try:
                async with session.post(
                    VARITY_L3_CONFIG["rpc_url"],
                    json={
                        "jsonrpc": "2.0",
                        "method": "eth_blockNumber",
                        "params": [],
                        "id": request_id
                    },
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    end_time = time.time()
                    response_time = (end_time - start_time) * 1000

                    if response.status == 200:
                        data = await response.json()
                        if "result" in data:
                            return {"success": True, "time": response_time}
                        else:
                            return {"success": False, "time": response_time, "error": "No result in response"}
                    else:
                        return {"success": False, "time": response_time, "error": f"HTTP {response.status}"}

            except Exception as e:
                end_time = time.time()
                response_time = (end_time - start_time) * 1000
                return {"success": False, "time": response_time, "error": str(e)}

        # Execute concurrent requests
        async with aiohttp.ClientSession() as session:
            tasks = [make_request(session, i) for i in range(LOAD_TEST_CONCURRENT)]
            results = await asyncio.gather(*tasks)

        # Analyze results
        successful = sum(1 for r in results if r["success"])
        failed = len(results) - successful
        response_times = [r["time"] for r in results if r["success"]]

        success_rate = (successful / LOAD_TEST_CONCURRENT) * 100
        avg_response_time = statistics.mean(response_times) if response_times else 0
        median_response_time = statistics.median(response_times) if response_times else 0
        max_response_time = max(response_times) if response_times else 0

        print(f"\n{Colors.BOLD}Load Test Results:{Colors.END}")
        print(f"  Total Requests: {LOAD_TEST_CONCURRENT}")
        print(f"  Successful: {successful}")
        print(f"  Failed: {failed}")
        print(f"  Success Rate: {success_rate:.1f}%")
        print(f"\n{Colors.BOLD}Concurrent Response Time Statistics:{Colors.END}")
        print(f"  Average: {avg_response_time:.2f}ms")
        print(f"  Median: {median_response_time:.2f}ms")
        print(f"  Max: {max_response_time:.2f}ms")

        # Validation
        if success_rate >= 90:  # Lower threshold for concurrent requests
            print_success(f"Load test success rate {success_rate:.1f}% is acceptable")
        else:
            print_error(f"Load test success rate {success_rate:.1f}% is too low")

        if avg_response_time <= RESPONSE_TIME_THRESHOLD_MS * 2:  # Allow 2x threshold for concurrent
            print_success(f"Load test average response time {avg_response_time:.2f}ms is acceptable")
            self.results["load_test"] = True
        else:
            print_warning(f"Load test average response time {avg_response_time:.2f}ms is high")

        return {
            "success_rate": success_rate,
            "avg_response_time": avg_response_time,
            "max_response_time": max_response_time,
        }

    async def run_all_validations(self) -> Dict:
        """Run all validation tests"""
        print_header("VARITY L3 NETWORK CONFIGURATION VALIDATOR")
        print_info(f"Chain ID: {VARITY_L3_CONFIG['chain_id']}")
        print_info(f"RPC URL: {VARITY_L3_CONFIG['rpc_url']}")
        print_info(f"Explorer: {VARITY_L3_CONFIG['explorer_url']}")
        print_info(f"USDC: {VARITY_L3_CONFIG['usdc_address']}")

        # Run all tests
        rpc_results = await self.validate_rpc_endpoint()
        chain_id_valid = self.verify_chain_id()
        usdc_valid = self.test_usdc_contract()
        explorer_valid = await self.test_block_explorer()
        load_test_results = await self.load_test_rpc()

        # Calculate final score
        print_header("FINAL VALIDATION RESULTS")

        scores = {
            "RPC Connectivity": 100 if self.results["rpc_connectivity"] else 0,
            "Chain ID Configuration": 100 if self.results["chain_id"] else 0,
            "USDC Contract": 100 if self.results["usdc_contract"] else 0,
            "Block Explorer": 100 if self.results["block_explorer"] else 0,
            "Load Testing": 100 if self.results["load_test"] else 0,
        }

        for component, score in scores.items():
            if score == 100:
                print_success(f"{component}: {score}/100")
            else:
                print_error(f"{component}: {score}/100")

        final_score = sum(scores.values()) / len(scores)

        print(f"\n{Colors.BOLD}{Colors.BLUE}{'=' * 80}{Colors.END}")
        if final_score == 100:
            print(f"{Colors.BOLD}{Colors.GREEN}FINAL SCORE: {final_score:.0f}/100 - PERFECT!{Colors.END}")
        elif final_score >= 80:
            print(f"{Colors.BOLD}{Colors.YELLOW}FINAL SCORE: {final_score:.0f}/100 - GOOD{Colors.END}")
        else:
            print(f"{Colors.BOLD}{Colors.RED}FINAL SCORE: {final_score:.0f}/100 - NEEDS WORK{Colors.END}")
        print(f"{Colors.BOLD}{Colors.BLUE}{'=' * 80}{Colors.END}\n")

        # Print errors if any
        if self.results["errors"]:
            print_header("ERRORS ENCOUNTERED")
            for error in self.results["errors"][:10]:  # Show first 10 errors
                print_error(error)
            if len(self.results["errors"]) > 10:
                print_info(f"... and {len(self.results['errors']) - 10} more errors")

        return {
            "final_score": final_score,
            "component_scores": scores,
            "rpc_results": rpc_results,
            "load_test_results": load_test_results,
            "errors": self.results["errors"],
        }


async def main():
    """Main entry point"""
    validator = VarityL3Validator()
    results = await validator.run_all_validations()

    # Save results to file
    results_file = Path(__file__).parent.parent / "validation_results.json"
    with open(results_file, "w") as f:
        json.dump(results, f, indent=2)

    print_info(f"Detailed results saved to: {results_file}")

    # Exit with appropriate code
    if results["final_score"] == 100:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
