import { describe, it, expect, afterEach } from "vitest";
import {
  ESCROWA_AGENT_DID,
  ESCROWA_DEFAULT_SCOPE,
  SETTLEMENT_URL,
  updateAgentAuth,
  getAgentScope,
  ensureEscrowaProvisioned,
  assertFunctionAllowed,
  assertEgressAllowed,
  clearGrants,
} from "./agentAuth";

describe("agent-auth host interface (agentAuth.ts)", () => {
  // Never restrict the Escrowa agent's own grant here — other suites rely on it.
  // We assert against throwaway DIDs or with non-mutating checks, then restore.
  afterEach(() => {
    clearGrants();
    ensureEscrowaProvisioned();
  });

  it("provisions Escrowa's least-privilege default scope idempotently", () => {
    clearGrants();
    expect(getAgentScope(ESCROWA_AGENT_DID)).toBeUndefined();

    ensureEscrowaProvisioned(); // first call: grant is missing -> provisions
    const scope = getAgentScope(ESCROWA_AGENT_DID);
    expect(scope).toEqual(ESCROWA_DEFAULT_SCOPE);
    expect(scope?.functions).toContain("resolve-milestone");

    ensureEscrowaProvisioned(); // second call: grant exists -> no-op
    expect(getAgentScope(ESCROWA_AGENT_DID)).toEqual(ESCROWA_DEFAULT_SCOPE);
  });

  it("allows functions inside the grant and denies those outside it", () => {
    ensureEscrowaProvisioned();
    // Allowed
    expect(() => assertFunctionAllowed(ESCROWA_AGENT_DID, "create-milestone")).not.toThrow();
    // Granted but function not listed
    updateAgentAuth("did:t3n:limited-agent", { functions: ["create-milestone"], allowedHosts: [] });
    expect(() => assertFunctionAllowed("did:t3n:limited-agent", "resolve-milestone")).toThrow(
      "host/agent.function_denied",
    );
    // No grant at all -> denied
    expect(() => assertFunctionAllowed("did:t3n:unknown-agent", "create-milestone")).toThrow(
      "host/agent.function_denied",
    );
  });

  it("enforces the egress allowlist with host/http.egress_denied", () => {
    ensureEscrowaProvisioned();
    // Allowed settlement host
    expect(() => assertEgressAllowed(ESCROWA_AGENT_DID, SETTLEMENT_URL)).not.toThrow();
    // Disallowed host
    expect(() => assertEgressAllowed(ESCROWA_AGENT_DID, "https://evil.example.com/exfil")).toThrow(
      "host/http.egress_denied",
    );
    // Malformed URL
    expect(() => assertEgressAllowed(ESCROWA_AGENT_DID, "not-a-valid-url")).toThrow(
      "host/http.egress_denied",
    );
    // No grant at all -> denied
    expect(() => assertEgressAllowed("did:t3n:unknown-agent", SETTLEMENT_URL)).toThrow(
      "host/http.egress_denied",
    );
  });
});
