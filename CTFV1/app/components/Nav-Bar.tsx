"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useWallet,
  useConnection,
} from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useCallback, useEffect, useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/app/providers/auth-context";
import bs58 from "bs58";

export default function Navbar() {
  const pathname = usePathname();
  const { publicKey, signMessage, connected, disconnect, wallet, connecting, connect } =
    useWallet();
  const { connection } = useConnection();
  const { isSignedIn, setIsSignedIn } = useAuth();
  const verifyOrCreateUser = useMutation(api.myFunctions.verifyOrCreateUser);

  const [isSigning, setIsSigning] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debug logging
  useEffect(() => {
    console.log("Wallet state:", {
      connected,
      connecting,
      publicKey: publicKey?.toBase58(),
      walletName: wallet?.adapter?.name,
      isSignedIn,
      ready: wallet?.adapter?.ready,
      readyState: wallet?.adapter?.readyState,
    });
  }, [connected, connecting, publicKey, wallet, isSignedIn]);

  // Monitor connecting state and add timeout
  useEffect(() => {
    if (connecting) {
      console.log("⏳ Connection started...");
      
      // Set a 15-second timeout for connection
      connectionTimeoutRef.current = setTimeout(() => {
        if (connecting && !connected) {
          console.error("❌ Connection timeout - please try again");
          alert("Connection timed out. Please make sure:\n1. Phantom is unlocked\n2. You approve the connection\n3. Popup blockers are disabled");
          
          // Force disconnect to reset state
          disconnect().catch(console.error);
        }
      }, 15000);
    } else {
      // Clear timeout if connection completes or fails
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    }

    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
    };
  }, [connecting, connected, disconnect]);

  // Log successful connection
  useEffect(() => {
    if (connected && publicKey) {
      console.log("✅ Wallet connected successfully:", publicKey.toBase58());
    }
  }, [connected, publicKey]);

  // ---------------------------------------------------------------------
  // Sign-in handler (memoized)
  // ---------------------------------------------------------------------
  const handleSignIn = useCallback(async () => {
    if (!connected || !publicKey || !signMessage) {
      if (!connected) alert("Please connect your wallet first!");
      if (!signMessage) alert("Your wallet doesn't support message signing!");
      if (!publicKey) alert("Wallet public key not available.");
      return;
    }

    setIsSigning(true);
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
        setIsSignedIn(true);
      } else if (result.status === "logged_in") {
        alert(`Welcome back, ${publicKey.toBase58().slice(0, 6)}...`);
        setIsSignedIn(true);
      } else {
        setIsSignedIn(true); // Fallback for successful verification
      }
    } catch (err: any) {
      console.error("❌ Sign-in failed:", err);
      alert("Sign-in failed. Please try again.");
      setIsSignedIn(false);
    } finally {
      setIsSigning(false);
    }
  }, [
    connected,
    publicKey,
    signMessage,
    verifyOrCreateUser,
    setIsSignedIn,
  ]);

  // ---------------------------------------------------------------------
  // Reset signed-in state when wallet disconnects
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!connected) {
      setIsSignedIn(false);
    }
  }, [connected, setIsSignedIn]);

  // ---------------------------------------------------------------------
  // Force disconnect handler for stuck states
  // ---------------------------------------------------------------------
  const handleForceDisconnect = useCallback(async () => {
    try {
      console.log("🔄 Force disconnecting...");
      await wallet?.adapter.disconnect();
      await disconnect();
      setIsSignedIn(false);
      console.log("✅ Force disconnect complete");
    } catch (error) {
      console.error("Error during force disconnect:", error);
    }
  }, [wallet, disconnect, setIsSignedIn]);

  // ---------------------------------------------------------------------
  // Navigation items
  // ---------------------------------------------------------------------
  const navItems = [
    { href: "/challenges", label: "Challenges" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/submit", label: "Submit Flag" },
    { href: "/create", label: "Create Challenge" },
  ];

  const linkClasses = (active: boolean) =>
    `block px-4 py-3 rounded-lg text-sm font-mono transition-all ${
      active
        ? "bg-foreground/10 text-foreground font-semibold"
        : "text-foreground/60 hover:text-foreground hover:bg-foreground/5"
    }`;

  // ---------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------
  return (
    <>
      {/* ───── Desktop Sidebar ───── */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 border-r border-foreground/10 bg-background/95 backdrop-blur lg:flex flex-col">
        <div className="flex flex-col justify-between h-full">
          <div>
            <div className="border-b border-foreground/10 p-6">
              <Link
                href="/"
                className="flex items-center gap-2 font-mono text-lg font-semibold tracking-tighter text-foreground hover:opacity-80"
              >
                <span className="text-foreground/50">/</span>
                <span>SolFlag</span>
              </Link>
            </div>

            <nav className="p-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={linkClasses(pathname.startsWith(item.href))}
                >
                  {item.label}
                </Link>
              ))}

              {isSignedIn && publicKey && (
                <Link
                  href={`/profile/${publicKey.toBase58()}`}
                  className={linkClasses(pathname.startsWith("/profile/"))}
                >
                  My Profile
                </Link>
              )}
            </nav>
          </div>

          {/* Wallet / Sign-in */}
          <div className="border-t border-foreground/10 p-4">
            {!connected ? (
              <div className="space-y-2">
                <WalletMultiButton
                  className="w-full rounded-md bg-gray-600 px-4 py-1 text-xs text-white hover:bg-gray-700"
                  style={{ fontSize: "12px", height: "32px" }}
                />
                {connecting && (
                  <div className="space-y-1">
                    <p className="text-xs font-mono text-orange-400">
                      Connecting to wallet...
                    </p>
                    <p className="text-xs font-mono text-foreground/50">
                      Check Phantom for approval popup
                    </p>
                    <button
                      onClick={handleForceDisconnect}
                      className="text-xs underline text-red-400 hover:text-red-300"
                    >
                      Cancel & Reset
                    </button>
                  </div>
                )}
              </div>
            ) : !isSignedIn ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono text-foreground/70">
                    {publicKey?.toBase58().slice(0, 4)}…
                    {publicKey?.toBase58().slice(-4)}
                  </span>
                  <button
                    onClick={disconnect}
                    className="text-xs px-2 py-1 rounded border border-foreground/20 hover:bg-foreground/10"
                  >
                    Disconnect
                  </button>
                </div>

                <button
                  onClick={handleSignIn}
                  disabled={isSigning}
                  className="w-full rounded-md bg-gray-600 px-4 py-1 text-xs text-white hover:bg-gray-700 disabled:opacity-50"
                >
                  {isSigning ? "Signing…" : "Sign In"}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-foreground/70">
                  {publicKey?.toBase58().slice(0, 4)}…
                  {publicKey?.toBase58().slice(-4)}
                </span>
                <button
                  onClick={disconnect}
                  className="text-xs px-2 py-1 rounded border border-foreground/20 hover:bg-foreground/10"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ───── Mobile Header ───── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-foreground/10 bg-background/95 backdrop-blur lg:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-mono text-lg font-semibold"
          >
            <span className="text-foreground/50">/</span>
            <span>SolFlag</span>
          </Link>

          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="p-2 rounded-lg text-foreground/60 hover:bg-foreground/10"
          >
            {mobileOpen ? "Close" : "Menu"}
          </button>
        </div>
      </header>

      {/* ───── Mobile Menu ───── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur pt-16 lg:hidden">
          <nav className="space-y-1 p-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={linkClasses(pathname.startsWith(item.href))}
              >
                {item.label}
              </Link>
            ))}

            {isSignedIn && publicKey && (
              <Link
                href={`/profile/${publicKey.toBase58()}`}
                onClick={() => setMobileOpen(false)}
                className={linkClasses(pathname.startsWith("/profile/"))}
              >
                My Profile
              </Link>
            )}

            <div className="border-t border-foreground/10 pt-4 mt-4">
              {!connected ? (
                <div className="space-y-2">
                  <WalletMultiButton
                    className="w-full rounded-md bg-gray-600 px-4 py-1 text-xs text-white hover:bg-gray-700"
                    style={{ fontSize: "12px", height: "32px" }}
                  />
                  {connecting && (
                    <div className="space-y-1">
                      <p className="text-xs font-mono text-orange-400">
                        Connecting to wallet...
                      </p>
                      <p className="text-xs font-mono text-foreground/50">
                        Check Phantom for approval popup
                      </p>
                      <button
                        onClick={handleForceDisconnect}
                        className="text-xs underline text-red-400 hover:text-red-300"
                      >
                        Cancel & Reset
                      </button>
                    </div>
                  )}
                </div>
              ) : !isSignedIn ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono text-foreground/70">
                      {publicKey?.toBase58().slice(0, 4)}…
                      {publicKey?.toBase58().slice(-4)}
                    </span>
                    <button
                      onClick={disconnect}
                      className="text-xs px-2 py-1 rounded border border-foreground/20 hover:bg-foreground/10"
                    >
                      Disconnect
                    </button>
                  </div>

                  <button
                    onClick={handleSignIn}
                    disabled={isSigning}
                    className="w-full rounded-md bg-gray-600 px-4 py-1 text-xs text-white hover:bg-gray-700 disabled:opacity-50"
                  >
                    {isSigning ? "Signing…" : "Sign In"}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono text-foreground/70">
                    {publicKey?.toBase58().slice(0, 4)}…
                    {publicKey?.toBase58().slice(-4)}
                  </span>
                  <button
                    onClick={disconnect}
                    className="text-xs px-2 py-1 rounded border border-foreground/20 hover:bg-foreground/10"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}