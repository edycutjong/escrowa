<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 🔒 Escrowa — Agent Instructions

## Project
Escrowa is a TEE-backed (Trusted Execution Environment) milestone escrow application built for the Terminal 3 Agent Dev Kit Bounty Challenge. It enables clients and freelancers to securely lock T3 tokens in a hardware enclave, requiring cryptographic attestations (signatures) to release or refund funds based on delivery conditions, deadlines, or arbiter resolution.

## Structure
- `src/app/` — Next.js 16 App Router pages and API endpoints
- `src/app/page.tsx` — Main dashboard for viewing milestones, funding, attesting, and enclave execution animation
- `src/app/api/` — API routes to simulate the TEE enclave interactions (`/seed`, `/milestones`, `/milestones/[id]/attest`, etc.)
- `src/sdk/` — T3 Agent Dev Kit SDK logic
- `globals.css` — Tailwind v4 configuration and global styles

## Tech Stack
| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19 |
| **Styling** | Tailwind CSS v4 |
| **Architecture** | Serverless API routes simulating a TEE enclave |
| **Data Format** | DIDs (`did:t3n:...`), T3 tokens, Cryptographic Attestations |

## Key Rules
- **Frontend** = ESM (`import`), Next.js 16, React 19, Tailwind v4.
- **Client Components** = Must use `"use client";` at the very top if using hooks (e.g., `useState`, `useEffect`).
- **Colors & Aesthetics** = Slate background (`bg-slate-950`), Emerald/Teal accents for success (`emerald-500`), Amber for pending/warnings (`amber-500`), Rose for errors/refunds (`rose-500`), and Indigo for intermediate actions. Dark mode, glassmorphism UI.
- **Enclave Simulation** = The UI acts as a frontend to a TEE node. Actions like "release" are conceptually "Signed inside the TDX enclave" and emit settlement references/proofs.

## Critical Patterns
- `params` in Next.js 16 route handlers and pages is a **Promise** — you must `await` it.
- Initialize component state with lazy initializers or standard `useState`, avoid `setState` in `useEffect` when possible to prevent double renders.
- Never use floating point for T3 tokens where absolute precision is required (though UI uses standard `number` for simplicity in the demo).
