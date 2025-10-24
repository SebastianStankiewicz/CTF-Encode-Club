"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
// Import useState and useEffect
import { useCallback, useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function Navbar() {
  const pathname = usePathname();
  const { publicKey, signMessage, connected } = useWallet();
  const verifyOrCreateUser = useMutation(api.myFunctions.verifyOrCreateUser);

  // State to track if the user has successfully signed in
  const [isSignedIn, setIsSignedIn] = useState(false);

  // Effect to reset sign-in status if wallet disconnects
  useEffect(() => {
    if (!connected) {
      setIsSignedIn(false);
    }
  }, [connected]);

  const handleSignIn = useCallback(async () => {
    if (!connected) {
      alert("Please connect your wallet first!");
      return;
    }
    if (!signMessage) {
      alert("Your wallet doesn’t support message signing!");
      return;
    }
    if (!publicKey) {
      alert("Wallet public key not available.");
      return;
    }

    try {
      const message = new TextEncoder().encode("Sign in to CTF Manager");
      const signature = await signMessage(message);
      const signatureBase58 = bs58.encode(signature);

      console.log("✅ Signed by:", publicKey.toBase58());
      console.log("🖋 Signature (base58):", signatureBase58);

      const result = await verifyOrCreateUser({
        publicKey: publicKey.toBase58(),
      });

      if (result.status === "created") {
        alert(`Welcome new user: ${publicKey.toBase58().slice(0, 6)}...`);
        setIsSignedIn(true); // Set signed-in state
      } else if (result.status === "logged_in") {
        alert(`Welcome back, ${publicKey.toBase58().slice(0, 6)}...`);
        setIsSignedIn(true); // Set signed-in state
      }
    } catch (err) {
      console.error("❌ Signing failed:", err);
      setIsSignedIn(false); // Ensure state is false on error
    }
  }, [signMessage, connected, publicKey, verifyOrCreateUser]);

  const navItems = [
    { href: "/challenges", label: "Challenges" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/submit", label: "Submit Flag" },
  ];

  return (
    <header className="border-b border-foreground/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <nav className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo / Brand */}
          <Link
            href="/"
            className="flex items-center gap-2 font-mono text-lg font-semibold tracking-tighter text-foreground hover:opacity-80 transition-opacity"
          >
            <span className="text-foreground/50">/</span>
            <span>convex.sol</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-mono transition-colors ${
                    isActive
                      ? "text-foreground font-semibold"
                      : "text-foreground/60 hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            {/* NEW: Profile Link - shows only when signed in */}
            {isSignedIn && publicKey && (
              <Link
                href={`/profile/${publicKey.toBase58()}`}
                className={`text-sm font-mono transition-colors ${
                  pathname.startsWith(`/profile/`) // Active if on any profile page
                    ? "text-foreground font-semibold"
                    : "text-foreground/60 hover:text-foreground"
                }`}
              >
                My Profile
              </Link>
            )}
          </div>

          {/* Wallet / Sign-In */}
          <div className="flex items-center gap-4">
            <WalletMultiButton />
            
            {/* NEW: Conditional Sign In Button - hides when signed in */}
            {!isSignedIn && (
              <button
                onClick={handleSignIn}
                disabled={!connected}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-all disabled:opacity-50 text-sm"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}

