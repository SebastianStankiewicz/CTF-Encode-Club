"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const { publicKey, connected } = useWallet();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    setIsConnected(connected);
  }, [connected]);

  const navItems = [
    { href: "/challenges", label: "Challenges" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/submit", label: "Submit Flag" },
  ];

  const linkClasses = (isActive) =>
    `block px-3 py-2 rounded-md font-mono text-sm transition-colors ${
      isActive
        ? "bg-foreground/10 text-foreground font-semibold"
        : "text-foreground/60 hover:text-foreground hover:bg-foreground/5"
    }`;

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-foreground/10 bg-background/95 backdrop-blur flex flex-col">
      <div className="flex flex-col justify-between h-full">
        {/* ── Logo ── */}
        <div>
          <div className="border-b border-foreground/10 p-6">
            <Link
              href="/"
              className="flex items-center gap-2 font-mono text-lg font-semibold tracking-tighter text-foreground hover:opacity-80"
            >
              <span className="text-foreground/50">/</span>
              <span>convex.sol</span>
            </Link>
          </div>

          {/* ── Navigation Links ── */}
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

            {isConnected && publicKey && (
              <Link
                href={`/profile/${publicKey.toBase58()}`}
                className={linkClasses(pathname.startsWith("/profile/"))}
              >
                My Profile
              </Link>
            )}
          </nav>
          <div
          suppressHydrationWarning
          className="border-t border-foreground/10 p-4"
        >
          <WalletMultiButton
            suppressHydrationWarning
            className="w-full rounded-md bg-gray-600 px-4 py-1 text-xs text-white hover:bg-gray-700"
            style={{ fontSize: "12px", height: "32px" }}
          />
        </div>
        </div>

        {/* ── Wallet Connect ── */}
        
      </div>
    </aside>
  );
}
