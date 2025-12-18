"""
Comprehensive adapter verification script for Group 1 adapters
Verifies all required methods and implementation details
"""
import inspect
import sys
from typing import get_type_hints

def verify_adapter(adapter_class, adapter_name):
    """Verify an adapter has all required methods and proper implementation"""
    print(f"\n{'='*60}")
    print(f"Verifying {adapter_name} Adapter")
    print(f"{'='*60}")

    issues = []
    warnings = []

    # Required methods
    required_methods = {
        'get_data_types': {
            'required': True,
            'async': False,
            'description': 'Returns list of data types'
        },
        'fetch_data': {
            'required': True,
            'async': True,
            'description': 'Fetches data from integration'
        },
        'transform_data': {
            'required': True,
            'async': False,
            'description': 'Transforms data to common schema'
        },
        'sync_data': {
            'required': True,
            'async': True,
            'description': 'Sync all data with encryption and storage'
        }
    }

    # Check each required method
    for method_name, requirements in required_methods.items():
        if not hasattr(adapter_class, method_name):
            issues.append(f"Missing required method: {method_name}")
            continue

        method = getattr(adapter_class, method_name)

        # Check if it's a method
        if not callable(method):
            issues.append(f"{method_name} is not callable")
            continue

        # Check if it should be async
        is_async = inspect.iscoroutinefunction(method)
        if requirements['async'] and not is_async:
            issues.append(f"{method_name} should be async but is not")
        elif not requirements['async'] and is_async:
            warnings.append(f"{method_name} is async but doesn't need to be")

        print(f"✓ {method_name}: {'async' if is_async else 'sync'} - {requirements['description']}")

    # Check __init__ signature
    if hasattr(adapter_class, '__init__'):
        init_signature = inspect.signature(adapter_class.__init__)
        params = list(init_signature.parameters.keys())

        if 'credentials' not in params:
            issues.append("__init__ missing 'credentials' parameter")
        else:
            print(f"✓ __init__: accepts credentials parameter")

    # Check for FilecoinService and EncryptionService
    init_code = inspect.getsource(adapter_class.__init__)

    if 'FilecoinService()' not in init_code:
        warnings.append("FilecoinService not initialized in __init__")
    else:
        print(f"✓ Storage: FilecoinService initialized")

    if 'EncryptionService()' not in init_code:
        warnings.append("EncryptionService not initialized in __init__")
    else:
        print(f"✓ Encryption: EncryptionService initialized")

    # Check error handling in fetch_data
    if hasattr(adapter_class, 'fetch_data'):
        fetch_code = inspect.getsource(adapter_class.fetch_data)

        has_try_except = 'try:' in fetch_code and 'except' in fetch_code
        if not has_try_except:
            issues.append("fetch_data missing error handling (try/except)")
        else:
            print(f"✓ Error Handling: try/except blocks present")

        has_logging = 'logger.' in fetch_code
        if not has_logging:
            warnings.append("fetch_data should include logging")
        else:
            print(f"✓ Logging: Logger usage found")

    # Check for hardcoded values
    source_code = inspect.getsource(adapter_class)
    suspicious_patterns = [
        ('http://localhost', 'Hardcoded localhost URL'),
        ('password=', 'Hardcoded password'),
        ('api_key=', 'Hardcoded API key'),
    ]

    for pattern, description in suspicious_patterns:
        if pattern in source_code and pattern + '"' not in source_code:
            warnings.append(f"Possible hardcoded value: {description}")

    # Print summary
    print(f"\n{'-'*60}")
    if not issues and not warnings:
        print(f"✅ {adapter_name}: ALL CHECKS PASSED")
        return True
    else:
        if issues:
            print(f"❌ {adapter_name}: {len(issues)} CRITICAL ISSUE(S)")
            for issue in issues:
                print(f"  - CRITICAL: {issue}")
        if warnings:
            print(f"⚠️  {adapter_name}: {len(warnings)} WARNING(S)")
            for warning in warnings:
                print(f"  - WARNING: {warning}")
        return len(issues) == 0


if __name__ == "__main__":
    from app.adapters.quickbooks.sync import QuickBooksSync
    from app.adapters.salesforce.sync import SalesforceSync
    from app.adapters.shopify.sync import ShopifySync
    from app.adapters.slack.sync import SlackSync
    from app.adapters.monday.sync import MondaySync

    adapters = [
        (QuickBooksSync, "QuickBooks"),
        (SalesforceSync, "Salesforce"),
        (ShopifySync, "Shopify"),
        (SlackSync, "Slack"),
        (MondaySync, "Monday.com")
    ]

    all_passed = True
    results = []

    for adapter_class, adapter_name in adapters:
        passed = verify_adapter(adapter_class, adapter_name)
        results.append((adapter_name, passed))
        if not passed:
            all_passed = False

    # Final summary
    print(f"\n{'='*60}")
    print("VERIFICATION SUMMARY")
    print(f"{'='*60}")

    for adapter_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {adapter_name}")

    print(f"\nTotal: {len([p for _, p in results if p])}/{len(results)} adapters passed")

    if all_passed:
        print("\n🎉 All Group 1 adapters are production-ready!")
        sys.exit(0)
    else:
        print("\n⚠️  Some adapters need fixes before production deployment")
        sys.exit(1)
