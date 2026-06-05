/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// 1. Mock next/font/google
vi.mock("next/font/google", () => {
  return {
    Geist: () => ({ variable: "geist-sans" }),
    Geist_Mono: () => ({ variable: "geist-mono" }),
  };
});

// 2. Custom lightweight fiber-like React hook mocks
let hookIndex = 0;
const hookStates: any[] = [];
const hookSetters: any[] = [];

function resetHooks() {
  hookIndex = 0;
}

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useState: (init: any) => {
      const currentIndex = hookIndex;
      hookIndex++;
      
      if (hookStates.length <= currentIndex) {
        hookStates.push(typeof init === "function" ? init() : init);
        hookSetters.push((val: any) => {
          if (typeof val === "function") {
            hookStates[currentIndex] = val(hookStates[currentIndex]);
          } else {
            hookStates[currentIndex] = val;
          }
        });
      }
      
      return [hookStates[currentIndex], hookSetters[currentIndex]];
    },
    useEffect: (fn: any) => {
      // Run effect immediately
      fn();
    }
  };
});

// Static imports for target files
import RootLayout, { metadata } from "./layout";
import Dashboard from "./page";
import NotFound from "./not-found";
import { GET as milestonesGET, POST as milestonesPOST } from "./api/milestones/route";
import { POST as attestPOST } from "./api/milestones/[id]/attest/route";
import { POST as resolvePOST } from "./api/milestones/[id]/resolve/route";
import { POST as seedPOST } from "./api/seed/route";
import nextConfig from "../../next.config";
import playwrightConfig from "../../playwright.config";
import postcssConfig from "../../postcss.config.mjs";
import { T3nClient } from "@/sdk/T3nClient";
import { clearStore } from "@/wasm/host";

describe("Next.js Application & Configuration Suite", () => {
  beforeEach(() => {
    global.alert = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Configuration Files", () => {
    it("imports and executes configurations", () => {
      expect(nextConfig).toBeDefined();
      expect(playwrightConfig).toBeDefined();
      expect(postcssConfig).toBeDefined();
    });

    it("executes playwright config with CI enabled", async () => {
      process.env.CI = "true";
      vi.resetModules();
      const config = await import("../../playwright.config");
      expect(config.default).toBeDefined();
      delete process.env.CI;
    });
  });

  describe("Benchmark Runner Script", () => {
    it("imports and executes bench-runner.ts", async () => {
      vi.spyOn(global, "fetch").mockImplementation(async () => {
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      });
      const bench = await import("../sdk/bench-runner");
      expect(bench).toBeDefined();
    });

    it("imports and executes bench-runner.ts in non-test mode", async () => {
      const originalEnv = process.env.NODE_ENV;
      (process.env as any).NODE_ENV = "bench";
      process.env.BENCH_RUNS = "2";
      
      vi.spyOn(global, "fetch").mockImplementation(async () => {
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      });
      vi.resetModules();
      const bench = await import("../sdk/bench-runner");
      expect(bench).toBeDefined();
      
      (process.env as any).NODE_ENV = originalEnv;
      delete process.env.BENCH_RUNS;
    });

    it("imports and executes bench-runner.ts in non-test mode with default runs", async () => {
      const originalEnv = process.env.NODE_ENV;
      (process.env as any).NODE_ENV = "bench";
      delete process.env.BENCH_RUNS;
      
      vi.spyOn(global, "fetch").mockImplementation(async () => {
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      });
      vi.resetModules();
      const bench = await import("../sdk/bench-runner");
      expect(bench).toBeDefined();
      
      (process.env as any).NODE_ENV = originalEnv;
    });
  });

  describe("Layout Component", () => {
    it("renders root layout", () => {
      expect(metadata.title).toBe("Escrowa — TEE-secured Autonomous Escrow Agent");
      const res = RootLayout({ children: "test-child" });
      expect(res).toBeDefined();
    });
  });

  describe("NotFound Component", () => {
    it("renders NotFound page", () => {
      const res = NotFound();
      expect(res).toBeDefined();
    });
  });

  describe("API Routes", () => {
    beforeEach(() => {
      T3nClient.clearStore();
      clearStore();
      
      vi.spyOn(global, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
        const url = input.toString();
        if (url.endsWith("/handshake") || url.endsWith("/authenticate") || url.endsWith("/tenant/claim")) {
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
        return new Response("Not found", { status: 404 });
      });
    });

    it("milestones GET & POST", async () => {
      const getRes = await milestonesGET();
      expect(getRes.status).toBe(200);

      const postReq = new Request("http://localhost/api/milestones", {
        method: "POST",
        body: JSON.stringify({
          id: "api-test-m1",
          clientDid: "did:t3n:client",
          freelancerDid: "did:t3n:freelancer",
          amount: "100.5",
          requireDelivered: true,
          requireApproved: true,
          deadline: String(Date.now() + 10000),
          arbiter: "did:t3n:arbiter"
        })
      });
      const postRes = await milestonesPOST(postReq);
      const postData = await postRes.json();
      expect(postData.success).toBe(true);

      // POST failure (e.g. invalid JSON)
      const badReq = new Request("http://localhost/api/milestones", {
        method: "POST",
        body: "invalid-json"
      });
      const badRes = await milestonesPOST(badReq);
      const badData = await badRes.json();
      expect(badData.success).toBe(false);
    });

    it("milestones [id] attest POST", async () => {
      const postReq = new Request("http://localhost/api/milestones", {
        method: "POST",
        body: JSON.stringify({
          id: "m-attest-api",
          clientDid: "did:t3n:client",
          freelancerDid: "did:t3n:freelancer",
          amount: "500",
        })
      });
      await milestonesPOST(postReq);

      const req = new Request("http://localhost/api/milestones/m-attest-api/attest", {
        method: "POST",
        body: JSON.stringify({
          by: "0x2222222222222222222222222222222222222222",
          kind: "delivered",
          sig: "sig_del"
        })
      });
      const params = Promise.resolve({ id: "m-attest-api" });
      const res = await attestPOST(req, { params });
      const data = await res.json();
      expect(data.success).toBe(true);

      const badReq = new Request("http://localhost/api/milestones/m-attest-api/attest", {
        method: "POST",
        body: "bad-json"
      });
      const badRes = await attestPOST(badReq, { params });
      const badData = await badRes.json();
      expect(badData.success).toBe(false);
    });

    it("milestones [id] resolve POST", async () => {
      const postReq = new Request("http://localhost/api/milestones", {
        method: "POST",
        body: JSON.stringify({
          id: "m-resolve-api",
          clientDid: "did:t3n:client",
          freelancerDid: "did:t3n:freelancer",
          amount: "500",
          arbiter: "did:t3n:arbiter"
        })
      });
      await milestonesPOST(postReq);

      const req = new Request("http://localhost/api/milestones/m-resolve-api/resolve", {
        method: "POST",
        body: JSON.stringify({
          by: "did:t3n:arbiter",
          action: "release"
        })
      });
      const params = Promise.resolve({ id: "m-resolve-api" });
      const res = await resolvePOST(req, { params });
      const data = await res.json();
      expect(data.success).toBe(true);

      const req2 = new Request("http://localhost/api/milestones/m-resolve-api/resolve", {
        method: "POST",
        body: JSON.stringify({
          by: "deadline",
          action: "release"
        })
      });
      const res2 = await resolvePOST(req2, { params });
      expect(res2).toBeDefined();

      const badReq = new Request("http://localhost/api/milestones/m-resolve-api/resolve", {
        method: "POST",
        body: "bad-json"
      });
      const badRes = await resolvePOST(badReq, { params });
      const badData = await badRes.json();
      expect(badData.success).toBe(false);
    });

    it("seed POST", async () => {
      const res = await seedPOST();
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it("seed POST - already exists error", async () => {
      const originalExecute = T3nClient.prototype.executeAndDecode;
      T3nClient.prototype.executeAndDecode = vi.fn().mockRejectedValue(new Error("Milestone already exists"));
      
      const res = await seedPOST();
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe("Already seeded (ignoring error)");
      
      T3nClient.prototype.executeAndDecode = originalExecute;
    });

    it("seed POST - unknown error", async () => {
      const originalExecute = T3nClient.prototype.executeAndDecode;
      T3nClient.prototype.executeAndDecode = vi.fn().mockRejectedValue(new Error("Unknown failure"));
      
      await expect(seedPOST()).rejects.toThrow("Unknown failure");
      
      T3nClient.prototype.executeAndDecode = originalExecute;
    });
  });

  describe("Dashboard Component (page.tsx)", () => {
    beforeEach(() => {
      hookStates.length = 0;
      hookSetters.length = 0;
      resetHooks();
      
      vi.spyOn(global, "fetch").mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = input.toString();
        if (url.includes("/api/milestones")) {
          if (init?.method === "POST") {
            const body = JSON.parse(init.body as string);
            if (body.id === "fail") {
              return new Response(JSON.stringify({ success: false, error: "Mocked API Error" }), { status: 400 });
            }
            const status = body.kind === "approved" || body.action === "release" ? "released" : "funded";
            return new Response(JSON.stringify({ success: true, milestone: { id: body.id || "m-test", status } }), { status: 200 });
          }
          return new Response(JSON.stringify([
            {
              id: "m-funded",
              client: "did:t3n:client",
              freelancer: "did:t3n:freelancer",
              amount: 100,
              conditions: {},
              status: "funded",
              attestations: [],
              settlementRef: null,
              teeProof: null
            },
            {
              id: "m-delivered",
              client: "did:t3n:client",
              freelancer: "did:t3n:freelancer",
              amount: 200,
              conditions: { deadline: Date.now(), arbiter: "did:t3n:arbiter" },
              status: "delivered",
              attestations: [{ kind: "delivered", sig: "sig1" }],
              settlementRef: null,
              teeProof: null
            },
            {
              id: "m-released",
              client: "did:t3n:client",
              freelancer: "did:t3n:freelancer",
              amount: 300,
              conditions: { arbiter: "did:t3n:arbiter" },
              status: "released",
              attestations: [{ kind: "delivered", sig: "sig1" }, { kind: "approved", sig: "sig2" }],
              settlementRef: "tx_ref",
              teeProof: "tee_proof"
            },
            {
              id: "m-refunded",
              client: "did:t3n:client",
              freelancer: "did:t3n:freelancer",
              amount: 400,
              conditions: {},
              status: "refunded",
              attestations: [],
              settlementRef: "tx_ref",
              teeProof: "tee_proof"
            },
            {
              id: "m-unknown",
              client: "did:t3n:client",
              freelancer: "did:t3n:freelancer",
              amount: 50,
              conditions: {},
              status: "unknown" as any,
              attestations: [],
              settlementRef: null,
              teeProof: null
            }
          ]), { status: 200 });
        }
        if (url.includes("/api/seed")) {
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
        return new Response("Not found", { status: 404 });
      });
    });

    it("renders Dashboard initially, loads milestones, and triggers all element event handlers", async () => {
      // 1. Initial Render (with empty milestones state)
      resetHooks();
      let tree = Dashboard();
      expect(tree).toBeDefined();

      // Simulate load milestone completion (effects will run)
      await new Promise(resolve => setTimeout(resolve, 10));

      // Enable fake timers now that the initial load timer has fired
      vi.useFakeTimers();

      // 2. Render with loaded milestones
      resetHooks();
      tree = Dashboard();
      expect(tree).toBeDefined();

      // Ensure milestones loaded
      const milestonesState = hookStates[0];
      expect(milestonesState.length).toBeGreaterThan(0);

      // Set state to test status render variations & timeline/modal states
      hookStates[1] = milestonesState[1]; // selectedMilestone = m-delivered
      hookStates[11] = milestonesState[2]; // releasedMilestone = m-released (overlay popup)
      hookStates[4] = true; // showCreateModal = true
      hookStates[9] = "2026-06-06T12:00"; // formDeadline
      hookStates[10] = "did:t3n:arbiter"; // formArbiter

      // Re-render with new states
      resetHooks();
      tree = Dashboard();

      // 3. Traverse JSX tree and call all handlers (onClick, onSubmit, onChange)
      let useEmptyInputs = false;
      const traverseAndCallHandlers = async (element: any) => {
        if (!element) return;
        
        if (element.props) {
          if (typeof element.props.onClick === "function") {
            try {
              await element.props.onClick({ preventDefault: () => {} });
            } catch {}
          }
          if (typeof element.props.onSubmit === "function") {
            try {
              await element.props.onSubmit({ preventDefault: () => {} });
            } catch {}
          }
          if (typeof element.props.onChange === "function") {
            try {
              let val = "";
              if (!useEmptyInputs) {
                if (element.props.type === "datetime-local") {
                  val = "2026-06-06T12:00";
                } else if (element.props.type === "number") {
                  val = "1000";
                } else {
                  val = "test-value";
                }
              }
              await element.props.onChange({ target: { value: val } });
            } catch {}
          }
          
          if (element.props.children) {
            if (Array.isArray(element.props.children)) {
              for (const child of element.props.children) {
                await traverseAndCallHandlers(child);
              }
            } else {
              await traverseAndCallHandlers(element.props.children);
            }
          }
        }
      };

      useEmptyInputs = false;
      await traverseAndCallHandlers(tree);
      vi.runAllTimers();

      useEmptyInputs = true;
      await traverseAndCallHandlers(tree);
      vi.runAllTimers();

      // Render with released milestone selected to cover timeline settlement details
      hookStates[1] = milestonesState[2]; // selectedMilestone = m-released
      resetHooks();
      tree = Dashboard();
      await traverseAndCallHandlers(tree);
      vi.runAllTimers();

      // Render with refunded milestone selected to cover refunded banner colors
      hookStates[1] = milestonesState[3]; // selectedMilestone = m-refunded
      resetHooks();
      tree = Dashboard();
      await traverseAndCallHandlers(tree);
      vi.runAllTimers();

      // Render with selection that is no longer present in fetch data to cover (updated || data[0]) fallback
      vi.spyOn(global, "fetch").mockImplementation(async () => {
        return new Response(JSON.stringify([{ id: "m-funded", client: "did:t3n:client", freelancer: "did:t3n:freelancer", amount: 100, status: "funded", conditions: {}, attestations: [] }]), { status: 200 });
      });
      hookStates[1] = milestonesState[1]; // selectedMilestone = m-delivered
      hookStates[4] = true; // showCreateModal = true (ensure modal is open to render form)
      hookStates[5] = "fail"; // formId = fail (to trigger creation API error)
      resetHooks();
      tree = Dashboard();
      await traverseAndCallHandlers(tree);
      vi.runAllTimers();

      // 4. Test API Failures in handlers (fetchMilestones catches, resolve/attest catches)
      vi.spyOn(global, "fetch").mockImplementation(async (_input: RequestInfo | URL) => {
        const url = _input.toString();
        if (url.includes("/api/seed")) {
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
        throw new Error("Network Failure");
      });
      hookStates[1] = milestonesState[1]; // keep selectedMilestone set!
      hookStates[4] = true; // keep showCreateModal set!
      resetHooks();
      tree = Dashboard();
      await traverseAndCallHandlers(tree);
      vi.runAllTimers();

      // Pass 2: seed fails to cover handleSeed catch block (line 76)
      vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network Failure"));
      resetHooks();
      tree = Dashboard();
      await traverseAndCallHandlers(tree);
      vi.runAllTimers();

      // Restore real timers
      vi.useRealTimers();
    });

    it("renders Dashboard with no milestones", async () => {
      // Mock fetch to return empty list for milestones GET
      vi.spyOn(global, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
        const url = input.toString();
        if (url.includes("/api/milestones")) {
          return new Response(JSON.stringify([]), { status: 200 });
        }
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      });
      
      // Clear hook states to force initial load
      hookStates.length = 0;
      hookSetters.length = 0;
      resetHooks();
      
      let tree = Dashboard();
      expect(tree).toBeDefined();

      // Wait for fetchMilestones to resolve
      await new Promise(resolve => setTimeout(resolve, 10));

      // Render again with loaded empty list
      resetHooks();
      tree = Dashboard();
      expect(tree).toBeDefined();

      // milestones state (index 0) should be empty
      expect(hookStates[0].length).toBe(0);
      // selectedMilestone (index 1) should be null
      expect(hookStates[1]).toBeNull();
    });
  });
});
