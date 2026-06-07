# BUGS.md — Bug & Documentation Log

> Submitted for the Terminal 3 ADK Bounty Challenge **bug / documentation log** track ($200).
> This is an honest record of issues we hit while building **Escrowa**, split into (A) feedback
> on the Terminal 3 ADK docs / SDK developer experience and (B) bugs in our own code that we
> found and fixed. Line references point at the commit that fixed each item.

---

## A. Terminal 3 ADK — documentation & SDK feedback

### A1. Conflicting / non-existent API names across the docs and community briefs
**Severity:** medium (cost real dev hours) · **Area:** docs clarity

While scoping the contract we repeatedly hit API names that do **not** exist in the verified
`docs.terminal3.io` surface but appear in older briefs, blog posts, and AI-generated guidance:
`ERC-8004`, `Hedera`, `PRIVATE_DATA_PROCESSING`, `A2A`, `MCP`, `loadWasmComponent`, and `Stripe`
integrations. We only resolved the confusion by cross-checking the ADK overview, the
register/invoke-contract walkthrough, and `t3n/how-t3n-works/host-api` + `tees` pages directly.

**Suggested fix:** a single canonical "Host API — these 21 interfaces and nothing else" page,
prominently linked, with an explicit "names you may see elsewhere that are NOT part of T3N" note.
This is the single biggest time sink for a new builder.

### A2. `signing` interface scope is under-documented
**Severity:** low · **Area:** docs

The `signing` host interface actually covers three distinct capabilities — cluster ECDSA
(secp256k1) per-wallet signing **and** SD-JWT VC issuance — but the host-API table lists it as one
line. For an escrow/payment use case it was not obvious from the docs that per-wallet release
signing and verifiable-credential issuance share the same interface. A short example per capability
would help.

### A3. `did:t3n` ⇄ "agents authenticate as themselves, not as tenants" needs an end-to-end example
**Severity:** low · **Area:** docs / DX

The distinction between tenant auth and agent self-auth (`did:t3n:<hex>`) is stated but never shown
in one runnable example alongside `agent-auth-update`. We had to infer the wiring between
`did-registry`, `agent-registry`, and `agent-auth` from three separate pages.

### A4. WASM Component toolchain ↔ JS bundler interplay is undocumented
**Severity:** medium · **Area:** SDK / DX

Consuming a `wasm32-wasip2` component from a modern JS bundler (Next.js 16 / Turbopack) via
`@bytecodealliance/jco` requires bundler-specific configuration that is not mentioned anywhere in
the ADK docs (see bug **B2** below for the concrete failure). A "consuming your contract from a
web app" guide would close a real gap, since the TS client is the primary supported SDK.

### A5. Most host interfaces are "Coming soon" for tenant contracts — including `agent-auth` (the bounty's own theme) and the whole transacting stack
**Severity:** high (blocks the promoted use cases) · **Area:** docs / capability gap

Per the host-API table (`t3n/how-t3n-works/host-api`), only **`kv-store`** (plus the base
`logging` / `tenant-context`, and `http`) is **✅ available** to tenant contracts. **`signing`,
`outbox`, `vp`, `did-registry`, and `agent-auth` are all marked "Coming soon."** Yet the overview /
use-case docs front-and-center promote agents that **transact** (booking + payment, B2B settlement)
and manage **identity/delegation** — none of which a tenant contract can actually do on the live
network today. Notably the **$300 track is "Best Agent Auth SDK"** while the `agent-auth` host
interface itself is "Coming soon" for tenant contracts. **Suggested fix:** surface the availability
column on the use-case pages, and clarify what a builder can ship *today* vs. what's forthcoming.
(This is why Escrowa runs against a local simulation — see the README "Hackathon Simulation Context".)

### A6. Contract identity is a `z:<tid>:<tail>` script name + numeric `contract_id`, not an address; the node URL is SDK-resolved
**Severity:** medium · **Area:** docs clarity / onboarding

Coming from EVM, we expected `register()` to return a `0x` contract address. It instead returns a
numeric `contract_id` + a `z:<tenantId>:<tail>` **script name** (used for `executeAndDecode`). Also,
there is **no static REST base** — `https://api.terminal3.io/v1/*` returns **404**; the node URL is
resolved by the SDK via `setEnvironment("testnet"|"production")` / `getNodeUrl()`. Both cost time.
**Suggested fix:** a short "contract identity & endpoints" note ("not an address — a script name;
don't hardcode a base URL").

### A7. The required WIT import/export names live only in a "tips" page, not the main walkthrough
**Severity:** medium · **Area:** docs structure

Capabilities come from WIT imports like `import t3n:host/kv-store@0.1.0;` and the component must
export `t3n:contract/dispatch@0.1.0;`. These exact names — the difference between a contract that
registers and one that doesn't — are only in `tips/capabilities-from-wit-import`, not in the
`write-contract`/`build-contract` walkthrough where a builder first needs them.

### A8. Developer guide is split across two URL trees with weak cross-linking
**Severity:** low · **Area:** docs discoverability

Conceptual docs live under `docs.terminal3.io/t3n/...` while the actual ADK developer guide
(prerequisites, write/build/register/invoke walkthrough, host-API, OpenAPI) lives under
`docs.terminal3.io/developers/adk/...`. The two aren't strongly linked — a reader (or a crawler)
starting from the overview/use-case pages never reaches the walkthrough; only `llms.txt` ties them
together. **Suggested fix:** a prominent "Start building" link from the overview into `/developers/adk`.

### A9. The OpenAPI spec links in `llms.txt` are broken (404)
**Severity:** low · **Area:** docs / broken links

`https://docs.terminal3.io/llms.txt` lists an **`## OpenAPI Specs`** section pointing to
`https://docs.terminal3.io/terminal-3-openapi.yml` and `https://docs.terminal3.io/api-reference/openapi.json`,
but both return **HTTP 404** (verified with and without a browser User-Agent). So there's no
machine-readable API spec reachable from the advertised location. **Suggested fix:** publish the
spec at those URLs or correct the index links.

---

## B. Escrowa — bugs we found and fixed

### B1. Duplicate milestone seeding under Next.js dev HMR
**Severity:** medium · **Status:** fixed (`50509a4`)

In dev, Next.js Hot Module Reload re-invokes the `/api/seed` route handler against an in-memory
store that survives the reload, so re-seeding threw
`{"tag":"err","val":"Milestone ... already exists"}` and broke the dashboard on every edit.

**Fix:** `/api/seed` now treats an "already exists" result as idempotent success instead of a hard
error, so HMR and repeated seeds are safe.

### B2. `@bytecodealliance/jco` breaks the Next.js / Turbopack server bundle
**Severity:** high · **Status:** fixed (`4b56199`)

Bundling the transpiled WASM glue (`jco` output) into the Next.js server build failed: Turbopack
tried to trace the package and could not resolve the workspace root, and `jco` pulled in modules
that must stay external to the server bundle.

**Fix:** set the Turbopack `root` explicitly and exclude `jco` from the Next.js server bundle
(`serverExternalPackages` / equivalent), plus added the missing layout metadata that the build
warned about. The WASM component now loads at runtime instead of being bundled.

### B3. Mock ADK simulator mis-parsed some contract payloads
**Severity:** low · **Status:** fixed (`50509a4`)

The local TEE simulator (`board/src/wasm/host.ts` + the SDK shim) mis-handled certain
`executeAndDecode` input shapes, so a subset of attestation payloads decoded incorrectly before
reaching the contract `dispatch()`.

**Fix:** refined the mock ADK simulator payload parsing so the simulated host matches the
`wasm32-wasip2` contract's expected `ContractInput` shape.

### B4. Seed route error handling had unreachable branches
**Severity:** low · **Status:** fixed (`1b3dd80`)

While driving the seed route to 100% coverage we found error branches that could never be exercised
because earlier validation already returned. Refactored so every error path is reachable and tested.

---

## How to reproduce / verify

```bash
# Project bugs are covered by the test suite (54 Vitest + 18 Rust contract tests):
cd board && npm run test          # B1, B3, B4 + key-custody assertion
cd ../contract && cargo test      # contract dispatch / state-machine paths
```

> **Scope note:** This log reflects the *hackathon build* (TEE simulated locally via the ADK +
> `@bytecodealliance/jco`; see the "Hackathon Simulation Context" note in `README.md`). The
> Terminal 3 doc/SDK feedback in section A applies to the production network.
