#!/bin/bash

# Fix marketplace/page.tsx
sed -i '/\/\/ const { contract: marketplaceContract } = useContract(/,/);/c\  \/\/ TODO: Contract integration will be added in future update\n  const marketplaceContract = null;' src/app/marketplace/page.tsx

# Fix integrations/page.tsx
sed -i '/\/\/ const { contract: marketplaceContract } = useContract(/,/);/c\  \/\/ TODO: Contract integration will be added in future update\n  const marketplaceContract = null;' src/app/integrations/page.tsx

echo "Fixed broken multiline comments"
