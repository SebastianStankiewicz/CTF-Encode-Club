"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/app/providers/auth-context";
import bs58 from "bs58";
import { SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { web3, AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import "../../globals.css";
import { CtfAnchor } from "../../../target/types/ctf_anchor";
import * as assert from "assert";

//import idl from "@/target/idl/ctf_anchor.json"; // Anchor IDL
import idl from "@/rust-config//ctf_anchor.json"
const PROGRAM_ID = new web3.PublicKey(
  "9NYLcKqUvux8fz8qxpwnEveosrZS7TG6oHn1FSPLkMjt",
); // CHANGE THIS TO THE NEW CONTRACT ADDY

// File Download Component
const FileDownloadLink = ({
  storageId,
  fileName,
  index,
}: {
  storageId: string;
  fileName?: string;
  index: number;
}) => {
  const fileUrl = useQuery(api.myFunctions.getFileUrl, { storageId });

  if (!fileUrl) {
    return (
      <div className="p-3 bg-foreground/5 border border-foreground/10 rounded-lg">
        <div className="flex items-center gap-2 text-foreground/60">
          <span className="animate-spin">⏳</span>
          <span>Loading file...</span>
        </div>
      </div>
    );
  }

  const displayName = fileName || `File ${index + 1}`;

  return (
    <a
      href={fileUrl}
      download={displayName}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-3 bg-foreground/5 border border-foreground/10 text-blue-400 rounded-lg hover:bg-foreground/10 transition font-medium flex items-center gap-2"
    >
      <span>📎</span>
      <span>{displayName}</span>
      <span className="ml-auto text-xs text-foreground/40">Download</span>
    </a>
  );
};

export default function ChallengePage() {
  async function computeFlagSha256(flagString: string) {
    try {
      if (!crypto || !crypto.subtle) {
        throw new Error(
          "crypto.subtle is undefined — wrong environment or shadowed import",
        );
      }
      const enc = new TextEncoder();
      const data = enc.encode(flagString);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      return new Uint8Array(hashBuffer);
    } catch (err) {
      console.error("❌ [computeFlagSha256] FAILED:", err);
      throw err;
    }
  }

  const params = useParams();
  const slug = params.slug as string;
  const { publicKey, signMessage, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { isSignedIn, setIsSignedIn } = useAuth();

  const challenge = useQuery(api.myFunctions.getChallengeBySlug, { slug });
  const comments = useQuery(
    api.myFunctions.getChallengeComments,
    challenge ? { challengeId: challenge._id } : "skip",
  );

  const verifyOrCreateUser = useMutation(api.myFunctions.verifyOrCreateUser);
  const addComment = useMutation(api.myFunctions.addComment);
  const submitFlag = useMutation(api.myFunctions.submitFlag);
  const recordTip = useMutation(api.myFunctions.recordTip);

  const [flagSubmission, setFlagSubmission] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [tipAmount, setTipAmount] = useState("");
  const [isTipping, setIsTipping] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);

  const [commentText, setCommentText] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);

  // Auto-dismiss submission result popup after 5 seconds
  useEffect(() => {
    if (submissionResult) {
      const timer = setTimeout(() => setSubmissionResult(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [submissionResult]);

  // Sign in handler
  const handleSignIn = useCallback(async () => {
    if (!publicKey || !signMessage) {
      alert("Please connect your wallet first.");
      return;
    }

    setIsSigningIn(true);
    try {
      const message = new TextEncoder().encode("Sign in to CTF Manager");
      const signature = await signMessage(message);

      const result = await verifyOrCreateUser({
        publicKey: publicKey.toBase58(),
      });

      if (result.status === "created" || result.status === "logged_in") {
        setIsSignedIn(true);
        alert(
          `Welcome ${result.status === "created" ? "new user" : "back"}: ${publicKey
            .toBase58()
            .slice(0, 6)}...`,
        );
      }
    } catch (err) {
      console.error("Signing failed:", err);
      alert("Sign-in failed.");
    } finally {
      setIsSigningIn(false);
    }
  }, [publicKey, signMessage, verifyOrCreateUser, setIsSignedIn]);

  // Submit flag handler
  const handleFlagSubmit = async () => {
    if (!flagSubmission.trim()) {
      alert("Please enter a flag.");
      return;
    }
    if (!challenge) return;

    setIsSubmitting(true);
    try {
      const connection = new web3.Connection("https://api.devnet.solana.com");
      const provider = new AnchorProvider(connection, window.solana, {
        preflightCommitment: "processed",
      });
      const program = new Program<CtfAnchor>(idl as CtfAnchor, provider);

      // Try Anchor on-chain submission
      try {
        await program.methods
          .submitGuess(flagSubmission.trim(), challenge.bump)
          .accounts({
            guesser: publicKey,
            challenge: challenge.challengePDA,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
      } catch (txErr: any) {
        console.warn("Transaction failed, continuing with hash check:", txErr);
      }

      // SHA256 check
      const hashBytes = await computeFlagSha256(flagSubmission.trim());
      const newComparison = new Uint8Array(32);
      newComparison.set(hashBytes);

      const submittedHash = Array.from(newComparison).join(",");
      const storedHash = challenge.flagHash;

      if (submittedHash === storedHash) {
        await submitFlag({
          challengeId: challenge._id,
          userPublicKey: publicKey.toBase58(),
          flagSubmission: flagSubmission.trim(),
        });

        setSubmissionResult({
          success: true,
          message: "🎉 Correct! Flag accepted and points awarded.",
        });
        setFlagSubmission("");
      } else {
        setSubmissionResult({
          success: false,
          message: "❌ Incorrect flag. Try again.",
        });
      }
    } catch (err: any) {
      console.error(err);
      setSubmissionResult({
        success: false,
        message: "❌ Error submitting flag. Check console for details.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tip handler
  const handleTip = async () => {
    if (!publicKey || !challenge || !tipAmount || !challenge.creatorPublicKey) {
      alert(
        !challenge.creatorPublicKey
          ? "Creator information not available for this challenge."
          : "Please enter a tip amount.",
      );
      return;
    }

    const amount = parseFloat(tipAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    setIsTipping(true);
    try {
      const creatorPubkey = new web3.PublicKey(challenge.creatorPublicKey);
      const transaction = new web3.Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: creatorPubkey,
          lamports: amount * LAMPORTS_PER_SOL,
        }),
      );
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "confirmed");

      await recordTip({
        challengeId: challenge._id,
        fromPublicKey: publicKey.toBase58(),
        toPublicKey: challenge.creatorPublicKey,
        amount: amount,
        signature: signature,
      });

      alert(`Successfully tipped ${amount} SOL to challenge creator!`);
      setTipAmount("");
      setShowTipModal(false);
    } catch (err) {
      console.error("Tipping failed:", err);
      alert("Tip transaction failed. Please try again.");
    } finally {
      setIsTipping(false);
    }
  };

  // Comment handler
  const handleAddComment = async () => {
    if (!publicKey || !challenge || !commentText.trim()) {
      alert("Please enter a comment.");
      return;
    }
    if (!isSignedIn) {
      alert("Please sign in first.");
      return;
    }

    setIsCommenting(true);
    try {
      await addComment({
        challengeId: challenge._id,
        publicKey: publicKey.toBase58(),
        text: commentText.trim(),
      });

      setCommentText("");
      alert("Comment added successfully!");
    } catch (err) {
      console.error("Comment failed:", err);
      alert("Failed to add comment. Please try again.");
    } finally {
      setIsCommenting(false);
    }
  };

  // Challenge status helpers
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
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  const isHintVisible = (hintReleaseDate?: string) => {
    if (!hintReleaseDate) return true;
    return new Date() >= new Date(hintReleaseDate);
  };

  if (challenge === undefined) {
    return (
      <div className="min-h-screen bg-background text-foreground p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-foreground/60">Loading challenge...</p>
        </div>
      </div>
    );
  }

  if (challenge === null) {
    return (
      <div className="min-h-screen bg-background text-foreground p-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">404</h1>
          <p className="text-xl text-foreground/60 mb-6">Challenge not found</p>
          <Link
            href="/challenges"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            ← Back to Challenges
          </Link>
        </div>
      </div>
    );
  }

  const status = getChallengeStatus(challenge.startDate, challenge.endDate);
  const isActive = status === "active";
  const daysUntilEnd = getDaysUntilEnd(challenge.endDate);
  const hintVisible = isHintVisible(challenge.hintReleaseDate);

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            href="/challenges"
            className="inline-flex items-center text-foreground/60 hover:text-foreground transition"
          >
            ← Back to Challenges
          </Link>
        </div>

        {/* Challenge Header */}
        <div className="mb-6 p-6 bg-foreground/5 border border-foreground/10 rounded-lg">
          <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className={`px-3 py-1 text-sm font-semibold rounded-full ${
                  status === "active"
                    ? "bg-green-500/10 text-green-400 border border-green-500/20"
                    : status === "upcoming"
                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                }`}
              >
                {status.toUpperCase()}
              </span>
              <span className="px-3 py-1 text-sm font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {(challenge.challengeType || "misc").toUpperCase()}
              </span>
              {isActive && daysUntilEnd <= 3 && (
                <span className="px-3 py-1 text-sm font-semibold rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  {daysUntilEnd} day{daysUntilEnd !== 1 ? "s" : ""} left
                </span>
              )}
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-400">
                {challenge.prizeAmount} SOL
              </div>
              <div className="text-sm text-foreground/60">Prize Pool</div>

              {challenge.solveCount !== undefined &&
                challenge.solveCount >= 1 && (
                  <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <span>
                      This challenge has already been solved ({challenge.solveCount}{" "}
                      {challenge.solveCount === 1 ? "solver" : "solvers"}). No prize
                      remaining. You can still solve it for points.
                    </span>
                  </div>
                )}
            </div>
          </div>

          <h1 className="text-4xl font-bold font-mono mb-4">
            {challenge.title || `Challenge #${challenge._id.slice(-6)}`}
          </h1>

          {challenge.flagDetails && (
            <p className="text-lg text-foreground/80 mb-4 whitespace-pre-wrap">
              {challenge.flagDetails}
            </p>
          )}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 border border-foreground/10 bg-foreground/5 rounded-lg">
              <h2 className="text-xl font-semibold font-mono mb-4">
                Challenge Information
              </h2>

              {challenge.flagFormat && (
                <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <h3 className="font-semibold text-blue-400 mb-2">
                    Flag Format
                  </h3>
                  <code className="text-blue-300 font-mono text-sm">
                    {challenge.flagFormat}
                  </code>
                </div>
              )}

              {challenge.hint && (
                <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <h3 className="font-semibold text-blue-400 mb-2">Hint</h3>
                  {hintVisible ? (
                    <p className="text-blue-300 whitespace-pre-wrap">
                      {challenge.hint}
                    </p>
                  ) : (
                    <p className="text-blue-400/60">
                      Hint will be released on{" "}
                      {new Date(
                        challenge.hintReleaseDate!,
                      ).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}

              {challenge.files && challenge.files.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <span>Challenge Files</span>
                    <span className="text-sm text-foreground/60 font-normal">
                      ({challenge.files.length})
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {challenge.files.map((storageId: string, index: number) => (
                      <FileDownloadLink
                        key={index}
                        storageId={storageId}
                        fileName={challenge.fileNames?.[index]}
                        index={index}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Comments Section */}
            <div className="p-6 border border-foreground/10 bg-foreground/5 rounded-lg">
              <h2 className="text-xl font-semibold font-mono mb-4">Comments</h2>

              {isSignedIn ? (
                <div className="mb-6">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Share your thoughts, hints, or ask questions..."
                    rows={3}
                    className="w-full p-3 rounded-lg bg-foreground/5 border border-foreground/10 text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={isCommenting || !commentText.trim()}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium"
                  >
                    {isCommenting ? "Posting..." : "Post Comment"}
                  </button>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center">
                  <p className="text-blue-400 text-sm">
                    Please sign in to comment
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {comments === undefined ? (
                  <p className="text-foreground/60 text-center py-4">
                    Loading comments...
                  </p>
                ) : comments.length === 0 ? (
                  <p className="text-foreground/60 text-center py-4">
                    No comments yet. Be the first to comment!
                  </p>
                ) : (
                  comments.map((comment: any) => (
                    <div
                      key={comment._id}
                      className="p-4 bg-foreground/5 border border-foreground/10 rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-2">
                        {comment.userPublicKey ? (
                          <Link
                            href={`/profile/${comment.userPublicKey}`}
                            className="font-mono text-sm text-blue-400 hover:text-blue-300 transition"
                          >
                            {comment.userPublicKey.slice(0, 6)}...
                            {comment.userPublicKey.slice(-4)}
                          </Link>
                        ) : (
                          <span className="font-mono text-sm text-foreground/40">
                            Unknown User
                          </span>
                        )}
                        <span className="text-xs text-foreground/50">
                          {new Date(
                            comment.createdAt || comment._creationTime,
                          ).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-foreground/80 whitespace-pre-wrap">
                        {comment.text}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Section */}
          <div className="space-y-6">
            {!isSignedIn && (
              <div className="p-6 border border-foreground/10 bg-foreground/5 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Sign In Required</h3>
                <p className="text-foreground/70 mb-4 text-sm">
                  Connect your wallet and sign in to submit flags and earn
                  rewards.
                </p>
                <button
                  onClick={handleSignIn}
                  disabled={isSigningIn}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium"
                >
                  {isSigningIn ? "Signing In..." : "Sign In to Submit"}
                </button>
              </div>
            )}

            {isSignedIn && (
              <div className="p-6 border border-foreground/10 bg-foreground/5 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Submit Flag</h3>

                {!isActive ? (
                  <div className="text-center py-4">
                    <p className="text-foreground/60 mb-2">
                      {status === "upcoming"
                        ? "Challenge hasn't started yet"
                        : "Challenge has ended"}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <input
                        type="text"
                        value={flagSubmission}
                        onChange={(e) => setFlagSubmission(e.target.value)}
                        placeholder="Enter your flag here..."
                        className="w-full p-3 border border-foreground/20 rounded-lg bg-background/50 text-foreground placeholder-foreground/50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition font-mono"
                        onKeyPress={(e) =>
                          e.key === "Enter" && handleFlagSubmit()
                        }
                      />
                    </div>

                    <button
                      onClick={handleFlagSubmit}
                      disabled={isSubmitting || !flagSubmission.trim()}
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium"
                    >
                      {isSubmitting ? "Submitting..." : "Submit Flag"}
                    </button>
                  </>
                )}

                {submissionResult && (
                  <div
                    className={`mt-4 p-4 rounded-lg ${
                      submissionResult.success
                        ? "bg-green-500/10 border border-green-500/20"
                        : "bg-red-500/10 border border-red-500/20"
                    }`}
                  >
                    <p
                      className={`font-medium ${
                        submissionResult.success
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {submissionResult.message}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Challenge Info */}
            <div className="p-6 border border-foreground/10 bg-foreground/5 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">Challenge Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-foreground/70">Category:</span>
                  <span className="font-mono font-medium">
                    {challenge.challengeType || "misc"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/70">Prize:</span>
                  <span className="font-mono font-bold text-blue-400">
                    {challenge.prizeAmount} SOL
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/70">Created:</span>
                  <span className="font-mono">
                    {new Date(challenge._creationTime).toLocaleDateString()}
                  </span>
                </div>
                {challenge.files && challenge.files.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-foreground/70">Files:</span>
                    <span className="font-mono">{challenge.files.length}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tip Modal */}
      {showTipModal && challenge.creatorPublicKey && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-foreground/10 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-2xl font-bold mb-4">
              💰 Tip Challenge Creator
            </h3>
            <p className="text-foreground/70 mb-4 text-sm">
              Support the creator of this challenge by sending them SOL directly
              on-chain.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground/60 mb-2">
                Amount (SOL)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={tipAmount}
                onChange={(e) => setTipAmount(e.target.value)}
                placeholder="0.0"
                className="w-full p-3 rounded-lg bg-foreground/5 border border-foreground/10 text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowTipModal(false)}
                className="flex-1 px-4 py-3 bg-foreground/5 border border-foreground/10 text-foreground rounded-lg hover:bg-foreground/10 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleTip}
                disabled={isTipping || !tipAmount || parseFloat(tipAmount) <= 0}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium"
              >
                {isTipping ? "Sending..." : "Send Tip"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}