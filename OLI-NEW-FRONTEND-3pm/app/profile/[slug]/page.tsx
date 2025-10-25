"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAuth } from "@/app/providers/auth-context";
import { useState } from "react";

export default function ProfilePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const { publicKey } = useWallet();
  const { isSignedIn } = useAuth();

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ username: "", bio: "" });
  const [isUpdating, setIsUpdating] = useState(false);

  if (!slug || Array.isArray(slug)) {
    return <ErrorState code="400" message="Invalid profile URL" />;
  }

  const user = useQuery(api.myFunctions.getUserByPublicKey, { slug });
  const updateProfile = useMutation(api.myFunctions.updateUserProfile);

  const isOwnProfile = publicKey && user && publicKey.toBase58() === user.publicKey;

  if (user === undefined) {
    return <LoadingState message="Loading profile..." />;
  }

  if (user === null) {
    return <ErrorState code="404" message="User not found" />;
  }

  const handleEditClick = () => {
    setEditForm({ username: user.username || "", bio: user.bio || "" });
    setShowEditModal(true);
  };

  const handleUpdateProfile = async () => {
    if (!publicKey || !isSignedIn) {
      alert("Please sign in to edit your profile.");
      return;
    }

    if (!editForm.username.trim()) {
      alert("Username is required.");
      return;
    }

    setIsUpdating(true);
    try {
      await updateProfile({
        publicKey: publicKey.toBase58(),
        username: editForm.username.trim(),
        bio: editForm.bio.trim() || undefined,
      });

      alert("Profile updated successfully!");
      setShowEditModal(false);
    } catch (err) {
      console.error("Profile update failed:", err);
      alert("Failed to update profile. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-12">
      <div className="max-w-2xl mx-auto bg-foreground/5 border border-foreground/10 rounded-lg p-8">
        {/* Edit Button */}
        {isOwnProfile && isSignedIn && (
          <div className="flex justify-end mb-4">
            <button
              onClick={handleEditClick}
              className="px-4 py-2 bg-foreground/10 hover:bg-foreground/20 text-foreground rounded-md text-sm font-medium transition"
            >
              Edit Profile
            </button>
          </div>
        )}

        {/* Avatar */}
        <div className="flex justify-center mb-8">
          <div className="w-32 h-32 rounded-full flex items-center justify-center bg-foreground/10 text-4xl font-bold">
            {(user.username || user.publicKey).charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Username */}
        <h1 className="text-3xl font-semibold text-center mb-2">
          {user.username || "Unnamed User"}
        </h1>

        {/* Public Key */}
        <p className="text-sm text-foreground/50 text-center mb-4 font-mono">
          {user.publicKey.slice(0, 6)}...{user.publicKey.slice(-4)}
        </p>

        {/* Stats */}
        <div className="flex justify-center gap-8 mb-8">
          <div className="text-center">
            <div className="text-xl font-semibold">{user.score || 0}</div>
            <div className="text-xs text-foreground/50">Points</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold">
              {new Date(user.createdAt).toLocaleDateString()}
            </div>
            <div className="text-xs text-foreground/50">Joined</div>
          </div>
        </div>

        {/* Bio */}
        {user.bio ? (
          <p className="text-foreground/70 text-center mb-8 leading-relaxed max-w-xl mx-auto">
            {user.bio}
          </p>
        ) : (
          <p className="text-foreground/40 text-center italic mb-8">
            {isOwnProfile
              ? "Add a bio to tell others about yourself."
              : "No bio provided."}
          </p>
        )}

        {/* Raw Data */}
        <details className="mt-8">
          <summary className="cursor-pointer text-sm text-foreground/60 hover:text-foreground transition">
            View raw data
          </summary>
          <pre className="mt-3 p-4 bg-foreground/5 border border-foreground/10 rounded text-xs font-mono text-foreground/80 overflow-x-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        </details>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-foreground/10 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-6">Edit Profile</h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm text-foreground/60 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  value={editForm.username}
                  onChange={(e) =>
                    setEditForm({ ...editForm, username: e.target.value })
                  }
                  placeholder="Enter your username"
                  maxLength={30}
                  className="w-full p-3 rounded-md bg-foreground/5 border border-foreground/10 text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/20 transition"
                />
                <p className="text-xs text-foreground/50 mt-1">
                  {editForm.username.length}/30 characters
                </p>
              </div>

              <div>
                <label className="block text-sm text-foreground/60 mb-1">
                  Bio
                </label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) =>
                    setEditForm({ ...editForm, bio: e.target.value })
                  }
                  placeholder="Tell us about yourself..."
                  rows={4}
                  maxLength={200}
                  className="w-full p-3 rounded-md bg-foreground/5 border border-foreground/10 text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/20 transition resize-none"
                />
                <p className="text-xs text-foreground/50 mt-1">
                  {editForm.bio.length}/200 characters
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                disabled={isUpdating}
                className="flex-1 px-4 py-3 bg-foreground/5 border border-foreground/10 text-foreground rounded-md hover:bg-foreground/10 transition disabled:opacity-50 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateProfile}
                disabled={isUpdating || !editForm.username.trim()}
                className="flex-1 px-4 py-3 bg-foreground text-background rounded-md hover:opacity-90 transition disabled:opacity-50 text-sm font-medium"
              >
                {isUpdating ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ---------------------------------------------------------------------
// Utility components
// ---------------------------------------------------------------------
function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-foreground mx-auto" />
        <p className="mt-4 text-foreground/60 text-sm font-mono">{message}</p>
      </div>
    </div>
  );
}

function ErrorState({ code, message }: { code: string; message: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen text-center">
      <div>
        <h1 className="text-4xl font-semibold mb-2">{code}</h1>
        <p className="text-foreground/60 mb-6">{message}</p>
        <Link
          href="/"
          className="inline-block px-5 py-2 bg-foreground text-background rounded-md text-sm hover:opacity-90 transition"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
