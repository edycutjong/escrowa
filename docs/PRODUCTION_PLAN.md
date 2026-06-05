# PRODUCTION PLAN — Escrowa (proof-of-production)

## Live URL
- **Board + demo:** Vercel — `escrowa.edycu.dev` (Next.js).
- **Escrowa service:** Fly.io / Railway — holds the `T3nClient` TEE session + escrow key custody.

## On-chain / token proof (the headline artifact)
- A **real test-token release** fires in the demo via `signing` + `outbox` — include the **verifiable settlement reference** (and a block-explorer link **if** the token rail exposes one) in README and SUBMISSION. This beats every testnet screenshot of a half-working DeFi bot.
- Escrowa `did:t3n` + party DIDs registered via **`did-registry` / `agent-registry`** — include DIDs + any on-chain link.

## Published package
- Publish the escrow client as npm **`escrowa-sdk`** — `createMilestone()`, `attest()`, `release()`. A judge can fund a milestone and watch a release fire.

## Tests
- **115+ Vitest tests**, count in README ("118 tests (Vitest)").
- Coverage: the 4 release paths (mutual / deadline / arbiter / unfunded-reject), signature verification against did:t3n, and a **key-custody test that fails if the escrow private key ever appears in logs, env, or disk**.

## Benchmark
- `scripts/bench.py` → p50/p95/mean over 200 release-condition evaluations (excluding chain settlement). Methodology noted.

## Verify / integrity
- `scripts/verify_release.ts` — replays `m1` and asserts a settlement reference is produced and the key never exported.
- `scripts/verify_no_unilateral.ts` — asserts no single-party attestation can trigger release.

## Settlement reference / explorer
- Release settlement reference (from `signing` + `outbox`) + `did-registry` links — in README.

## Readiness gate
- `scripts/check_submission_readiness.py` fails on any leftover `https://github.com/edycutjong/escrowa`/`https://escrowa.edycu.dev`/`https://youtu.be/escrowa-demo`/`https://api.terminal3.io/v1/explorer/tx_0x334155aef4` placeholder.
