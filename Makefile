.PHONY: help install dev start build contract-build contract-test contract-check register lint typecheck test e2e lighthouse security-scan ci

help:
	@echo "Escrowa Development Makefile"
	@echo "────────────────────────────────────────"
	@echo "make install        - Install board deps + Rust wasm target"
	@echo "make dev            - Run the board dev server (http://localhost:3000)"
	@echo "make start          - Build + run the board in production mode"
	@echo "make build          - Build Next.js app and Rust WASM contract"
	@echo "make contract-build - Build only the Rust WASM contract"
	@echo "make contract-test  - Run only the Rust contract tests"
	@echo "make contract-check - fmt + clippy + test for the contract"
	@echo "make register       - Register the WASM contract on T3N (needs T3N_API_KEY)"
	@echo "make lint           - Run ESLint check"
	@echo "make typecheck      - Run TypeScript check"
	@echo "make test           - Run Vitest unit tests"
	@echo "make e2e            - Run Playwright E2E tests"
	@echo "make lighthouse     - Run Lighthouse CI audit"
	@echo "make security-scan  - Audit NPM dependencies"
	@echo "make ci             - Run CI pipeline for both board and contract"

install:
	@echo "📥 Installing board dependencies..."
	cd board && npm install
	@echo "🦀 Ensuring Rust wasm32-wasip2 target..."
	rustup target add wasm32-wasip2

dev:
	@echo "🚀 Starting Escrowa board (dev) on http://localhost:3000 ..."
	cd board && npm run dev

start:
	@echo "🚀 Building + starting Escrowa board (production)..."
	cd board && npm run build && npm run start

build:
	@echo "📦 Building Next.js app..."
	cd board && npm run build
	@echo "🦀 Building Rust WASM contract..."
	cargo build --manifest-path contract/Cargo.toml --target wasm32-wasip2 --release

contract-build:
	@echo "🦀 Building Rust WASM contract (wasm32-wasip2)..."
	cargo build --manifest-path contract/Cargo.toml --target wasm32-wasip2 --release

contract-test:
	@echo "🧪 Running Rust contract tests..."
	cargo test --manifest-path contract/Cargo.toml

contract-check:
	@echo "=== CONTRACT CHECKS (fmt + clippy + test) ==="
	cargo fmt --manifest-path contract/Cargo.toml -- --check
	cargo clippy --manifest-path contract/Cargo.toml -- -D warnings
	cargo test --manifest-path contract/Cargo.toml

register:
	@echo "🔗 Registering Escrowa contract on T3N (requires T3N_API_KEY)..."
	cd board && NODE_PATH="$(CURDIR)/board/node_modules" npx tsx ../scripts/register-contract.ts

ci: lint typecheck
	@echo "🧪 Running Vitest unit tests with coverage..."
	cd board && npm run test:coverage
	$(MAKE) contract-check

lint:
	@echo "💅 Running ESLint check..."
	cd board && npm run lint

typecheck:
	@echo "🔍 Running TypeScript typecheck..."
	cd board && npm run typecheck

test:
	@echo "🧪 Running Vitest unit tests..."
	cd board && npm run test

e2e:
	@echo "🎭 Running Playwright E2E tests..."
	cd board && npx playwright test

lighthouse:
	@echo "🔦 Running Lighthouse CI audit..."
	cd board && npx lhci autorun

security-scan:
	@echo "=== NPM AUDIT ==="
	cd board && npm audit --audit-level=high || true
