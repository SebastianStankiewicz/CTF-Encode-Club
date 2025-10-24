"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAuth } from "@/app/providers/auth-context";
import { useState, useCallback } from "react";
import Link from "next/link";
import bs58 from "bs58";

export default function ChallengePage() {
  const params = useParams();
  const slug = params.slug as string;
  const { publicKey, signMessage, connected } = useWallet();
  const { isSignedIn, setIsSignedIn } = useAuth();
  
  const challenge = useQuery(api.myFunctions.getChallengeBySlug, { slug });
  const verifyOrCreateUser = useMutation(api.myFunctions.verifyOrCreateUser);

  const [flagSubmission, setFlagSubmission] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{ success: boolean; message: string } | null>(null);

  // Sign in handler
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

  // Submit flag handler
  const handleFlagSubmit = async () => {
    if (!flagSubmission.trim()) {
      alert("Please enter a flag");
      return;
    }

    if (!challenge) return;

    setIsSubmitting(true);
    try {
      // Check if submitted flag matches the solution
      if (flagSubmission.trim() === challenge.flagSolution) {
        setSubmissionResult({
          success: true,
          message: `Correct! You solved the challenge and earned ${challenge.prizeAmount} SOL!`
        });
        setFlagSubmission("");
      } else {
        setSubmissionResult({
          success: false,
          message: "Incorrect flag. Try again!"
        });
      }
    } catch (err) {
      console.error("Flag submission failed:", err);
      setSubmissionResult({
        success: false,
        message: "Error submitting flag. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get challenge status
  const getChallengeStatus = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (now < start) return "upcoming";
    if (now > end) return "ended";
    return "active";
  };

  // Days until end
  const getDaysUntilEnd = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Loading state
  if (challenge === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-foreground/60">Loading challenge...</p>
        </div>
      </div>
    );
  }

  // Challenge not found
  if (challenge === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">404</h1>
          <p className="text-xl text-foreground/60 mb-6">Challenge not found</p>
          <Link 
            href="/challenges" 
            className="inline-block px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition font-medium"
          >
            Back to Challenges
          </Link>
        </div>
      </div>
    );
  }

  const status = getChallengeStatus(challenge.startDate, challenge.endDate);
  const isActive = status === "active";
  const daysUntilEnd = getDaysUntilEnd(challenge.endDate);

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Back Navigation */}
      <div className="mb-6">
        <Link 
          href="/challenges"
          className="inline-flex items-center text-foreground/60 hover:text-foreground transition"
        >
          ← Back to Challenges
        </Link>
      </div>

      {/* Challenge Header */}
      <div className="mb-8 p-6 bg-foreground/5 border border-foreground/10 rounded-lg">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className={`px-3 py-1 text-sm font-semibold rounded-full ${
                status === "active"
                  ? "bg-green-100 text-green-800"
                  : status === "upcoming"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {status.toUpperCase()}
            </span>
            <span className="px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
              {challenge.challengeType?.toUpperCase() || "MISC"}
            </span>
            {isActive && daysUntilEnd <= 3 && (
              <span className="px-3 py-1 text-sm font-semibold rounded-full bg-orange-100 text-orange-800">
                {daysUntilEnd} day{daysUntilEnd !== 1 ? "s" : ""} left
              </span>
            )}
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-purple-600">
              {challenge.prizeAmount} SOL
            </div>
            <div className="text-sm text-foreground/60">Prize Pool</div>
          </div>
        </div>

        <h1 className="text-4xl font-bold font-mono text-foreground mb-4">
          Challenge #{challenge._id.slice(-6)}
        </h1>
        
        {challenge.flagDetails && (
          <p className="text-lg text-foreground/80 mb-4">
            {challenge.flagDetails}
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-foreground/70">
          <div>
            <span className="font-semibold">Start Date:</span>
            <span className="ml-2 font-mono">{new Date(challenge.startDate).toLocaleDateString()}</span>
          </div>
          <div>
            <span className="font-semibold">End Date:</span>
            <span className="ml-2 font-mono">{new Date(challenge.endDate).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Challenge Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Challenge Details */}
          <div className="p-6 border border-foreground/10 bg-foreground/5 rounded-lg">
            <h2 className="text-xl font-semibold font-mono text-foreground mb-4">
              Challenge Details
            </h2>
            
            {challenge.hint && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="font-semibold text-yellow-800 mb-2">Hint</h3>
                <p className="text-yellow-700">{challenge.hint}</p>
                {challenge.hintReleaseDate && (
                  <p className="text-xs text-yellow-600 mt-2">
                    Released: {new Date(challenge.hintReleaseDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

            {challenge.flagFormat && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">Flag Format</h3>
                <code className="text-blue-700 font-mono">{challenge.flagFormat}</code>
              </div>
            )}

            {/* Challenge Files */}
            {challenge.files && challenge.files.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-foreground mb-3">Challenge Files</h3>
                <div className="space-y-2">
                  {challenge.files.map((file: string, index: number) => (
                    <a 
                      key={index}
                      href={file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition font-medium"
                    >
                      Download File {index + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submission Panel */}
        <div className="space-y-6">
          {/* Sign In Prompt */}
          {!isSignedIn && (
            <div className="p-6 border border-foreground/10 bg-foreground/5 rounded-lg">
              <h3 className="text-lg font-semibold text-foreground mb-3">
                Sign In Required
              </h3>
              <p className="text-foreground/70 mb-4">
                Connect your wallet and sign in to submit flags and earn rewards.
              </p>
              <button
                onClick={handleSignIn}
                disabled={!connected || isSigningIn}
                className="w-full px-4 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition disabled:opacity-50 font-medium"
              >
                {isSigningIn ? "Signing In..." : "Sign In to Submit"}
              </button>
            </div>
          )}

          {/* Flag Submission */}
          {isSignedIn && (
            <div className="p-6 border border-foreground/10 bg-foreground/5 rounded-lg">
              <h3 className="text-lg font-semibold text-foreground mb-3">
                Submit Flag
              </h3>
              
              {!isActive ? (
                <div className="text-center py-4">
                  <p className="text-foreground/60 mb-2">
                    {status === "upcoming" ? "Challenge hasn't started yet" : "Challenge has ended"}
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
                      className="w-full p-3 border border-foreground/20 rounded-md bg-background/50 text-foreground placeholder-foreground/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition font-mono"
                      onKeyPress={(e) => e.key === "Enter" && handleFlagSubmit()}
                    />
                  </div>
                  
                  <button
                    onClick={handleFlagSubmit}
                    disabled={isSubmitting || !flagSubmission.trim()}
                    className="w-full px-4 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition disabled:opacity-50 font-medium"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Flag"}
                  </button>
                </>
              )}

              {/* Submission Result */}
              {submissionResult && (
                <div className={`mt-4 p-4 rounded-lg ${
                  submissionResult.success 
                    ? "bg-green-50 border border-green-200" 
                    : "bg-red-50 border border-red-200"
                }`}>
                  <p className={`font-medium ${
                    submissionResult.success ? "text-green-800" : "text-red-800"
                  }`}>
                    {submissionResult.message}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Challenge Info */}
          <div className="p-6 border border-foreground/10 bg-foreground/5 rounded-lg">
            <h3 className="text-lg font-semibold text-foreground mb-3">
              Challenge Info
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-foreground/70">Category:</span>
                <span className="font-mono">{challenge.challengeType || "misc"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/70">Prize:</span>
                <span className="font-mono font-bold text-purple-600">{challenge.prizeAmount} SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/70">Created:</span>
                <span className="font-mono">{new Date(challenge._creationTime).toLocaleDateString()}</span>
              </div>
              {challenge.files && (
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
  );
}