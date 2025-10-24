"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import "../globals.css";

export default function LeaderboardPage() {
  const [search, setSearch] = useState("");
  const { publicKey } = useWallet();

  const leaderboardData = useQuery(api.myFunctions.getLeaderboard, { limit: 100 });
  const userStats = useQuery(
    api.myFunctions.getUserStats,
    publicKey ? { publicKey: publicKey.toBase58() } : "skip"
  );

  // -----------------------------------------------------------------
  // Loading
  // -----------------------------------------------------------------
  if (leaderboardData === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-foreground text-lg animate-pulse">Loading...</p>
      </div>
    );
  }

  const filtered = leaderboardData.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.publicKey.toLowerCase().includes(search.toLowerCase())
  );

  // -----------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------
  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      {/* ==== Header ==== */}
      <div className="max-w-4xl mx-auto mb-6">
        <h1 className="text-3xl font-bold mb-4">Leaderboard</h1>

        {/* Search */}
        <input
          type="text"
          placeholder="Search by name or wallet..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-3 rounded-lg bg-foreground/5 border border-foreground/10 text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
      </div>

      {/* ==== Your Rank ==== */}
      {userStats && (
        <div className="max-w-4xl mx-auto mb-6 p-4 bg-foreground/5 rounded-lg border border-foreground/10">
          <p className="text-sm text-foreground/60">Your Position</p>
          <p className="text-2xl font-bold text-yellow-400">
            {userStats.rank ? `#${userStats.rank}` : "Unranked"} • {userStats.score} pts
          </p>
        </div>
      )}

      {/* ==== Table ==== */}
      <div className="max-w-4xl mx-auto overflow-x-auto">
        <div className="bg-foreground/5 rounded-lg border border-foreground/10">
          <table className="w-full">
            <thead>
              <tr className="border-b border-foreground/10">
                <th className="text-left p-4 text-sm font-medium text-foreground/60">
                  Rank
                </th>
                <th className="text-left p-4 text-sm font-medium text-foreground/60">
                  Player
                </th>
                <th className="text-left p-4 text-sm font-medium text-foreground/60">
                  Score
                </th>
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-12 text-foreground/40">
                    No players found.
                  </td>
                </tr>
              ) : (
                filtered.map((user) => {
                  const isYou = publicKey?.toBase58() === user.publicKey;
                  return (
                    <tr
                      key={user.publicKey}
                      className={`
                        border-b border-foreground/10
                        ${isYou ? "bg-foreground/10" : ""}
                        hover:bg-foreground/8 transition-colors
                      `}
                    >
                      {/* Rank */}
                      <td className="p-4">
                        <span className="font-bold text-yellow-400">
                          {user.rank === 1 && "1st place"}
                          {user.rank === 2 && "2nd place"}
                          {user.rank === 3 && "3rd place"}
                          {user.rank > 3 && `#${user.rank}`}
                        </span>
                      </td>

                      {/* Player */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{user.username}</span>
                          {isYou && (
                            <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                              You
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Score */}
                      <td className="p-4">
                        <span className="font-bold text-yellow-400">{user.score}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}