# Application Constants

This directory contains application-wide constants and configuration values.

## Purpose

- Define reusable constant values
- Centralize configuration
- Avoid magic strings and numbers throughout the codebase

## Structure

- `index.ts` - Main constant exports
- `chains.ts` - Blockchain network configurations
- `routes.ts` - Application route paths
- `contracts.ts` - Smart contract addresses and ABIs

## Usage

```typescript
import { VARITY_L3_CHAIN_ID, APP_ROUTES } from '@/constants';

const chainId = VARITY_L3_CHAIN_ID; // 33529
const homePath = APP_ROUTES.HOME; // '/'
```
