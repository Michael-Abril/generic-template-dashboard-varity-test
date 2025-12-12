# Contributing to Varity Generic Company Dashboard

Thank you for your interest in contributing to the Varity Generic Company Dashboard! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Pull Request Process](#pull-request-process)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)

---

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful and professional in all interactions.

- **Be respectful**: Treat all contributors with respect
- **Be collaborative**: Work together to improve the project
- **Be constructive**: Provide helpful feedback and suggestions
- **Be patient**: Remember that everyone is learning

---

## Getting Started

### Prerequisites

- Node.js 16+ ([Download](https://nodejs.org/))
- Python 3.8+ (Python 3.11 recommended)
- npm or pnpm
- Git
- Web3 wallet (MetaMask recommended for testing)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/varity/generic-company-dashboard
   cd generic-company-dashboard
   ```

2. **Install dependencies**
   ```bash
   # Frontend
   npm install

   # Backend
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   cd ..
   ```

3. **Configure environment**
   ```bash
   # Copy environment template
   cp .env.example .env

   # Edit .env and add:
   # - Privy App ID (get from https://dashboard.privy.io)
   # - thirdweb Client ID (get from https://thirdweb.com/dashboard)
   # - Database URL
   # - Other required credentials
   ```

4. **Start development servers**
   ```bash
   # Frontend (http://localhost:3001)
   npm run dev

   # Backend (http://localhost:8000)
   cd backend
   uvicorn main:app --reload --port 8000
   ```

5. **Verify setup**
   ```bash
   # Frontend should open at http://localhost:3001
   # Backend docs at http://localhost:8000/docs
   ```

---

## Development Workflow

### Branch Strategy

- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/*`: New features
- `bugfix/*`: Bug fixes
- `hotfix/*`: Urgent production fixes

### Creating a Feature Branch

```bash
# Create and switch to feature branch
git checkout -b feature/your-feature-name

# Make your changes
git add .
git commit -m "feat: add your feature description"

# Push to remote
git push origin feature/your-feature-name
```

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, no code change)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Examples:
```
feat: add OAuth integration for Stripe
fix: resolve wallet connection issue on mobile
docs: update deployment guide
test: add unit tests for marketplace API
```

---

## Code Standards

### TypeScript/JavaScript

- **Use TypeScript** for all frontend code
- **Enable strict mode**: `"strict": true` in tsconfig.json
- **No `any` types**: Use `unknown` if type is truly unknown
- **Use functional components** with React Hooks
- **Follow ESLint rules**: Run `npm run lint` before committing
- **Use Prettier** for formatting: Run `npm run format`

Example:
```typescript
// Good ✓
interface User {
  address: string;
  email?: string;
}

async function fetchUser(address: string): Promise<User> {
  // Implementation
}

// Bad ✗
async function fetchUser(address: any) {
  // Using 'any' type
}
```

### Python

- **Use Python 3.8+** (3.11 recommended)
- **Type hints required** for all functions
- **Follow PEP 8** style guide
- **Use Black** for formatting: `black .`
- **Use mypy** for type checking: `mypy app/`

Example:
```python
# Good ✓
from typing import Optional

async def get_user(wallet_address: str) -> Optional[User]:
    """Fetch user by wallet address."""
    # Implementation
    pass

# Bad ✗
async def get_user(wallet_address):  # No type hints
    pass
```

### Smart Contracts (Solidity)

- **Use Solidity 0.8.x** (latest stable)
- **Follow best practices**:
  - Checks-effects-interactions pattern
  - Reentrancy guards
  - Access control (OpenZeppelin)
- **Use OpenZeppelin** libraries where possible
- **Comprehensive tests**: >95% coverage required
- **Gas optimization**: Review gas costs
- **Security audit**: Required before mainnet

Example:
```solidity
// Good ✓
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract MyContract is ReentrancyGuard {
    function withdraw() external nonReentrant {
        // Implementation
    }
}
```

---

## Pull Request Process

### Before Submitting

1. **Ensure all tests pass**
   ```bash
   npm test
   cd backend && pytest
   cd ../contracts && npx hardhat test
   ```

2. **Run linters**
   ```bash
   npm run lint
   black backend/
   mypy backend/app/
   ```

3. **Update documentation** if needed

4. **Write clear commit messages** (see Commit Message Convention)

### Submitting a Pull Request

1. **Create PR** on GitHub
2. **Fill out PR template**:
   - Description of changes
   - Related issue number
   - Testing performed
   - Breaking changes (if any)
3. **Request review** from maintainers
4. **Address feedback** from reviewers
5. **Ensure CI passes** (GitHub Actions)

### PR Review Criteria

✅ Code follows style guidelines
✅ Tests are passing
✅ Test coverage remains >80%
✅ Documentation is updated
✅ No security vulnerabilities introduced
✅ Performance impact is acceptable
✅ Changes are backwards compatible (or breaking changes are documented)

---

## Testing Guidelines

### Frontend Tests

```bash
# Run all frontend tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- src/components/MyComponent.test.tsx
```

### Backend Tests

```bash
# Run all backend tests
cd backend
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test
pytest tests/test_marketplace.py
```

### Smart Contract Tests

```bash
# Run all contract tests
cd contracts
npx hardhat test

# Run with coverage
npx hardhat coverage

# Run specific test
npx hardhat test test/ToolMarketplace.test.ts
```

### Test Coverage Requirements

- **Frontend**: >80% coverage
- **Backend**: >80% coverage
- **Smart Contracts**: >95% coverage

---

## Documentation

### Code Documentation

- **JSDoc/TSDoc** for TypeScript functions
- **Docstrings** for Python functions
- **NatSpec** for Solidity contracts

Example:
```typescript
/**
 * Fetches user data from the blockchain
 * @param address - Wallet address of the user
 * @returns User object or null if not found
 * @throws Error if blockchain connection fails
 */
async function fetchUser(address: string): Promise<User | null> {
  // Implementation
}
```

### Documentation Files

- Update **README.md** for major features
- Update **DEPLOYMENT.md** for deployment changes
- Update **CHANGELOG.md** for all changes
- Create **docs/** files for complex features

---

## Need Help?

- **Discord**: https://discord.gg/varity
- **GitHub Discussions**: https://github.com/varity/generic-template/discussions
- **Email**: dev@varity.xyz

---

## License

By contributing to this project, you agree that your contributions will be licensed under the MIT License with "Powered by Varity" attribution requirement.

---

Thank you for contributing to Varity! 🚀
