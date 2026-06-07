/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { useAccount, useDisconnect, useSignMessage } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { buildAttestationSig } from "@/sdk/wallet";

type Milestone = {
  id: string;
  client: string;
  freelancer: string;
  amount: number;
  conditions: {
    requireDelivered: boolean;
    requireApproved: boolean;
    deadline?: number;
    arbiter?: string;
  };
  status: "funded" | "delivered" | "released" | "refunded";
  attestations: {
    milestoneId: string;
    by: string;
    kind: "delivered" | "approved";
    sig: string;
    ts: number;
  }[];
  settlementRef: string | null;
  teeProof: string | null;
};

export default function Dashboard() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Milestone Form State
  const [formId, setFormId] = useState("");
  const [formAmount, setFormAmount] = useState("1000");
  const [formClient, setFormClient] = useState("did:t3n:0x1111111111111111111111111111111111111111");
  const [formFreelancer, setFormFreelancer] = useState("did:t3n:0x2222222222222222222222222222222222222222");
  const [formDeadline, setFormDeadline] = useState("");
  const [formArbiter, setFormArbiter] = useState("");

  // Animation takeover state
  const [releasedMilestone, setReleasedMilestone] = useState<Milestone | null>(null);

  // Real wallet via wagmi + RainbowKit (supports MetaMask, WalletConnect, Coinbase, …).
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();

  const fetchMilestones = async () => {
    try {
      const res = await fetch("/api/milestones");
      const data = await res.json();
      setMilestones(data);
      // Auto-select first or update current selection
      if (data.length > 0) {
        if (selectedMilestone) {
          const updated = data.find((m: Milestone) => m.id === selectedMilestone.id);
          setSelectedMilestone(updated || data[0]);
        } else {
          setSelectedMilestone(data[0]);
        }
      } else {
        setSelectedMilestone(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await fetch("/api/seed", { method: "POST" });
      await fetchMilestones();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSeeding(false);
    }
  };

  useEffect(() => {
    handleSeed();
  }, []);

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: formId || `m-custom-${Date.now().toString().slice(-4)}`,
          clientDid: formClient,
          freelancerDid: formFreelancer,
          amount: formAmount,
          requireDelivered: true,
          requireApproved: true,
          deadline: formDeadline ? new Date(formDeadline).getTime() : undefined,
          arbiter: formArbiter || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setFormId("");
        setFormAmount("1000");
        setFormDeadline("");
        setFormArbiter("");
        await fetchMilestones();
      } else {
        alert("Error: " + data.error);
      }
    } catch (err: any) {
      alert("Error creating milestone: " + err.message);
    }
  };

  const handleAttest = async (milestoneId: string, kind: "delivered" | "approved") => {
    const by = kind === "delivered" ? selectedMilestone?.freelancer : selectedMilestone?.client;
    const fallbackSig = `sig_${kind === "delivered" ? "freelancer" : "client"}_${Date.now()}`;

    try {
      // Real wallet signature when connected; simulated fallback for the seeded demo.
      const { sig, signer } = await buildAttestationSig(address, signMessageAsync, { milestoneId, kind, by }, fallbackSig);
      const res = await fetch(`/api/milestones/${milestoneId}/attest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ by, kind, sig, signer }),
      });
      const data = await res.json();
      if (data.success) {
        // If this attestation triggered the release
        if (data.milestone.status === "released") {
          setReleasedMilestone(data.milestone);
          // Auto-hide animation after 5 seconds
          setTimeout(() => setReleasedMilestone(null), 6000);
        }
        await fetchMilestones();
      } else {
        alert("Error: " + data.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleResolve = async (milestoneId: string, by: string, action: "release" | "refund") => {
    try {
      const res = await fetch(`/api/milestones/${milestoneId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ by, action }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.milestone.status === "released") {
          setReleasedMilestone(data.milestone);
          setTimeout(() => setReleasedMilestone(null), 6000);
        }
        await fetchMilestones();
      } else {
        alert("Error: " + data.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "funded":
        return "bg-slate-700/80 border border-slate-600 text-slate-200";
      case "delivered":
        return "bg-amber-500/20 border border-amber-500/40 text-amber-300";
      case "released":
        return "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300";
      case "refunded":
        return "bg-rose-500/20 border border-rose-500/40 text-rose-300";
      default:
        return "bg-slate-700 text-slate-300";
    }
  };

  const getStatusBar = (status: string) => {
    switch (status) {
      case "funded":
        return "from-slate-500 to-slate-600";
      case "delivered":
        return "from-amber-400 to-amber-500";
      case "released":
        return "from-emerald-400 to-teal-500";
      case "refunded":
        return "from-rose-400 to-rose-500";
      default:
        return "from-slate-600 to-slate-700";
    }
  };

  return (
    <div className="relative min-h-screen text-slate-100 font-sans flex flex-col selection:bg-emerald-500 selection:text-slate-900 overflow-x-hidden w-full">

      {/* AMBIENT BACKDROP — animated aurora + blueprint grid */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="grid-overlay absolute inset-0 opacity-[0.06]" />
        <div className="absolute -top-48 -left-40 w-2xl h-168 rounded-full blur-3xl animate-aurora bg-[radial-gradient(circle,rgba(16,185,129,0.20),transparent_60%)]" />
        <div className="absolute top-1/4 -right-48 w-160 h-160 rounded-full blur-3xl animate-aurora [animation-delay:-7s] bg-[radial-gradient(circle,rgba(20,184,166,0.16),transparent_60%)]" />
        <div className="absolute -bottom-48 left-1/3 w-xl h-144 rounded-full blur-3xl animate-aurora [animation-delay:-14s] bg-[radial-gradient(circle,rgba(99,102,241,0.12),transparent_60%)]" />
      </div>

      {/* HEADER */}
      <header className="border-b border-slate-800 bg-slate-900/40 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="relative shrink-0">
              <div aria-hidden className="absolute inset-0 rounded-xl bg-emerald-500/40 blur-md animate-glow" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon.svg" alt="Escrowa Logo" className="relative w-10 h-10 object-contain" />
            </div>
            <div>
              <span className="font-display font-bold tracking-wide text-lg text-gradient">
                Escrowa
              </span>
              <div className="text-xxs text-slate-400 font-mono flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                did:t3n:escrowa_enclave
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={handleSeed}
              disabled={isSeeding}
              className="px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 transition duration-200 text-xs sm:text-sm font-medium border border-slate-700 flex items-center gap-2 cursor-pointer disabled:opacity-50 hover:scale-[1.03] active:scale-95"
            >
              {isSeeding ? "Resetting..." : <><span className="hidden sm:inline">Reset & </span>Seed</>}
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-linear-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 transition duration-200 text-slate-950 font-semibold text-xs sm:text-sm shadow-lg shadow-emerald-500/30 hover:shadow-emerald-400/40 cursor-pointer hover:scale-[1.03] active:scale-95"
            >
              + Create<span className="hidden sm:inline"> Milestone</span>
            </button>

            {/* Wallet control — pinned far right */}
            <span aria-hidden className="hidden sm:block w-px h-6 bg-slate-800" />
            {address ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-mono">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {address.slice(0, 6)}…{address.slice(-4)}
                </span>
                <button
                  onClick={() => disconnect()}
                  className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-rose-300 hover:border-rose-500/40 text-xs sm:text-sm font-semibold transition duration-200 cursor-pointer hover:scale-[1.03] active:scale-95"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={openConnectModal}
                className="px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 text-xs sm:text-sm font-semibold transition duration-200 cursor-pointer hover:scale-[1.03] active:scale-95 flex items-center gap-2"
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400" />
                <span className="hidden sm:inline">Connect </span>Wallet
              </button>
            )}
          </div>
        </div>
      </header>

      {/* DASHBOARD STATS */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 w-full mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="group relative overflow-hidden bg-slate-900/40 border border-slate-800 p-6 rounded-2xl backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/10 animate-fade-in-up">
          <div aria-hidden className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-emerald-500/10 blur-2xl opacity-0 group-hover:opacity-100 transition duration-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Value Secured</span>
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm">🔒</span>
          </div>
          <div className="text-4xl font-bold mt-3 text-gradient tracking-tight">
            {milestones.filter(m => m.status === "funded" || m.status === "delivered").reduce((acc, m) => acc + m.amount, 0).toLocaleString()} <span className="text-slate-400 text-lg font-mono">T3</span>
          </div>
          <span className="text-xs text-slate-500 mt-2 block">Locked under contract logic (simulated enclave)</span>
        </div>
        <div className="group relative overflow-hidden bg-slate-900/40 border border-slate-800 p-6 rounded-2xl backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/10 animate-fade-in-up [animation-delay:80ms]">
          <div aria-hidden className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-emerald-500/10 blur-2xl opacity-0 group-hover:opacity-100 transition duration-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Released Payouts</span>
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm">💸</span>
          </div>
          <div className="text-4xl font-bold mt-3 text-gradient tracking-tight">
            {milestones.filter(m => m.status === "released").reduce((acc, m) => acc + m.amount, 0).toLocaleString()} <span className="text-slate-400 text-lg font-mono">T3</span>
          </div>
          <span className="text-xs text-slate-500 mt-2 block">Settled with exactly-once outbox delivery</span>
        </div>
        <div className="group relative overflow-hidden bg-slate-900/40 border border-slate-800 p-6 rounded-2xl backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/10 animate-fade-in-up [animation-delay:160ms]">
          <div aria-hidden className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-amber-500/10 blur-2xl opacity-0 group-hover:opacity-100 transition duration-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Milestones</span>
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">⏳</span>
          </div>
          <div className="text-4xl font-bold mt-3 text-amber-400 tracking-tight">
            {milestones.filter(m => m.status === "funded" || m.status === "delivered").length}
          </div>
          <span className="text-xs text-slate-500 mt-2 block">Pending dual-attestation signatures</span>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 w-full flex-1 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* MILESTONE LIST */}
        <section className="lg:col-span-7 flex flex-col gap-4">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            Milestones
          </h2>

          {isLoading ? (
            <div className="py-20 text-center text-slate-400 font-medium">Loading enclaves...</div>
          ) : milestones.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-slate-800 rounded-2xl text-slate-500">
              No milestones found. Click &quot;Reset &amp; Seed Scenarios&quot; or create a custom one.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {milestones.map((m, i) => (
                <div
                  key={m.id}
                  onClick={() => setSelectedMilestone(m)}
                  style={{ animationDelay: `${i * 80}ms` }}
                  className={`animate-fade-in-up group relative overflow-hidden p-5 pl-6 rounded-2xl border transition duration-300 flex items-center justify-between cursor-pointer hover:-translate-y-0.5 ${
                    selectedMilestone?.id === m.id
                      ? "border-emerald-500/60 bg-slate-900/50 shadow-lg shadow-emerald-500/10"
                      : "border-slate-850 bg-slate-900/20 hover:border-slate-700 hover:shadow-lg hover:shadow-emerald-500/5"
                  }`}
                >
                  <span aria-hidden className={`absolute left-0 top-0 h-full w-1.5 bg-linear-to-b ${getStatusBar(m.status)}`} />
                  <div aria-hidden className="absolute inset-0 bg-linear-to-r from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition duration-300" />
                  <div className="relative flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-100">{m.id}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xxs font-semibold uppercase tracking-wider ${getStatusColor(m.status)}`}>
                        {m.status}
                      </span>
                    </div>
                    
                    <div className="text-xs text-slate-400 flex items-center gap-3">
                      <span>Client: <span className="font-mono text-slate-300">{m.client.slice(0, 10)}...</span></span>
                      <span>•</span>
                      <span>Freelancer: <span className="font-mono text-slate-300">{m.freelancer.slice(0, 10)}...</span></span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold font-mono text-slate-100">
                      {m.amount.toLocaleString()} <span className="text-slate-400 text-sm">T3</span>
                    </div>
                    <div className="text-xxs text-slate-500 mt-1">
                      {m.conditions.deadline ? "Deadline Gated" : m.conditions.arbiter ? "Arbiter Gated" : "Standard Rule"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* DETAILED VIEW & AUDIT */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          <h2 className="text-xl font-bold text-slate-100">Details & Audit</h2>
          
          {selectedMilestone ? (
            <div key={selectedMilestone.id} className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl flex flex-col gap-6">

              {/* HEADER INFO */}
              <div className="animate-fade-in-up">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-50">{selectedMilestone.id}</h3>
                  <span className="text-lg font-bold text-emerald-400 font-mono">
                    {selectedMilestone.amount} T3
                  </span>
                </div>
                
                <div className="text-xs text-slate-400 font-mono mt-3 space-y-1 bg-slate-950/60 p-3.5 rounded-xl border border-slate-850">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Client DID:</span>
                    <span className="text-slate-300">{selectedMilestone.client}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Freelancer DID:</span>
                    <span className="text-slate-300">{selectedMilestone.freelancer}</span>
                  </div>
                  {selectedMilestone.conditions.arbiter && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Arbiter DID:</span>
                      <span className="text-teal-400">{selectedMilestone.conditions.arbiter}</span>
                    </div>
                  )}
                  {selectedMilestone.conditions.deadline && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Deadline:</span>
                      <span className="text-amber-400">{new Date(selectedMilestone.conditions.deadline).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ACTION PANEL */}
              {selectedMilestone.status !== "released" && selectedMilestone.status !== "refunded" && (
                <div className="animate-fade-in-up [animation-delay:90ms] p-4 border border-slate-800 bg-slate-900/60 rounded-2xl flex flex-col gap-4">
                  <h4 className="text-sm font-bold text-slate-200">Enclave Settlement Actions</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    
                    {/* Deliver (Freelancer) */}
                    <button
                      onClick={() => handleAttest(selectedMilestone.id, "delivered")}
                      disabled={selectedMilestone.attestations.some(a => a.kind === "delivered")}
                      className="px-3 py-2 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-200 text-xs font-semibold border border-indigo-500/20 disabled:opacity-30 disabled:hover:bg-indigo-600/30 transition duration-200 cursor-pointer"
                    >
                      ✍️ Attest Delivery
                    </button>

                    {/* Approve (Client) */}
                    <button
                      onClick={() => handleAttest(selectedMilestone.id, "approved")}
                      disabled={selectedMilestone.attestations.some(a => a.kind === "approved")}
                      className="px-3 py-2 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-200 text-xs font-semibold border border-emerald-500/20 disabled:opacity-30 disabled:hover:bg-emerald-600/30 transition duration-200 cursor-pointer"
                    >
                      ✍️ Approve Payment
                    </button>

                  </div>

                  {/* Fallback actions (Ghost / Dispute) */}
                  {(selectedMilestone.conditions.deadline || selectedMilestone.conditions.arbiter) && (
                    <div className="border-t border-slate-800 pt-3 flex flex-col gap-2">
                      <span className="text-xxs text-slate-400 font-bold uppercase tracking-wider">Fallback / Escalation</span>
                      <div className="flex gap-2">
                        {selectedMilestone.conditions.deadline && (
                          <button
                            onClick={() => handleResolve(selectedMilestone.id, "deadline", "release")}
                            className="flex-1 px-2.5 py-1.5 rounded-md bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/20 text-amber-300 text-xxs font-medium transition duration-200 cursor-pointer text-center"
                          >
                            Resolve Deadline (Release)
                          </button>
                        )}
                        {selectedMilestone.conditions.arbiter && (
                          <div className="flex-1 flex gap-2">
                            <button
                              onClick={() => handleResolve(selectedMilestone.id, selectedMilestone.conditions.arbiter!, "release")}
                              className="flex-1 px-2 py-1.5 rounded-md bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/20 text-teal-300 text-xxs font-medium transition duration-200 cursor-pointer"
                            >
                              Arbiter Release
                            </button>
                            <button
                              onClick={() => handleResolve(selectedMilestone.id, selectedMilestone.conditions.arbiter!, "refund")}
                              className="flex-1 px-2 py-1.5 rounded-md bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/20 text-rose-300 text-xxs font-medium transition duration-200 cursor-pointer"
                            >
                              Arbiter Refund
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* AUDIT / PROOF TIMELINE */}
              <div className="animate-fade-in-up [animation-delay:180ms] flex flex-col gap-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Audit & Execution Proofs</span>
                
                <div className="relative border-l border-slate-800 ml-3.5 pl-6 space-y-6">
                  
                  {/* Step 1: Funded */}
                  <div className="relative animate-fade-in-up [animation-delay:220ms]">
                    <span className="absolute -left-9.5 top-0.5 bg-slate-900 border border-slate-800 text-slate-400 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono">
                      1
                    </span>
                    <h5 className="text-xs font-bold text-slate-200">Milestone Funded</h5>
                    <p className="text-xxs text-slate-400 mt-1">Tokens locked under contract control (simulated TEE vault).</p>
                  </div>

                  {/* Step 2: Delivery Attestation */}
                  <div className="relative animate-fade-in-up [animation-delay:300ms]">
                    <span className={`absolute -left-9.5 top-0.5 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono border ${
                      selectedMilestone.attestations.some(a => a.kind === "delivered")
                        ? "bg-indigo-950 border-indigo-500/50 text-indigo-400"
                        : "bg-slate-900 border-slate-800 text-slate-600"
                    }`}>
                      2
                    </span>
                    <h5 className="text-xs font-bold text-slate-200">Freelancer Delivery Attestation</h5>
                    {selectedMilestone.attestations.some(a => a.kind === "delivered") ? (
                      <div className="mt-1">
                        <p className="text-xxs text-emerald-400">✓ Delivered</p>
                        <div className="text-[10px] text-slate-500 font-mono mt-1 break-all bg-slate-950/60 p-2 rounded border border-slate-900">
                          Sig: {selectedMilestone.attestations.find(a => a.kind === "delivered")?.sig}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xxs text-slate-500 mt-1">Pending freelancer &quot;delivered&quot; attestation.</p>
                    )}
                  </div>

                  {/* Step 3: Approval Attestation */}
                  <div className="relative animate-fade-in-up [animation-delay:380ms]">
                    <span className={`absolute -left-9.5 top-0.5 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono border ${
                      selectedMilestone.attestations.some(a => a.kind === "approved")
                        ? "bg-emerald-950 border-emerald-500/50 text-emerald-400"
                        : "bg-slate-900 border-slate-800 text-slate-600"
                    }`}>
                      3
                    </span>
                    <h5 className="text-xs font-bold text-slate-200">Client Approval Attestation</h5>
                    {selectedMilestone.attestations.some(a => a.kind === "approved") ? (
                      <div className="mt-1">
                        <p className="text-xxs text-emerald-400">✓ Approved</p>
                        <div className="text-[10px] text-slate-500 font-mono mt-1 break-all bg-slate-950/60 p-2 rounded border border-slate-900">
                          Sig: {selectedMilestone.attestations.find(a => a.kind === "approved")?.sig}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xxs text-slate-500 mt-1">Pending client &quot;approved&quot; attestation.</p>
                    )}
                  </div>

                  {/* Step 4: Enclave Settlement */}
                  <div className="relative animate-fade-in-up [animation-delay:460ms]">
                    <span className={`absolute -left-9.5 top-0.5 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono border ${
                      selectedMilestone.status === "released" || selectedMilestone.status === "refunded"
                        ? "bg-emerald-500 text-slate-950 border-emerald-400"
                        : "bg-slate-900 border-slate-800 text-slate-600"
                    }`}>
                      ✓
                    </span>
                    <h5 className="text-xs font-bold text-slate-200">TEE Release & Outbox Settlement</h5>
                    {selectedMilestone.status === "released" || selectedMilestone.status === "refunded" ? (
                      <div className="mt-1 space-y-1.5">
                        <p className="text-xxs text-emerald-400">✓ Settled inside Enclave (simulated)</p>
                        <div className="text-[10px] text-slate-300 font-mono space-y-1 bg-slate-950/60 p-2.5 rounded border border-slate-900">
                          <div><span className="text-slate-500">Ref:</span> {selectedMilestone.settlementRef}</div>
                          <div className="truncate"><span className="text-slate-500">Proof:</span> {selectedMilestone.teeProof}</div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xxs text-slate-500 mt-1">Awaiting conditional release trigger.</p>
                    )}
                  </div>

                </div>
              </div>

            </div>
          ) : (
            <div className="bg-slate-900/10 border border-slate-850 p-12 text-center rounded-2xl text-slate-500">
              Select a milestone to view its execution timeline.
            </div>
          )}
        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-850 bg-slate-900/10 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 md:px-6 text-center text-slate-500 text-xs flex justify-between gap-4">
          <span>Terminal 3 Agent Dev Kit Bounty Challenge (beta)</span>
          <span className="font-mono">Simulated TEE Sandbox Node V0.4.9</span>
        </div>
      </footer>

      {/* CREATE MILESTONE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 flex flex-col gap-5">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-100">Create & Fund Milestone</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMilestone} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Milestone ID</label>
                <input
                  type="text"
                  placeholder="e.g. m-website-design"
                  value={formId}
                  onChange={(e) => setFormId(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Amount (T3 tokens)</label>
                <input
                  type="number"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Deadline Fallback (Optional)</label>
                <input
                  type="datetime-local"
                  value={formDeadline}
                  onChange={(e) => setFormDeadline(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Arbiter DID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. did:t3n:0x33333333..."
                  value={formArbiter}
                  onChange={(e) => setFormArbiter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="mt-2 w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 transition duration-200 text-slate-950 font-bold text-sm cursor-pointer shadow-md shadow-emerald-500/10"
              >
                Lock Tokens & Fund
              </button>
            </form>
          </div>
        </div>
      )}

      {/* RELEASE VAULT ANIMATION TAKEOVER */}
      {releasedMilestone && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in select-none overflow-hidden">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(16,185,129,0.18),transparent_60%)]" />
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            {[...Array(16)].map((_, i) => (
              <span
                key={i}
                className="absolute top-0 w-2 h-3 rounded-sm animate-confetti"
                style={{
                  left: `${(i * 6.3 + 4) % 100}%`,
                  background: ["#34d399", "#2dd4bf", "#fbbf24", "#818cf8", "#f472b6"][i % 5],
                  animationDelay: `${(i % 8) * 0.18}s`,
                  animationDuration: `${2 + (i % 5) * 0.35}s`,
                }}
              />
            ))}
          </div>
          <div className="relative text-center max-w-lg p-8 flex flex-col items-center gap-6">
            
            {/* Vault Graphic Icon */}
            <div className="relative w-40 h-40 flex items-center justify-center">
              {/* expanding pulse rings */}
              <div aria-hidden className="absolute inset-0 rounded-full border border-emerald-400/40 animate-ring" />
              <div aria-hidden className="absolute inset-0 rounded-full border border-teal-400/30 animate-ring [animation-delay:0.7s]" />
              {/* rotating shell */}
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500/60 bg-slate-900/80 shadow-2xl shadow-emerald-500/30 animate-spin-slow">
                <div className="absolute inset-2 border border-dashed border-slate-700 rounded-full" />
              </div>
              {/* glowing inner core */}
              <div className="relative w-16 h-16 rounded-xl bg-linear-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-slate-950 text-2xl shadow-lg shadow-emerald-400/50 animate-float">
                TEE
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="font-display text-3xl font-extrabold text-gradient animate-bounce tracking-wide">
                Milestone Released!
              </h2>
              <p className="text-slate-400 text-sm">
                Conditional release logic evaluated true inside the simulated enclave.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 w-full text-left font-mono text-xs space-y-2 mt-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Milestone:</span>
                <span className="text-slate-300">{releasedMilestone.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="text-emerald-400 font-bold">{releasedMilestone.amount} T3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">To Freelancer:</span>
                <span className="text-slate-300">{releasedMilestone.freelancer.slice(0, 18)}...</span>
              </div>
              <div className="border-t border-slate-850 pt-2 flex flex-col gap-1">
                <span className="text-slate-500 text-[10px]">Settlement Reference (Outbox · simulated):</span>
                <span className="text-teal-400 text-[10px] break-all select-all">{releasedMilestone.settlementRef}</span>
              </div>
            </div>

            <div className="text-xxs text-slate-500 italic mt-2">
              🔒 Signed via the simulated TDX enclave host — models production key custody (keys never leave the TEE). See README.
            </div>

            <button
              onClick={() => setReleasedMilestone(null)}
              className="mt-4 px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition text-sm font-semibold text-slate-200 cursor-pointer"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
