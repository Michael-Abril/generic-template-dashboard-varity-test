#!/bin/bash

# Replace old thirdweb imports with Privy wallet hooks
find src -name "*.tsx" -o -name "*.ts" | while read file; do
  if grep -q "@thirdweb-dev/react" "$file"; then
    echo "Fixing $file..."
    
    # Replace import statement
    sed -i "s/import { useAddress, useContract, useContractRead } from '@thirdweb-dev\/react';/import { useWallets } from '@privy-io\/react-auth';/g" "$file"
    sed -i "s/import { useAddress } from '@thirdweb-dev\/react';/import { useWallets } from '@privy-io\/react-auth';/g" "$file"
    
    # Replace useAddress() with wallets hook
    sed -i "s/const address = useAddress();/const { wallets } = useWallets();\n  const address = wallets[0]?.address;/g" "$file"
    
    # Comment out useContract and useContractRead (not needed for perf optimization)
    sed -i "s/const { contract:/\/\/ const { contract:/g" "$file"
    sed -i "s/const { data:/\/\/ const { data:/g" "$file"
  fi
done

echo "Done!"
