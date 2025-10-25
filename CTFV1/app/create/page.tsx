"use client";

import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import { web3, AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import { api } from "../../convex/_generated/api";
import { useMutation } from "convex/react";
import { verifyOrCreateUser } from "@/convex/myFunctions";
import { useAuth } from "@/app/providers/auth-context";
import idl from "@/target/idl/ctf_anchor.json";
import { CtfAnchor } from "@/target/types/ctf_anchor";
import "../globals.css";

const PROGRAM_ID = new web3.PublicKey(
  "GrTTrdzrLzGnLE1rDbxxv4xdZgQi7pNXGeMpb5TaYecF"
);

export default function Content() {
  const { publicKey, connected, signMessage } = useWallet();
  const { isSignedIn, setIsSignedIn } = useAuth();
  const addChallenge = useMutation(api.myFunctions.addChallenge);
  const verifyOrCreateUserMutation = useMutation(api.myFunctions.verifyOrCreateUser);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    flagSolution: "",
    prizeAmount: "",
    startDate: "",
    endDate: "",
    flagDetails: "",
    files: "",
    challengeType: "misc",
    flagFormat: "",
    hint: "",
    hintReleaseDate: "",
  });

  async function computeFlagSha256(flagString: string) {
    const enc = new TextEncoder();
    const data = enc.encode(flagString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(hashBuffer);
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = useCallback(async () => {
    if (!connected || !publicKey) {
      alert("Connect and sign in first!");
      return;
    }

    if (!isSignedIn) {
      alert("Please sign in first!");
      return;
    }

    if (!form.title || !form.flagSolution || !form.prizeAmount || !form.startDate || !form.endDate) {
      alert("Fill all required fields!");
      return;
    }

    setIsSubmitting(true);
    try {
      await addChallenge({
        title: form.title,
        flagSolution: form.flagSolution,
        prizeAmount: Number(form.prizeAmount),
        startDate: form.startDate,
        endDate: form.endDate,
        flagDetails: form.flagDetails,
        files: form.files ? form.files.split(",").map((f) => f.trim()) : [],
        challengeType: form.challengeType,
        flagFormat: form.flagFormat || undefined,
        hint: form.hint || undefined,
        hintReleaseDate: form.hintReleaseDate || undefined,
      });

      alert("Challenge created successfully!");
      setForm({ 
        title: "",
        flagSolution: "", 
        prizeAmount: "", 
        startDate: "", 
        endDate: "", 
        flagDetails: "", 
        files: "",
        challengeType: "misc",
        flagFormat: "",
        hint: "",
        hintReleaseDate: "",
      });
    } catch (err) {
      console.error("❌ Failed to create challenge:", err);
      alert("Error creating challenge. See console.");
    } finally {
      setIsSubmitting(false);
    }
  }, [connected, publicKey, isSignedIn, form, addChallenge]);

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      {/* ==== Header ==== */}
      <div className="max-w-4xl mx-auto mb-6">
        <h1 className="text-3xl font-bold mb-2">Create Challenge</h1>
        <p className="text-foreground/60">
          Create a new CTF challenge for the community to solve
        </p>
      </div>

      {/* ==== Warning Message ==== */}
      {!isSignedIn && (
        <div className="max-w-4xl mx-auto mb-6">
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-blue-700 text-sm">
              ⚠️ Please connect and sign in using the wallet button in the sidebar
            </p>
          </div>
        </div>
      )}

      {/* ==== Form ==== */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-foreground/5 rounded-lg border border-foreground/10 p-6">
          <div className="space-y-6">
            {/* Challenge Title */}
            <div>
              <label className="block text-sm font-medium text-foreground/60 mb-2">
                Challenge Title *
              </label>
              <input
                name="title"
                placeholder="Enter a descriptive title for your challenge"
                value={form.title}
                onChange={handleChange}
                className="w-full p-3 rounded-lg bg-foreground/5 border border-foreground/10 text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            {/* Challenge Type */}
            <div>
              <label className="block text-sm font-medium text-foreground/60 mb-2">
                Challenge Type *
              </label>
              <select
                name="challengeType"
                value={form.challengeType}
                onChange={handleChange}
                className="w-full p-3 rounded-lg bg-foreground/5 border border-foreground/10 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              >
                <option value="misc">Miscellaneous</option>
                <option value="web">Web</option>
                <option value="crypto">Cryptography</option>
                <option value="pwn">Binary Exploitation</option>
                <option value="reverse">Reverse Engineering</option>
                <option value="forensics">Forensics</option>
                <option value="osint">OSINT</option>
              </select>
            </div>

            {/* Flag Solution */}
            <div>
              <label className="block text-sm font-medium text-foreground/60 mb-2">
                Flag Solution *
              </label>
              <input
                name="flagSolution"
                placeholder="Enter the correct flag (e.g., FLAG{example_flag})"
                value={form.flagSolution}
                onChange={handleChange}
                className="w-full p-3 rounded-lg bg-foreground/5 border border-foreground/10 text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-blue-500 transition font-mono"
              />
              <p className="mt-2 text-xs text-foreground/40">
                This will be kept secret. Players must match this exactly to solve the challenge.
              </p>
            </div>

            {/* Flag Format */}
            <div>
              <label className="block text-sm font-medium text-foreground/60 mb-2">
                Flag Format (Optional)
              </label>
              <input
                name="flagFormat"
                placeholder="e.g., FLAG{...} or CTF{...}"
                value={form.flagFormat}
                onChange={handleChange}
                className="w-full p-3 rounded-lg bg-foreground/5 border border-foreground/10 text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-blue-500 transition font-mono"
              />
              <p className="mt-2 text-xs text-foreground/40">
                Hint to players about the expected flag format
              </p>
            </div>

            {/* Prize Amount */}
            <div>
              <label className="block text-sm font-medium text-foreground/60 mb-2">
                Prize Amount (SOL) *
              </label>
              <input
                name="prizeAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.0"
                value={form.prizeAmount}
                onChange={handleChange}
                className="w-full p-3 rounded-lg bg-foreground/5 border border-foreground/10 text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground/60 mb-2">
                  Start Date *
                </label>
                <input
                  name="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={handleChange}
                  className="w-full p-3 rounded-lg bg-foreground/5 border border-foreground/10 text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground/60 mb-2">
                  End Date *
                </label>
                <input
                  name="endDate"
                  type="date"
                  value={form.endDate}
                  onChange={handleChange}
                  className="w-full p-3 rounded-lg bg-foreground/5 border border-foreground/10 text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
            </div>

            {/* Challenge Description */}
            <div>
              <label className="block text-sm font-medium text-foreground/60 mb-2">
                Challenge Description *
              </label>
              <textarea
                name="flagDetails"
                placeholder="Describe your challenge, provide context, and any additional information players need to know..."
                value={form.flagDetails}
                onChange={handleChange}
                rows={6}
                className="w-full p-3 rounded-lg bg-foreground/5 border border-foreground/10 text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
              />
            </div>

            {/* Hint */}
            <div>
              <label className="block text-sm font-medium text-foreground/60 mb-2">
                Hint (Optional)
              </label>
              <textarea
                name="hint"
                placeholder="Provide a helpful hint for players who get stuck..."
                value={form.hint}
                onChange={handleChange}
                rows={3}
                className="w-full p-3 rounded-lg bg-foreground/5 border border-foreground/10 text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
              />
            </div>

            {/* Hint Release Date */}
            <div>
              <label className="block text-sm font-medium text-foreground/60 mb-2">
                Hint Release Date (Optional)
              </label>
              <input
                name="hintReleaseDate"
                type="date"
                value={form.hintReleaseDate}
                onChange={handleChange}
                className="w-full p-3 rounded-lg bg-foreground/5 border border-foreground/10 text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              <p className="mt-2 text-xs text-foreground/40">
                When should the hint be revealed to players?
              </p>
            </div>

            {/* Files */}
            <div>
              <label className="block text-sm font-medium text-foreground/60 mb-2">
                Challenge Files (Optional)
              </label>
              <input
                name="files"
                placeholder="https://example.com/file1.zip, https://example.com/file2.txt"
                value={form.files}
                onChange={handleChange}
                className="w-full p-3 rounded-lg bg-foreground/5 border border-foreground/10 text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              <p className="mt-2 text-xs text-foreground/40">
                Comma-separated URLs to challenge files, resources, or downloads
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-foreground/10">
              <button
                onClick={handleSubmit}
                disabled={!isSignedIn || isSubmitting || !form.title || !form.flagSolution || !form.prizeAmount || !form.startDate || !form.endDate || !form.flagDetails}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-pulse">Creating Challenge...</span>
                  </span>
                ) : (
                  "Create Challenge"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
