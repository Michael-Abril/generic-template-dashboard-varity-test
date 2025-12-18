# Frontend Utilities

This directory contains utility functions and helper methods for the frontend.

## Purpose

- Provide reusable utility functions
- Centralize common operations
- Keep components clean and focused

## Structure

- `index.ts` - Main utility exports
- `formatting.ts` - Data formatting utilities
- `validation.ts` - Input validation helpers
- `crypto.ts` - Cryptography and wallet utilities
- `date.ts` - Date/time formatting utilities

## Usage

```typescript
import { formatAddress, formatCurrency } from '@/utils';

const shortAddress = formatAddress('0x1234...5678'); // '0x1234...5678'
const price = formatCurrency(1000000, 6); // '$1.00'
```

## Guidelines

- Keep functions pure when possible
- Add JSDoc comments for all utilities
- Write unit tests for all utility functions
- Avoid utilities that depend on React (use hooks instead)
