"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import { useCallback, useState } from "react";

export default function Home() {
  return (
    <main className="min-h-screen p-8 flex flex-col gap-16">
      <Content />
    </main>
  );
}

function Content() {
  const { publicKey, signMessage, connected } = useWallet();
  const verifyOrCreateUser = useMutation(api.myFunctions.verifyOrCreateUser);
  const addChallenge = useMutation(api.myFunctions.addChallenge);

  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    flagSolution: "",
    flagFormat: "",
    hint: "",
    hintReleaseDate: "",
    keepAfterFirstSolve: true,
    challengeType: "",
    prizeAmount: "",
    startDate: "",
    endDate: "",
    flagDetails: "",
    files: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleSignIn = useCallback(async () => {
    if (!connected || !publicKey || !signMessage) {
      alert("Please connect your wallet first!");
      return;
    }

    setIsSigningIn(true);
    try {
      const message = new TextEncoder().encode("Sign in to CTF Manager");
      const signature = await signMessage(message);
      const signatureBase58 = bs58.encode(signature);

      const result = await verifyOrCreateUser({
        publicKey: publicKey.toBase58(),
      });

      if (result.status === "created" || result.status === "logged_in") {
        setIsSignedIn(true);
        alert(
          `Welcome ${result.status === "created" ? "new user" : "back"}: ${
            publicKey.toBase58().slice(0, 6)
          }...`
        );
      }
    } catch (err) {
      console.error("Signing failed:", err);
      alert("Sign-in failed.");
    } finally {
      setIsSigningIn(false);
    }
  }, [connected, publicKey, signMessage, verifyOrCreateUser]);

  const handleSubmit = async () => {
    if (!isSignedIn) {
      alert("Please sign in first!");
      return;
    }

    const { flagSolution, prizeAmount, startDate, endDate } = form;
    if (!flagSolution || !prizeAmount || !startDate || !endDate) {
      alert("Please fill in all required fields!");
      return;
    }

    setIsSubmitting(true);
    try {
      await addChallenge({
        flagSolution: form.flagSolution,
        prizeAmount: Number(form.prizeAmount),
        startDate: form.startDate,
        endDate: form.endDate,
        flagDetails: form.flagDetails,
        files: form.files
          ? form.files.split(",").map((f) => f.trim())
          : [],
        challengeType: form.challengeType,
        flagFormat: form.flagFormat,
        hint: form.hint,
        hintReleaseDate: form.hintReleaseDate,
        keepAfterFirstSolve: form.keepAfterFirstSolve,
      });

      alert("Challenge added successfully!");
      setForm({
        flagSolution: "",
        flagFormat: "",
        hint: "",
        hintReleaseDate: "",
        keepAfterFirstSolve: true,
        challengeType: "",
        prizeAmount: "",
        startDate: "",
        endDate: "",
        flagDetails: "",
        files: "",
      });
    } catch (e) {
      console.error("Failed to add challenge:", e);
      alert("Error adding challenge.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-lg mx-auto">
      {/* Form */}
      <div className="flex flex-col gap-4 border border-foreground/10 bg-foreground/5 p-6 rounded-lg">
        <h2 className="text-xl font-semibold font-mono">Create New Challenge</h2>

        {/* Challenge Type */}
        <select
          name="challengeType"
          value={form.challengeType}
          onChange={handleChange}
          className="p-3 rounded-md border border-foreground/20 bg-background/50 text-foreground focus:ring-2 focus:ring-purple-500"
        >
          <option value="web">Web</option>
          <option value="pwn">Pwn</option>
          <option value="reverse">Reverse</option>
          <option value="osint">OSINT</option>
          <option value="forensics">Forensics</option>
          <option value="misc">Misc</option>
        </select>

        {/* Flag */}
        <input
          name="flagSolution"
          placeholder="Flag Solution *"
          value={form.flagSolution}
          onChange={handleChange}
          className="p-3 rounded-md border border-foreground/20 bg-background/50 text-foreground focus:ring-2 focus:ring-purple-500"
        />

        {/* Flag Format */}
        <input
          name="flagFormat"
          placeholder="Flag Format (e.g. CTF{.*})"
          value={form.flagFormat}
          onChange={handleChange}
          className="p-3 rounded-md border border-foreground/20 bg-background/50 text-foreground focus:ring-2 focus:ring-purple-500"
        />

        {/* Hint */}
        <textarea
          name="hint"
          placeholder="Hint (optional)"
          value={form.hint}
          onChange={handleChange}
          rows={2}
          className="p-3 rounded-md border border-foreground/20 bg-background/50 text-foreground resize-none focus:ring-2 focus:ring-purple-500"
        />

        {/* Hint Release Date */}
        <input
          name="hintReleaseDate"
          type="date"
          value={form.hintReleaseDate}
          onChange={handleChange}
          className="p-3 rounded-md border border-foreground/20 bg-background/50 text-foreground focus:ring-2 focus:ring-purple-500"
        />

        {/* Keep after first solve */}
        <label className="flex items-center gap-2 text-sm text-foreground/70">
          <input
            type="checkbox"
            name="keepAfterFirstSolve"
            checked={form.keepAfterFirstSolve}
            onChange={handleChange}
          />
          Keep visible after first solve
        </label>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <input
            name="startDate"
            type="date"
            value={form.startDate}
            onChange={handleChange}
            className="p-3 rounded-md border border-foreground/20 bg-background/50 text-foreground focus:ring-2 focus:ring-purple-500"
          />
          <input
            name="endDate"
            type="date"
            value={form.endDate}
            onChange={handleChange}
            className="p-3 rounded-md border border-foreground/20 bg-background/50 text-foreground focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Prize */}
        <input
          name="prizeAmount"
          type="number"
          placeholder="Prize Amount (SOL) *"
          value={form.prizeAmount}
          onChange={handleChange}
          className="p-3 rounded-md border border-foreground/20 bg-background/50 text-foreground focus:ring-2 focus:ring-purple-500"
        />

        {/* Extra info */}
        <textarea
          name="flagDetails"
          placeholder="Flag Details (optional)"
          value={form.flagDetails}
          onChange={handleChange}
          rows={3}
          className="p-3 rounded-md border border-foreground/20 bg-background/50 text-foreground resize-none focus:ring-2 focus:ring-purple-500"
        />

        <input
          name="files"
          placeholder="File URLs (comma-separated)"
          value={form.files}
          onChange={handleChange}
          className="p-3 rounded-md border border-foreground/20 bg-background/50 text-foreground focus:ring-2 focus:ring-purple-500"
        />

        <button
          onClick={handleSubmit}
          disabled={!isSignedIn || isSubmitting}
          className="mt-4 px-6 py-3 rounded-md font-medium text-gray-700 border border-gray-700 hover:bg-gray-800 transition disabled:opacity-50"
        >
          {isSubmitting ? "Adding..." : "Add Challenge"}
        </button>
      </div>
    </div>
  );
}
