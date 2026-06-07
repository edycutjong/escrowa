# Contributing to Escrowa

First off, thank you for considering contributing to Escrowa! We welcome contributions from everyone—whether it's fixing bugs, improving documentation, or proposing new features for our TEE-based autonomous escrow agent.

## Getting Started

Escrowa is a monorepo containing two main components:
1. **`board/`**: The Next.js 16 frontend and API routes.
2. **`contract/`**: The Rust WASM smart contract that simulates enclave logic.

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- `wasm32-wasip2` target for Rust (`rustup target add wasm32-wasip2`)

### Local Development

#### 1. Contract Development (Rust)
To build and test the Rust contract:
```bash
cd contract
cargo fmt
cargo clippy --target wasm32-wasip2 --release -- -D warnings
cargo build --target wasm32-wasip2 --release
```

#### 2. Board Development (Next.js)
To run the Next.js frontend:
```bash
cd board
npm install
# Set up your .env.local with Upstash Redis credentials
npm run dev
```
The application will be available at `http://localhost:3000`.

## Pull Request Process

1. **Fork the repository** and create your branch from `main`.
2. **Write tests** for any new features or bug fixes.
3. **Ensure CI passes**: Our GitHub Actions will automatically run `npm run ci` on the `board` directory and run formatting, clippy, and builds for the `contract` directory.
4. **Descriptive Commits**: Use clear, detailed git commit messages indicating what your PR solves.
5. **Update Documentation**: If you change APIs or add features, update `README.md` or relevant documentation.

## Code Style

- **TypeScript/JavaScript**: We use ESLint and TypeScripts strict mode. Ensure `npm run lint` and `npm run typecheck` pass without warnings.
- **Rust**: We use `rustfmt` and `clippy`. Ensure there are no formatting issues or compiler warnings.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please be respectful and constructive in issues and pull requests.
