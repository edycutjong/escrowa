import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { registerDid, registerAgent, resolveDid, listDids, clearRegistry } from "./didRegistry";

describe("did-registry / agent-registry host interfaces (didRegistry.ts)", () => {
  beforeEach(() => clearRegistry());
  afterEach(() => clearRegistry());

  it("registers and resolves party DIDs", () => {
    registerDid("did:t3n:0xclient", "0xclient");
    const rec = resolveDid("did:t3n:0xclient");
    expect(rec?.authenticator).toBe("0xclient");
    expect(rec?.agentUri).toBeUndefined();
    expect(resolveDid("did:t3n:missing")).toBeUndefined();
  });

  it("publishes an agent URI for a fresh DID and for an existing DID", () => {
    // Fresh DID (no prior registerDid) -> creates record
    const fresh = registerAgent("did:t3n:fresh-agent", "https://a.example/agent");
    expect(fresh.authenticator).toBe("did:t3n:fresh-agent");
    expect(fresh.agentUri).toBe("https://a.example/agent");

    // Existing DID -> preserves authenticator, adds agentUri
    registerDid("did:t3n:existing", "0xexisting");
    const updated = registerAgent("did:t3n:existing", "https://b.example/agent");
    expect(updated.authenticator).toBe("0xexisting");
    expect(updated.agentUri).toBe("https://b.example/agent");

    expect(listDids().length).toBe(2);
  });
});
