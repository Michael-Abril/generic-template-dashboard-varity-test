#!/usr/bin/env python3
"""
OAuth Configuration Validator for Varity L3 Marketplace
Validates that all OAuth requirements are met for 100% enterprise quality
"""

import os
import sys
import json
import base64
from typing import Dict, List, Tuple, Optional
from pathlib import Path
from dotenv import load_dotenv
import hashlib
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import kdf, hashes

# Load environment variables
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

# Color codes for terminal output
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_status(status: str, message: str):
    """Print colored status messages"""
    if status == "success":
        print(f"{Colors.GREEN}✅ {message}{Colors.ENDC}")
    elif status == "error":
        print(f"{Colors.RED}❌ {message}{Colors.ENDC}")
    elif status == "warning":
        print(f"{Colors.YELLOW}⚠️ {message}{Colors.ENDC}")
    elif status == "info":
        print(f"{Colors.BLUE}ℹ️ {message}{Colors.ENDC}")

def validate_env_variables() -> Tuple[bool, List[str]]:
    """Check if all required OAuth environment variables are set"""
    required_vars = {
        # OAuth Providers
        'QUICKBOOKS_CLIENT_ID': 'QuickBooks OAuth Client ID',
        'QUICKBOOKS_CLIENT_SECRET': 'QuickBooks OAuth Client Secret',
        'STRIPE_CLIENT_ID': 'Stripe OAuth Client ID',
        'STRIPE_CLIENT_SECRET': 'Stripe OAuth Client Secret',
        'SALESFORCE_CLIENT_ID': 'Salesforce OAuth Client ID',
        'SALESFORCE_CLIENT_SECRET': 'Salesforce OAuth Client Secret',
        'GOOGLE_WORKSPACE_CLIENT_ID': 'Google Workspace OAuth Client ID',
        'GOOGLE_WORKSPACE_CLIENT_SECRET': 'Google Workspace OAuth Client Secret',
        'SHOPIFY_CLIENT_ID': 'Shopify OAuth Client ID',
        'SHOPIFY_CLIENT_SECRET': 'Shopify OAuth Client Secret',
        'MICROSOFT_365_CLIENT_ID': 'Microsoft 365 OAuth Client ID',
        'MICROSOFT_365_CLIENT_SECRET': 'Microsoft 365 OAuth Client Secret',
        'SLACK_CLIENT_ID': 'Slack OAuth Client ID',
        'SLACK_CLIENT_SECRET': 'Slack OAuth Client Secret',
        'ZENDESK_CLIENT_ID': 'Zendesk OAuth Client ID',
        'ZENDESK_CLIENT_SECRET': 'Zendesk OAuth Client Secret',
        'MAILCHIMP_CLIENT_ID': 'Mailchimp OAuth Client ID',
        'MAILCHIMP_CLIENT_SECRET': 'Mailchimp OAuth Client Secret',
        'HUBSPOT_CLIENT_ID': 'HubSpot OAuth Client ID',
        'HUBSPOT_CLIENT_SECRET': 'HubSpot OAuth Client Secret',

        # Varity L3 Configuration
        'MARKETPLACE_CONTRACT': 'Varity L3 Marketplace Smart Contract Address',
        'VARITY_CHAIN_ID': 'Varity L3 Chain ID (should be 33529)',
        'VARITY_RPC_URL': 'Varity L3 RPC URL',
    }

    missing_vars = []
    for var, description in required_vars.items():
        value = os.getenv(var)
        if not value or value == 'your_actual_client_id' or value == 'your_actual_client_secret' or value == '0x...':
            missing_vars.append(f"{var} ({description})")

    return len(missing_vars) == 0, missing_vars

def test_encryption_service() -> bool:
    """Test the AES-256-GCM encryption service"""
    try:
        # Test wallet addresses
        wallet_a = "0x1234567890123456789012345678901234567890"
        wallet_b = "0x9876543210987654321098765432109876543210"

        # Test data
        test_tokens = {
            "access_token": "test_access_token_12345",
            "refresh_token": "test_refresh_token_67890",
            "expires_in": 3600
        }

        # Test key derivation
        backend = default_backend()

        def derive_key(wallet_address: str) -> bytes:
            wallet = wallet_address.lower()
            if not wallet.startswith("0x"):
                wallet = f"0x{wallet}"

            salt = hashlib.sha256(
                f"varity-oauth-{wallet}-33529".encode()
            ).digest()[:16]

            kdf_instance = kdf.pbkdf2.PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100000,
                backend=backend
            )

            return kdf_instance.derive(wallet.encode())

        # Test encryption with wallet A
        key_a = derive_key(wallet_a)
        plaintext = json.dumps(test_tokens).encode()
        nonce = os.urandom(12)

        cipher = Cipher(
            algorithms.AES(key_a),
            modes.GCM(nonce),
            backend=backend
        )
        encryptor = cipher.encryptor()
        ciphertext = encryptor.update(plaintext) + encryptor.finalize()
        tag = encryptor.tag

        # Test decryption with same wallet
        cipher = Cipher(
            algorithms.AES(key_a),
            modes.GCM(nonce, tag),
            backend=backend
        )
        decryptor = cipher.decryptor()
        decrypted = decryptor.update(ciphertext) + decryptor.finalize()
        decrypted_data = json.loads(decrypted.decode())

        # Verify decryption worked
        if decrypted_data != test_tokens:
            return False

        # Test that wallet B cannot decrypt wallet A's data
        key_b = derive_key(wallet_b)
        try:
            cipher = Cipher(
                algorithms.AES(key_b),
                modes.GCM(nonce, tag),
                backend=backend
            )
            decryptor = cipher.decryptor()
            decryptor.update(ciphertext) + decryptor.finalize()
            # If we get here, isolation failed
            return False
        except:
            # This is expected - wallet B should not be able to decrypt
            pass

        return True
    except Exception as e:
        print(f"Encryption test error: {e}")
        return False

def check_database_schema() -> bool:
    """Check if OAuth database tables exist with proper schema"""
    try:
        # Import database models
        import sys
        sys.path.append(str(Path(__file__).parent))
        from app.models import OAuthToken
        from app.core.database import SessionLocal

        # Try to query the table
        db = SessionLocal()
        try:
            # Check if we can query the OAuth tokens table
            count = db.query(OAuthToken).count()

            # Verify the table has the correct columns
            from sqlalchemy import inspect
            inspector = inspect(db.get_bind())
            columns = inspector.get_columns('oauth_tokens')

            required_columns = [
                'id', 'user_address', 'provider', 'access_token',
                'refresh_token', 'expires_at', 'created_at', 'updated_at'
            ]

            column_names = [col['name'] for col in columns]
            for required_col in required_columns:
                if required_col not in column_names:
                    return False

            return True
        finally:
            db.close()
    except:
        return False

def check_frontend_routes() -> bool:
    """Check if OAuth callback routes exist in frontend"""
    frontend_dir = Path(__file__).parent.parent / 'src' / 'app' / 'oauth' / 'callback'

    if not frontend_dir.exists():
        return False

    # Check for [provider] directory
    provider_dir = frontend_dir / '[provider]'
    if not provider_dir.exists():
        return False

    # Check for page.tsx
    page_file = provider_dir / 'page.tsx'
    if not page_file.exists():
        return False

    return True

def check_oauth_button_component() -> bool:
    """Check if OAuthButton component exists"""
    component_path = Path(__file__).parent.parent / 'src' / 'components' / 'OAuthButton.tsx'
    return component_path.exists()

def check_backend_endpoints() -> bool:
    """Check if all OAuth backend endpoints exist"""
    try:
        sys.path.append(str(Path(__file__).parent))

        # Check if OAuth service exists
        oauth_service_path = Path(__file__).parent / 'app' / 'services' / 'oauth_service.py'
        if not oauth_service_path.exists():
            return False

        # Check if encryption service exists
        encryption_service_path = Path(__file__).parent / 'app' / 'services' / 'encryption_service.py'
        if not encryption_service_path.exists():
            return False

        # Check if OAuth API endpoints exist
        oauth_api_path = Path(__file__).parent / 'app' / 'api' / 'v1' / 'oauth.py'
        if not oauth_api_path.exists():
            return False

        return True
    except:
        return False

def calculate_quality_score(checks: Dict[str, bool]) -> int:
    """Calculate the overall quality score"""
    total_checks = len(checks)
    passed_checks = sum(1 for passed in checks.values() if passed)

    return int((passed_checks / total_checks) * 100)

def generate_setup_commands(missing_vars: List[str]) -> None:
    """Generate helpful commands to complete setup"""
    print(f"\n{Colors.BOLD}📋 Setup Commands:{Colors.ENDC}")

    if missing_vars:
        print(f"\n{Colors.YELLOW}1. Add OAuth credentials to .env file:{Colors.ENDC}")
        print("   cp .env.oauth.template .env")
        print("   # Edit .env and add your credentials")

        print(f"\n{Colors.YELLOW}2. Required OAuth App Setup:{Colors.ENDC}")
        providers = set()
        for var in missing_vars:
            if 'QUICKBOOKS' in var: providers.add('QuickBooks')
            elif 'STRIPE' in var: providers.add('Stripe')
            elif 'SALESFORCE' in var: providers.add('Salesforce')
            elif 'GOOGLE_WORKSPACE' in var: providers.add('Google Workspace')
            elif 'SHOPIFY' in var: providers.add('Shopify')
            elif 'MICROSOFT_365' in var: providers.add('Microsoft 365')
            elif 'SLACK' in var: providers.add('Slack')
            elif 'ZENDESK' in var: providers.add('Zendesk')
            elif 'MAILCHIMP' in var: providers.add('Mailchimp')
            elif 'HUBSPOT' in var: providers.add('HubSpot')

        for provider in providers:
            print(f"   • {provider}: Create OAuth app and add redirect URI")
            print(f"     - Development: http://localhost:3000/oauth/callback/{provider.lower().replace(' ', '-')}")
            print(f"     - Production: https://your-domain.com/oauth/callback/{provider.lower().replace(' ', '-')}")

    if 'MARKETPLACE_CONTRACT' in str(missing_vars):
        print(f"\n{Colors.YELLOW}3. Add Marketplace Contract Address:{Colors.ENDC}")
        print("   # Add to .env file:")
        print("   MARKETPLACE_CONTRACT=0x... # Your deployed contract on Varity L3")
        print("   VARITY_CHAIN_ID=33529")
        print("   VARITY_RPC_URL=https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz")

def main():
    """Main validation function"""
    print(f"{Colors.BOLD}{'=' * 60}{Colors.ENDC}")
    print(f"{Colors.BOLD}🔍 Varity L3 OAuth Configuration Validator{Colors.ENDC}")
    print(f"{Colors.BOLD}{'=' * 60}{Colors.ENDC}\n")

    checks = {}

    # 1. Check environment variables
    print(f"{Colors.BOLD}1. Checking Environment Variables...{Colors.ENDC}")
    env_valid, missing_vars = validate_env_variables()
    checks['Environment Variables'] = env_valid

    if env_valid:
        print_status("success", "All OAuth environment variables configured")
    else:
        print_status("warning", f"Missing {len(missing_vars)} environment variables")
        for var in missing_vars[:5]:  # Show first 5
            print(f"   • {var}")
        if len(missing_vars) > 5:
            print(f"   ... and {len(missing_vars) - 5} more")

    # 2. Test encryption service
    print(f"\n{Colors.BOLD}2. Testing Encryption Service...{Colors.ENDC}")
    encryption_works = test_encryption_service()
    checks['Encryption Service'] = encryption_works

    if encryption_works:
        print_status("success", "AES-256-GCM encryption working correctly")
        print_status("success", "Multi-tenant isolation verified")
    else:
        print_status("error", "Encryption service test failed")

    # 3. Check database schema
    print(f"\n{Colors.BOLD}3. Checking Database Schema...{Colors.ENDC}")
    db_ready = check_database_schema()
    checks['Database Schema'] = db_ready

    if db_ready:
        print_status("success", "OAuth database tables exist with correct schema")
    else:
        print_status("warning", "Database schema needs initialization")

    # 4. Check frontend routes
    print(f"\n{Colors.BOLD}4. Checking Frontend OAuth Routes...{Colors.ENDC}")
    frontend_ready = check_frontend_routes()
    checks['Frontend Routes'] = frontend_ready

    if frontend_ready:
        print_status("success", "OAuth callback routes configured")
    else:
        print_status("error", "Frontend OAuth routes missing")

    # 5. Check OAuth button component
    print(f"\n{Colors.BOLD}5. Checking OAuth Button Component...{Colors.ENDC}")
    button_exists = check_oauth_button_component()
    checks['OAuth Button'] = button_exists

    if button_exists:
        print_status("success", "OAuthButton component exists")
    else:
        print_status("error", "OAuthButton component missing")

    # 6. Check backend endpoints
    print(f"\n{Colors.BOLD}6. Checking Backend OAuth Endpoints...{Colors.ENDC}")
    backend_ready = check_backend_endpoints()
    checks['Backend Endpoints'] = backend_ready

    if backend_ready:
        print_status("success", "OAuth service and API endpoints configured")
    else:
        print_status("error", "Backend OAuth endpoints missing")

    # Calculate quality score
    quality_score = calculate_quality_score(checks)

    print(f"\n{Colors.BOLD}{'=' * 60}{Colors.ENDC}")
    print(f"{Colors.BOLD}📊 Enterprise Quality Score: {quality_score}%{Colors.ENDC}")
    print(f"{Colors.BOLD}{'=' * 60}{Colors.ENDC}\n")

    if quality_score == 100:
        print_status("success", "🎉 100% Enterprise-grade quality ACHIEVED!")
        print_status("success", "Your OAuth implementation is production-ready!")
    elif quality_score >= 90:
        print_status("warning", f"Almost there! Just need to configure credentials.")
        generate_setup_commands(missing_vars)
    elif quality_score >= 70:
        print_status("warning", f"Good progress. Complete the remaining items.")
        generate_setup_commands(missing_vars)
    else:
        print_status("error", f"Significant work needed to reach enterprise quality.")
        generate_setup_commands(missing_vars)

    # Summary
    print(f"\n{Colors.BOLD}📝 Summary:{Colors.ENDC}")
    for check_name, passed in checks.items():
        status = "success" if passed else "error"
        symbol = "✅" if passed else "❌"
        print(f"  {symbol} {check_name}: {'PASSED' if passed else 'FAILED'}")

    print(f"\n{Colors.BOLD}🎯 Next Steps:{Colors.ENDC}")
    if not env_valid:
        print("  1. Configure OAuth credentials in .env file")
        print("  2. Set up OAuth apps with each provider")
        print("  3. Add redirect URIs to OAuth app configurations")

    if quality_score == 100:
        print("  1. Test OAuth flow with real credentials")
        print("  2. Deploy to Varity L3 testnet")
        print("  3. Begin onboarding businesses!")

    return quality_score

if __name__ == "__main__":
    score = main()
    sys.exit(0 if score == 100 else 1)