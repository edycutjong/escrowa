/**
 * Simulated Terminal 3 `did-registry` / `agent-registry` host interfaces.
 *
 * `did-registry` links an authenticator (e.g. an Ethereum address) to a
 * `did:t3n:` identity; `agent-registry` publishes an agent URI for a DID so the
 * agent is discoverable. In this hackathon build these are simulated in-process
 * (see the "Hackathon Simulation Context" note in README.md); the records map
 * directly onto the production registry host interfaces.
 */

export type DidRecord = {
  did: string;
  authenticator: string;
  /** Published agent URI (set via `agent-registry`), if this DID is an agent. */
  agentUri?: string;
};

const registry = new Map<string, DidRecord>();

/** `did-registry`: link an authenticator to a `did:t3n` identity. */
export function registerDid(did: string, authenticator: string): DidRecord {
  const record: DidRecord = { did, authenticator };
  registry.set(did, record);
  return record;
}

/** `agent-registry`: publish an agent URI for a DID (creating the DID if needed). */
export function registerAgent(did: string, agentUri: string): DidRecord {
  const existing = registry.get(did);
  const record: DidRecord = existing
    ? { ...existing, agentUri }
    : { did, authenticator: did, agentUri };
  registry.set(did, record);
  return record;
}

/** Resolve a DID to its registry record. */
export function resolveDid(did: string): DidRecord | undefined {
  return registry.get(did);
}

/** List every registered DID record. */
export function listDids(): DidRecord[] {
  return Array.from(registry.values());
}

/** Test/seed helper: drop all registrations. */
export function clearRegistry(): void {
  registry.clear();
}
