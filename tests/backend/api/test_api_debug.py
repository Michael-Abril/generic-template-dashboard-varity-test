#!/usr/bin/env python3
"""
Debug the API to see what's happening
"""

import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

# Import the API function directly
from app.api.v1.marketplace_v2 import get_products
from app.core.database import AsyncSessionLocal

async def test_api_direct():
    """Call the API function directly"""

    print("Testing API function directly...")

    async with AsyncSessionLocal() as db:
        try:
            # Call the API function directly
            products = await get_products(
                category=None,
                search=None,
                featured=None,
                has_adapter=None,
                db=db
            )

            print(f"API returned {len(products)} products")

            if products:
                for product in products[:3]:
                    print(f"  - {product.name}: ${product.starting_price}")
            else:
                print("API returned empty list")

        except Exception as e:
            print(f"Error calling API: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_api_direct())