"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import { useCallback, useState, useMemo } from "react";
import { useAuth } from "@/app/providers/auth-context";
import Link from "next/link";

export default function ChallengesPage() {
  return (
    <main className="min-h-screen p-8 flex flex-col gap-8">
      <Content />
    </main>
  );
}

function Content() {
  const { publicKey, signMessage, connected } = useWallet();
  const { isSignedIn, setIsSignedIn } = useAuth();
  const verifyOrCreateUser = useMutation(api.myFunctions.verifyOrCreateUser);
  const challenges = useQuery(api.myFunctions.getAllChallenges, { limit: 50 });

  const [isSigningIn, setIsSigningIn] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

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
  }, [connected, publicKey, signMessage, verifyOrCreateUser, setIsSignedIn]);

  const getChallengeStatus = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (now < start) return "upcoming";
    if (now > end) return "ended";
    return "active";
  };

  const getDaysUntilEnd = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredAndSortedChallenges = useMemo(() => {
    if (!challenges) return [];

    let filtered = challenges.filter((challenge) => {
      const matchesSearch =
        challenge.flagDetails?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        challenge._id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        challenge.challengeType?.toLowerCase().includes(searchTerm.toLowerCase());

      const status = getChallengeStatus(challenge.startDate, challenge.endDate);
      const matchesType =
        filterType === "all" ||
        (filterType === "active" && status === "active") ||
        (filterType === "upcoming" && status === "upcoming") ||
        (filterType === "ended" && status === "ended");

      const matchesCategory =
        filterCategory === "all" || challenge.challengeType === filterCategory;

      return matchesSearch && matchesType && matchesCategory;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return b._creationTime - a._creationTime;
        case "oldest":
          return a._creationTime - b._creationTime;
        case "prize-high":
          return b.prizeAmount - a.prizeAmount;
        case "prize-low":
          return a.prizeAmount - b.prizeAmount;
        case "ending-soon":
          const daysA = getDaysUntilEnd(a.endDate);
          const daysB = getDaysUntilEnd(b.endDate);
          return daysA - daysB;
        default:
          return 0;
      }
    });

    return filtered;
  }, [challenges, searchTerm, filterType, filterCategory, sortBy]);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold font-mono text-foreground mb-4">
          CTF Challenges
        </h1>
        <p className="text-foreground/70 text-lg">
          Solve capture-the-flag challenges and earn SOL prizes
        </p>

        {!isSignedIn && (
          <div className="flex items-center gap-4 mt-6 p-4 bg-foreground/5 border border-foreground/10 rounded-lg">
            <button
              onClick={handleSignIn}
              disabled={!connected || isSigningIn}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50 font-medium"
            >
              {isSigningIn ? "Signing In..." : "Sign In to Participate"}
            </button>
            <p className="text-sm text-foreground/60">
              Connect your wallet and sign in to submit flags
            </p>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mb-8 p-6 bg-foreground/5 border border-foreground/10 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              Search Challenges
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by description or ID..."
              className="w-full p-3 rounded-md border border-foreground/20 bg-background/50 text-foreground placeholder-foreground/50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              Filter by Status
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full p-3 rounded-md border border-foreground/20 bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="upcoming">Upcoming</option>
              <option value="ended">Ended</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              Filter by Category
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full p-3 rounded-md border border-foreground/20 bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value="all">All Categories</option>
              <option value="web">Web</option>
              <option value="pwn">Pwn</option>
              <option value="reverse">Reverse</option>
              <option value="osint">OSINT</option>
              <option value="forensics">Forensics</option>
              <option value="misc">Misc</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              Sort by
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full p-3 rounded-md border border-foreground/20 bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="prize-high">Highest Prize</option>
              <option value="prize-low">Lowest Prize</option>
              <option value="ending-soon">Ending Soonest</option>
            </select>
          </div>
        </div>
      </div>

      {challenges && (
        <div className="mb-6 text-sm text-foreground/60">
          Showing {filteredAndSortedChallenges.length} of {challenges.length} challenges
        </div>
      )}

      {/* Challenge Grid */}
      {challenges === undefined ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-foreground/60">Loading challenges...</p>
        </div>
      ) : filteredAndSortedChallenges.length === 0 ? (
        <div className="text-center py-16 border border-foreground/10 bg-foreground/5 rounded-lg">
          <h3 className="text-xl font-semibold mb-2">No Challenges Found</h3>
          <p className="text-foreground/60 mb-6">
            {challenges.length === 0
              ? "There are currently no challenges available."
              : "No challenges match your current filters."}
          </p>
          {challenges.length === 0 && (
            <Link
              href="/create"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium"
            >
              Create the First Challenge
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedChallenges.map((challenge) => {
            const status = getChallengeStatus(challenge.startDate, challenge.endDate);
            const daysUntilEnd = getDaysUntilEnd(challenge.endDate);

            return (
              <Link
                key={challenge._id}
                href={`/challenges/${challenge._id}`}
                className="block group"
              >
                <div
                  className={`h-full border rounded-lg p-6 transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer ${
                    status === "active"
                      ? "border-blue-500/50 bg-blue-50/5 hover:border-blue-500"
                      : status === "upcoming"
                      ? "border-blue-300/50 bg-blue-50/5 hover:border-blue-400"
                      : "border-blue-900/50 bg-blue-50/5 hover:border-blue-700"
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          status === "active"
                            ? "bg-blue-100 text-blue-800"
                            : status === "upcoming"
                            ? "bg-blue-200 text-blue-900"
                            : "bg-blue-950 text-blue-100"
                        }`}
                      >
                        {status.toUpperCase()}
                      </span>
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                        {challenge.challengeType?.toUpperCase() || "MISC"}
                      </span>
                      {status === "active" && daysUntilEnd <= 3 && (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {daysUntilEnd}d left
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-blue-600">
                        {challenge.prizeAmount}
                      </div>
                      <div className="text-xs text-foreground/60">SOL</div>
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold font-mono mb-3 group-hover:text-blue-600 transition-colors">
                    Challenge #{challenge._id.slice(-6)}
                  </h3>

                  <p className="text-foreground/80 text-sm mb-4 line-clamp-3">
                    {challenge.flagDetails || "No description available"}
                  </p>

                  <div className="space-y-2 text-xs text-foreground/60 mb-4">
                    <div className="flex justify-between">
                      <span>Start:</span>
                      <span className="font-mono">
                        {new Date(challenge.startDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>End:</span>
                      <span className="font-mono">
                        {new Date(challenge.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    {challenge.files && challenge.files.length > 0 && (
                      <div className="flex justify-between">
                        <span>Files:</span>
                        <span className="font-mono">{challenge.files.length} file(s)</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-foreground/10">
                    <div className="text-xs text-foreground/50 font-mono">
                      {new Date(challenge._creationTime).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {isSignedIn && challenges && challenges.length > 0 && (
        <div className="mt-12 text-center py-8 border border-foreground/10 bg-foreground/5 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Want to create your own challenge?</h3>
          <p className="text-foreground/60 mb-4">
            Create and host your own CTF challenges for the community
          </p>
          <Link
            href="/create"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium"
          >
            Create New Challenge
          </Link>
        </div>
      )}
    </div>
  );
}
