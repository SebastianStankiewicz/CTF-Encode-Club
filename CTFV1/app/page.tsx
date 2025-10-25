"use client";
import * as anchor from "@coral-xyz/anchor";
import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import { web3, AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import { api } from "../convex/_generated/api";
import { useMutation } from "convex/react";
import { verifyOrCreateUser } from "@/convex/myFunctions";
import idl from "@/target/idl/ctf_anchor.json"; // Anchor IDL
import { CtfAnchor } from "@/target/types/ctf_anchor";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

const PROGRAM_ID = new web3.PublicKey(
  "GrTTrdzrLzGnLE1rDbxxv4xdZgQi7pNXGeMpb5TaYecF"
);

export default function Content() {
  const { publicKey, connected, signMessage } = useWallet();
  const addChallenge = useMutation(api.myFunctions.addChallenge);
  const verifyOrCreateUserMutation = useMutation(api.myFunctions.verifyOrCreateUser);

  const [form, setForm] = useState({
    flagSolution: "",
    prizeAmount: "",
    startDate: "",
    endDate: "",
    flagDetails: "",
    files: "",
  });

  async function computeFlagSha256(flagString: string) {
    const enc = new TextEncoder();
    const data = enc.encode(flagString);               // UTF-8 bytes of input
    const hashBuffer = await crypto.subtle.digest('SHA-256', data); // ArrayBuffer (32 bytes)
    return new Uint8Array(hashBuffer);                 // Uint8Array(32)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSignIn = useCallback(async () => {
    if (!connected || !signMessage || !publicKey) {
      alert("Connect your wallet first!");
      return;
    }

    try {
      const message = new TextEncoder().encode("Sign in to CTF Manager");
      const signature = await signMessage(message);
      const signatureBase58 = bs58.encode(signature);

      console.log("✅ Signed by:", publicKey.toBase58(), signatureBase58);

      const result = await verifyOrCreateUserMutation({ publicKey: publicKey.toBase58() });
      if (result.status === "created") alert("🆕 New user created!");
      else if (result.status === "logged_in") alert("👋 Welcome back!");
    } catch (err) {
      console.error("❌ Signing failed:", err);
    }
  }, [connected, signMessage, publicKey, verifyOrCreateUserMutation]);

  const handleSubmit = useCallback(async () => {
    if (!connected || !publicKey) {
      alert("Connect and sign in first!");
      return;
    }

    if (!form.flagSolution || !form.prizeAmount || !form.startDate || !form.endDate) {
      alert("Fill all required fields!");
      return;
    }

    try {
      // Create Anchor provider using the wallet
      const connection = new web3.Connection("https://api.devnet.solana.com");
      
      // Use window.solana (Phantom wallet) directly as the wallet adapter
      const provider = new AnchorProvider(
        connection,
        window.solana,
        { preflightCommitment: "processed" }
      );

      //Through context connect my phantom wallet to anchor
      const program = new Program<CtfAnchor>(idl as CtfAnchor, provider);


      // Generate a random challenge ID
      const challengeId = new BN(Math.floor(Math.random() * 1_000_000));

      // Compute PDA for challenge
      const [challengePda] = web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("challenge"),
          publicKey.toBuffer(),
          challengeId.toArrayLike(Buffer, "le", 8),
        ],
        PROGRAM_ID
      );


      const hashBytes = await computeFlagSha256(form.flagSolution);
      // store directly in your 32-byte field:
      const flagHash = new Uint8Array(32);
      flagHash.set(hashBytes); // hashBytes is exactly 32 bytes
      const depositSol = Number(form.prizeAmount);
      const depositLamports = new anchor.BN(depositSol * LAMPORTS_PER_SOL);

      // Call your on-chain program
      const tx = await program.methods
        .createChallenge(challengeId, flagHash, depositLamports)
        .accounts({
          creator: publicKey,
          challenge: challengePda,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc({ skipPreflight: true });

      console.log("✅ Challenge created on-chain:", tx);

      // Store off-chain data as well
      await addChallenge({
        flagSolution: form.flagSolution,
        prizeAmount: Number(form.prizeAmount),
        startDate: form.startDate,
        endDate: form.endDate,
        flagDetails: form.flagDetails,
        files: form.files ? form.files.split(",").map((f) => f.trim()) : [],
        challengePda: challengePda.toBase58(),
      });

      alert("✅ Challenge added successfully!");
      setForm({ flagSolution: "", prizeAmount: "", startDate: "", endDate: "", flagDetails: "", files: "" });
    } catch (err) {
      console.error("❌ Failed to create challenge:", err);
      alert("Error creating challenge. See console.");
    }
  }, [connected, publicKey, form, addChallenge]);

  return (
    <div className="flex flex-col gap-8 max-w-lg mx-auto">
      {/* Wallet Section */}
      <div className="flex flex-col gap-2">
        <button
          onClick={handleSignIn}
          className="bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700 transition-all disabled:opacity-50"
          disabled={!connected}
        >
          {connected ? "Sign In" : "Connect Wallet First"}
        </button>
      </div>

      {/* Add Challenge Form */}
      <div className="flex flex-col gap-4 bg-slate-100 dark:bg-slate-900 p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-2">Create New Challenge</h2>

        <input
          name="flagSolution"
          placeholder="Flag Solution"
          value={form.flagSolution}
          onChange={handleChange}
          className="p-2 rounded-md border border-slate-300 dark:border-slate-700 bg-transparent"
        />

        <input
          name="prizeAmount"
          type="number"
          placeholder="Prize Amount"
          value={form.prizeAmount}
          onChange={handleChange}
          className="p-2 rounded-md border border-slate-300 dark:border-slate-700 bg-transparent"
        />

        <input
          name="startDate"
          type="date"
          value={form.startDate}
          onChange={handleChange}
          className="p-2 rounded-md border border-slate-300 dark:border-slate-700 bg-transparent"
        />

        <input
          name="endDate"
          type="date"
          value={form.endDate}
          onChange={handleChange}
          className="p-2 rounded-md border border-slate-300 dark:border-slate-700 bg-transparent"
        />

        <textarea
          name="flagDetails"
          placeholder="Flag Details"
          value={form.flagDetails}
          onChange={handleChange}
          className="p-2 rounded-md border border-slate-300 dark:border-slate-700 bg-transparent h-24"
        />

        <input
          name="files"
          placeholder="Files (comma separated URLs)"
          value={form.files}
          onChange={handleChange}
          className="p-2 rounded-md border border-slate-300 dark:border-slate-700 bg-transparent"
        />

        <button
          onClick={handleSubmit}
          className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-all"
        >
          Add Challenge
        </button>
      </div>
    </div>
  );
}