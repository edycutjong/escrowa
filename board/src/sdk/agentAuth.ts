/**
 * Simulated Terminal 3 `agent-auth` host interface.
 *
 * Mirrors T3N's delegation model: a data owner grants an agent a scope made of
 * allowed `functions` plus an `allowedHosts` egress allowlist. Enforcement happens
 * at the host layer — an agent that calls a function or reaches a host outside its
 * grant is blocked (it literally cannot exceed its delegation). Unauthorized egress
 * fails with `host/http.egress_denied`, matching the platform's error contract.
 *
 * In this hackathon build the enforcement is simulated in-process (see the
 * "Hackathon Simulation Context" note in README.md); the same scope model maps
 * directly onto the production `agent-auth` host interface.
 */

export type AgentScope = {
  /** Function names the agent is permitted to invoke. */
  functions: string[];
  /** Hostnames the agent is permitted to reach (egress allowlist). */
  allowedHosts: string[];
};

/** did:t3n identity of the Escrowa release agent. */
export const ESCROWA_AGENT_DID = "did:t3n:escrowa-agent";

/** Settlement endpoint the contract's `outbox` posts payouts to. */
export const SETTLEMENT_URL = "https://api.terminal3.io/v1/outbox";

/**
 * Least-privilege scope Escrowa is provisioned with: it may only run the escrow
 * lifecycle functions and may only reach the settlement host. Notably it is NOT
 * granted any other function or host, so a compromised agent cannot exfiltrate
 * funds or data elsewhere.
 */
export const ESCROWA_DEFAULT_SCOPE: AgentScope = {
  functions: ["create-milestone", "submit-attestation", "resolve-milestone"],
  allowedHosts: ["api.terminal3.io"],
};

const grants = new Map<string, AgentScope>();

/** `agent-auth-update`: a data owner delegates/updates an agent's scope. */
export function updateAgentAuth(agentDid: string, scope: AgentScope): void {
  grants.set(agentDid, scope);
}

/** Read an agent's currently granted scope, if any. */
export function getAgentScope(agentDid: string): AgentScope | undefined {
  return grants.get(agentDid);
}

/** Idempotently provision Escrowa's default least-privilege grant. */
export function ensureEscrowaProvisioned(): void {
  if (!grants.has(ESCROWA_AGENT_DID)) {
    updateAgentAuth(ESCROWA_AGENT_DID, ESCROWA_DEFAULT_SCOPE);
  }
}

/** Host-layer check: the agent may only invoke functions inside its grant. */
export function assertFunctionAllowed(agentDid: string, functionName: string): void {
  const scope = grants.get(agentDid);
  if (!scope || !scope.functions.includes(functionName)) {
    throw new Error(
      `host/agent.function_denied: agent ${agentDid} is not authorized to call ${functionName}`,
    );
  }
}

/** Host-layer check: outbound egress is restricted to the agent's allowlist. */
export function assertEgressAllowed(agentDid: string, url: string): void {
  const scope = grants.get(agentDid);
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error(`host/http.egress_denied: malformed url ${url}`);
  }
  if (!scope || !scope.allowedHosts.includes(host)) {
    throw new Error(
      `host/http.egress_denied: agent ${agentDid} is not allowed to reach ${host}`,
    );
  }
}

/** Test/seed helper: drop all grants. */
export function clearGrants(): void {
  grants.clear();
}
