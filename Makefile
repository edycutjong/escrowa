.PHONY: help build lint typecheck test e2e lighthouse security-scan

help:
	@echo "Escrowa Development Makefile"
	@echo "────────────────────────────────────────"
	@echo "make build         - Build Next.js app and Rust contract"
	@echo "make lint          - Run ESLint check"
	@echo "make typecheck     - Run TypeScript check"
	@echo "make test          - Run Vitest unit tests"
	@echo "make e2e           - Run Playwright E2E tests"
	@echo "make lighthouse    - Run Lighthouse CI audit"
	@echo "make security-scan - Audit NPM dependencies"

build:
	@echo "📦 Building Next.js app..."
	cd board && npm run build
	@echo "🦀 Building Rust WASM contract..."
	cargo build --manifest-path contract/Cargo.toml --target wasm32-wasip2 --release

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
