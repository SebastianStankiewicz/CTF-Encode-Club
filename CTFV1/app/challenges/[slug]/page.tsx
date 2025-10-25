"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/app/providers/auth-context";
import bs58 from "bs58";
import { SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as web3 from "@solana/web3.js";
import "../../globals.css";

// File Download Component - MUST be outside ChallengePage
const FileDownloadLink = ({ storageId, fileName, index }: { storageId: string; fileName?: string; index: number }) => {
  const fileUrl = useQuery(api.myFunctions.getFileUrl, { storageId });
  
  if (!fileUrl) {
    return (
      <div className="p-3 bg-foreground/5 border border-foreground/10 rounded-lg">
        <div className="flex items-center gap-2 text-foreground/60">
          <span className="animate-spin">Loading...</span>
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
      <span>{displayName}</span>
      <span className="ml-auto text-xs text-foreground/40">Download</span>
    </a>
  );
};

export default function ChallengePage() {
  const params = useParams();
  const slug = params.slug as string;
  const { publicKey, signMessage, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { isSignedIn, setIsSignedIn } = useAuth();
  
  const challenge = useQuery(api.myFunctions.getChallengeBySlug, { slug });
  const comments = useQuery(
    api.myFunctions.getChallengeComments,
    challenge ? { challengeId: challenge._id } : "skip"
  );
  const verifyOrCreateUser = useMutation(api.myFunctions.verifyOrCreateUser);
  const addComment = useMutation(api.myFunctions.addComment);
  const recordTip = useMutation(api.myFunctions.recordTip);
  const leaderboard = useQuery(
    api.myFunctions.getChallengeLeaderboard,
    challenge ? { challengeId: challenge._id } : "skip"
  );
  
  const writeups = useQuery(
    api.myFunctions.getChallengeWriteups,
    challenge ? { challengeId: challenge._id } : "skip"
  );

  const submitFlag = useMutation(api.myFunctions.submitFlag);
  const submitWriteup = useMutation(api.myFunctions.submitWriteup);
  const tipWithPoints = useMutation(api.myFunctions.tipWithPoints);

  const [flagSubmission, setFlagSubmission] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // Tipping state
  const [tipAmount, setTipAmount] = useState("");
  const [isTipping, setIsTipping] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  
  // Comment state
  const [commentText, setCommentText] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [writeupTitle, setWriteupTitle] = useState("");
  const [writeupContent, setWriteupContent] = useState("");
  const [showWriteupModal, setShowWriteupModal] = useState(false);
  const [tipPointsAmount, setTipPointsAmount] = useState("");
  const [showPointsTipModal, setShowPointsTipModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "leaderboard" | "writeups">("details");

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
  }, [publicKey, signMessage, verifyOrCreateUser, setIsSignedIn]);

  // Updated flag submit handler
  const handleFlagSubmit = async () => {
    if (!flagSubmission.trim() || !challenge || !publicKey) return;

    setIsSubmitting(true);
    try {
      const result = await submitFlag({
        challengeId: challenge._id,
        userPublicKey: publicKey.toBase58(),
        flagSubmission: flagSubmission.trim(),
      });

      setSubmissionResult(result);
      if (result.success) {
        setFlagSubmission("");
      }
    } catch (err) {
      console.error("Flag submission failed:", err);
      setSubmissionResult({
        success: false,
        message: "Error submitting flag. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tip handler
  const handleTip = async () => {
    if (!publicKey || !challenge || !tipAmount || !challenge.creatorPublicKey) {
      alert(!challenge.creatorPublicKey ? "Creator information not available for this challenge." : "Please enter a tip amount.");
      return;
    }

    const amount = parseFloat(tipAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    setIsTipping(true);
    try {
      // Get creator's public key
      const creatorPubkey = new web3.PublicKey(challenge.creatorPublicKey);
      
      // Create transaction
      const transaction = new web3.Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: creatorPubkey,
          lamports: amount * LAMPORTS_PER_SOL,
        })
      );

      // Send transaction
      const signature = await sendTransaction(transaction, connection);
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      // Record tip in database
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

  // Writeup submit handler
  const handleSubmitWriteup = async () => {
    if (!writeupTitle.trim() || !writeupContent.trim() || !challenge || !publicKey) return;

    try {
      await submitWriteup({
        challengeId: challenge._id,
        userPublicKey: publicKey.toBase58(),
        title: writeupTitle,
        content: writeupContent,
      });

      alert("Writeup submitted successfully!");
      setWriteupTitle("");
      setWriteupContent("");
      setShowWriteupModal(false);
    } catch (err) {
      console.error("Writeup submission failed:", err);
      alert("Failed to submit writeup. " + (err as Error).message);
    }
  };

  // Points tip handler
  const handlePointsTip = async () => {
    if (!publicKey || !challenge || !tipPointsAmount || !challenge.creatorPublicKey) return;

    const amount = parseInt(tipPointsAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    try {
      await tipWithPoints({
        fromPublicKey: publicKey.toBase58(),
        toPublicKey: challenge.creatorPublicKey,
        amount: amount,
        challengeId: challenge._id,
      });

      alert(`Successfully tipped ${amount} points!`);
      setTipPointsAmount("");
      setShowPointsTipModal(false);
    } catch (err) {
      console.error("Points tip failed:", err);
      alert("Failed to tip points. " + (err as Error).message);
    }
  };

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

  // Loading
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

  // Not found
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
      <div className="max-w-6xl mx-auto">
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
              <div className="text-3xl font-bold text-blue-400">{challenge.prizeAmount} SOL</div>
              <div className="text-sm text-foreground/60">Prize Pool</div>
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

          {/* Creator Info & Tip Button */}
          <div className="flex items-center justify-between pt-4 border-t border-foreground/10">
            <div className="text-sm text-foreground/60">
              {challenge.creatorPublicKey ? (
                <>
                  Created by{" "}
                  <Link
                    href={`/profile/${challenge.creatorPublicKey}`}
                    className="font-mono text-blue-400 hover:text-blue-300 transition"
                  >
                    {challenge.creatorPublicKey.slice(0, 6)}...{challenge.creatorPublicKey.slice(-4)}
                  </Link>
                </>
              ) : (
                <span className="font-mono text-foreground/40">Creator: Unknown</span>
              )}
            </div>
            {challenge.creatorPublicKey && (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowTipModal(true)}
                  disabled={!isSignedIn}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium text-sm"
                >
                  Tip SOL
                </button>
                <button
                  onClick={() => setShowPointsTipModal(true)}
                  disabled={!isSignedIn}
                  className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 font-medium text-sm"
                >
                  Tip Points
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Section - Tabs */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tab Navigation */}
            <div className="flex gap-2 p-1 bg-foreground/5 border border-foreground/10 rounded-lg">
              <button
                onClick={() => setActiveTab("details")}
                className={`flex-1 px-4 py-2 rounded-md font-medium transition ${
                  activeTab === "details"
                    ? "bg-blue-600 text-white"
                    : "text-foreground/60 hover:text-foreground hover:bg-foreground/5"
                }`}
              >
                Challenge Details
              </button>
              <button
                onClick={() => setActiveTab("leaderboard")}
                className={`flex-1 px-4 py-2 rounded-md font-medium transition ${
                  activeTab === "leaderboard"
                    ? "bg-blue-600 text-white"
                    : "text-foreground/60 hover:text-foreground hover:bg-foreground/5"
                }`}
              >
                Leaderboard
              </button>
              <button
                onClick={() => setActiveTab("writeups")}
                className={`flex-1 px-4 py-2 rounded-md font-medium transition ${
                  activeTab === "writeups"
                    ? "bg-blue-600 text-white"
                    : "text-foreground/60 hover:text-foreground hover:bg-foreground/5"
                }`}
              >
                Writeups
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === "details" && (
              <>
                <div className="p-6 border border-foreground/10 bg-foreground/5 rounded-lg">
                  <h2 className="text-xl font-semibold font-mono mb-4">Challenge Information</h2>

                  {challenge.flagFormat && (
                    <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <h3 className="font-semibold text-blue-400 mb-2">Flag Format</h3>
                      <code className="text-blue-300 font-mono text-sm">{challenge.flagFormat}</code>
                    </div>
                  )}

                  {challenge.hint && (
                    <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <h3 className="font-semibold text-blue-400 mb-2">Hint</h3>
                      {hintVisible ? (
                        <p className="text-blue-300 whitespace-pre-wrap">{challenge.hint}</p>
                      ) : (
                        <p className="text-blue-400/60">
                          Hint will be released on{" "}
                          {new Date(challenge.hintReleaseDate!).toLocaleDateString()}
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
                      <p className="text-foreground/60 text-center py-4">Loading comments...</p>
                    ) : comments.length === 0 ? (
                      <p className="text-foreground/60 text-center py-4">No comments yet. Be the first to comment!</p>
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
                                {comment.userPublicKey.slice(0, 6)}...{comment.userPublicKey.slice(-4)}
                              </Link>
                            ) : (
                              <span className="font-mono text-sm text-foreground/40">
                                Unknown User
                              </span>
                            )}
                            <span className="text-xs text-foreground/50">
                              {new Date(comment.createdAt || comment._creationTime).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-foreground/80 whitespace-pre-wrap">{comment.text}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}

            {activeTab === "leaderboard" && (
              <div className="p-6 border border-foreground/10 bg-foreground/5 rounded-lg">
                <h2 className="text-xl font-semibold font-mono mb-4">Leaderboard</h2>
                {leaderboard && leaderboard.length > 0 ? (
                  <div className="space-y-2">
                    {leaderboard.slice(0, 10).map((entry) => (
                      <div
                        key={entry.publicKey}
                        className="flex items-center justify-between p-3 bg-foreground/5 border border-foreground/10 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`text-lg font-bold ${
                            entry.rank === 1 ? "text-yellow-400" :
                            entry.rank === 2 ? "text-gray-400" :
                            entry.rank === 3 ? "text-orange-400" : "text-foreground/60"
                          }`}>
                            #{entry.rank}
                          </span>
                          <Link
                            href={`/profile/${entry.publicKey}`}
                            className="font-mono text-blue-400 hover:text-blue-300 transition"
                          >
                            {entry.username}
                          </Link>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-foreground/60">
                            {new Date(entry.solvedAt).toLocaleString()}
                          </div>
                          <div className="text-xs text-green-400">
                            +{entry.pointsEarned} pts
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-foreground/60 text-center py-4">No solves yet. Be the first!</p>
                )}
              </div>
            )}

            {activeTab === "writeups" && (
              <div className="p-6 border border-foreground/10 bg-foreground/5 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold font-mono">Writeups</h2>
                  <button
                    onClick={() => setShowWriteupModal(true)}
                    disabled={!isSignedIn}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium text-sm"
                  >
                    Submit Writeup
                  </button>
                </div>

                {writeups && writeups.length > 0 ? (
                  <div className="space-y-4">
                    {writeups.map((writeup) => (
                      <div
                        key={writeup._id}
                        className="p-4 bg-foreground/5 border border-foreground/10 rounded-lg"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-lg">{writeup.title}</h3>
                          <span className="text-xs text-foreground/50">
                            {writeup.upvotes} upvotes
                          </span>
                        </div>
                        <p className="text-sm text-foreground/60 mb-2">
                          by {writeup.username} • {new Date(writeup.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-foreground/80 whitespace-pre-wrap line-clamp-3">
                          {writeup.content}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-foreground/60 text-center py-4">No writeups yet. Solve the challenge to submit one!</p>
                )}
              </div>
            )}
          </div>

          {/* Right Section - Submit & Info */}
          <div className="space-y-6">
            {!isSignedIn && (
              <div className="p-6 border border-foreground/10 bg-foreground/5 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Sign In Required</h3>
                <p className="text-foreground/70 mb-4 text-sm">
                  Connect your wallet and sign in to submit flags and earn rewards.
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
                        onKeyPress={(e) => e.key === "Enter" && handleFlagSubmit()}
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
                        submissionResult.success ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {submissionResult.message}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Updated Challenge Info */}
            <div className="p-6 border border-foreground/10 bg-foreground/5 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">Challenge Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-foreground/70">Difficulty:</span>
                  <span className={`font-mono font-bold ${
                    challenge.difficulty === "easy" ? "text-green-400" :
                    challenge.difficulty === "medium" ? "text-yellow-400" :
                    "text-red-400"
                  }`}>
                    {challenge.difficulty?.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/70">Points:</span>
                  <span className="font-mono font-bold text-blue-400">
                    {challenge.pointsReward} pts
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/70">Solves:</span>
                  <span className="font-mono">
                    {challenge.solveCount || 0}
                  </span>
                </div>
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

      {/* Writeup Modal */}
      {showWriteupModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-foreground/10 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-4">Submit Writeup</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground/60 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={writeupTitle}
                  onChange={(e) => setWriteupTitle(e.target.value)}
                  placeholder="My solution to..."
                  className="w-full p-3 rounded-lg bg-foreground/5 border border-foreground/10 text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground/60 mb-2">
                  Content
                </label>
                <textarea
                  value={writeupContent}
                  onChange={(e) => setWriteupContent(e.target.value)}
                  placeholder="Explain your solution, tools used, methodology..."
                  rows={12}
                  className="w-full p-3 rounded-lg bg-foreground/5 border border-foreground/10 text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none font-mono text-sm"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowWriteupModal(false)}
                  className="flex-1 px-4 py-3 bg-foreground/5 border border-foreground/10 text-foreground rounded-lg hover:bg-foreground/10 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitWriteup}
                  disabled={!writeupTitle.trim() || !writeupContent.trim()}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium"
                >
                  Submit Writeup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Points Tip Modal */}
      {showPointsTipModal && challenge.creatorPublicKey && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-foreground/10 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-2xl font-bold mb-4">Tip with Points</h3>
            <p className="text-foreground/70 mb-4 text-sm">
              Support the creator by tipping them points from your balance.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground/60 mb-2">
                Amount (Points)
              </label>
              <input
                type="number"
                step="10"
                min="0"
                value={tipPointsAmount}
                onChange={(e) => setTipPointsAmount(e.target.value)}
                placeholder="0"
                className="w-full p-3 rounded-lg bg-foreground/5 border border-foreground/10 text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPointsTipModal(false)}
                className="flex-1 px-4 py-3 bg-foreground/5 border border-foreground/10 text-foreground rounded-lg hover:bg-foreground/10 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handlePointsTip}
                disabled={!tipPointsAmount || parseInt(tipPointsAmount) <= 0}
                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 font-medium"
              >
                Send Points
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tip Modal */}
      {showTipModal && challenge.creatorPublicKey && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-foreground/10 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-2xl font-bold mb-4">Tip Challenge Creator</h3>
            <p className="text-foreground/70 mb-4 text-sm">
              Support the creator of this challenge by sending them SOL directly on-chain.
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
                