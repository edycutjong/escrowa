# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1.0 | :x:                |

## Reporting a Vulnerability

We take the security of Escrowa seriously, especially given its role as an autonomous escrow agent operating within Trusted Execution Environments (TEEs).

If you discover a security vulnerability within Escrowa, please do not disclose it publicly. Instead, please report it via private disclosure:

1. Go to the [Security Advisories](../../security/advisories) tab on GitHub.
2. Click **Report a vulnerability**.
3. Provide a detailed description of the vulnerability, including steps to reproduce it and any potential impact on the TEE simulation or contract execution.

We will endeavor to respond to your report within 48 hours and work with you to remediate the issue responsibly.

## Scope

The following areas are in scope for security reports:
- The Next.js frontend (`board/`)
- The Rust WASM Smart Contract logic (`contract/`)
- Upstash Redis State Manipulation vectors
- Authentication and DID simulation bypasses

Thank you for helping keep Escrowa secure!
