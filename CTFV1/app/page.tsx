"use client";

import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import { useCallback, useState } from "react";
import { verifyOrCreateUser } from "@/convex/myFunctions";

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-10 bg-background p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
        CTF Challenge Manager
        <WalletMultiButton />
      </header>
      <main className="p-8 flex flex-col gap-16">
        <h1 className="text-4xl font-bold text-center">Add CTF Challenge</h1>
        <Content />
      </main>
    </>
  );
}

function Content() {
  const addChallenge = useMutation(api.myFunctions.addChallenge);
  const { publicKey, signMessage, connected } = useWallet();

  const [form, setForm] = useState({
    flagSolution: "",
    prizeAmount: "",
    startDate: "",
    endDate: "",
    flagDetails: "",
    files: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const verifyOrCreateUser = useMutation(api.myFunctions.verifyOrCreateUser);

  const handleSignIn = useCallback(async () => {
    if (!connected) {
      alert("Please connect your wallet first!");
      return;
    }
    if (!signMessage) {
      alert("Your wallet doesn’t support message signing!");
      return;
    }
  
    try {
      const message = new TextEncoder().encode("Sign in to CTF Manager");
      const signature = await signMessage(message);
      const signatureBase58 = bs58.encode(signature);
  
      console.log("✅ Signed by:", publicKey?.toBase58());
      console.log("🖋 Signature (base58):", signatureBase58);
  
      const result = await verifyOrCreateUser({
        publicKey: publicKey?.toBase58() ?? "",
      });
  
      if (result.status === "created") {
        console.log("🆕 New user created:", result.userId);
        alert(`Welcome new user: ${publicKey?.toBase58().slice(0, 6)}...`);
      } else if (result.status === "logged_in") {
        console.log("👋 Existing user logged in:", result.user.publicKey);
        alert(`Welcome back, ${publicKey?.toBase58().slice(0, 6)}...`);
      }
  
    } catch (err) {
      console.error("❌ Signing failed:", err);
    }
  }, [signMessage, connected, publicKey, verifyOrCreateUser]);
  
  

  const handleSubmit = async () => {
    if (!connected) {
      alert("Please connect and sign in first!");
      return;
    }

    if (
      !form.flagSolution ||
      !form.prizeAmount ||
      !form.startDate ||
      !form.endDate
    ) {
      alert("Please fill in all required fields!");
      return;
    }

    try {
      await addChallenge({
        flagSolution: form.flagSolution,
        prizeAmount: Number(form.prizeAmount),
        startDate: form.startDate,
        endDate: form.endDate,
        flagDetails: form.flagDetails,
        files: form.files ? form.files.split(",").map(f => f.trim()) : [],
      });

      alert("✅ Challenge added successfully!");
      setForm({
        flagSolution: "",
        prizeAmount: "",
        startDate: "",
        endDate: "",
        flagDetails: "",
        files: "",
      });
    } catch (err) {
      console.error("❌ Failed to add challenge:", err);
      alert("Error adding challenge. Check console for details.");
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-lg mx-auto">
      {/* 🔐 Wallet Section */}
      <div className="flex flex-col gap-2">
        <button
          onClick={handleSignIn}
          className="bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700 transition-all disabled:opacity-50"
          disabled={!connected}
        >
          {connected ? "Sign In" : "Connect Wallet First"}
        </button>
      </div>

      {/* 🧩 Add Challenge Form */}
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
