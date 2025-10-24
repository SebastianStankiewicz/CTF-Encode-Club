"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function ProfilePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;

  // Guard: invalid slug
  if (!slug || Array.isArray(slug)) {
    return <ErrorState code="400" message="Invalid profile URL" />;
  }

  const user = useQuery(api.myFunctions.getUserByPublicKey, { slug });

  // Loading
  if (user === undefined) {
    return <LoadingState message="Loading profile..." />;
  }

  // Not found
  if (user === null) {
    return <ErrorState code="404" message="User not found" />;
  }

  return (
    <main className="container mx-auto max-w-2xl px-4 py-12">
      <div className="border border-foreground/10 rounded-lg bg-background p-8 shadow-sm">
        {/* Profile Image */}
        <div className="flex justify-center mb-8">
          <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-foreground/20">
          </div>
        </div>

        {/* Name */}
        <h1 className="text-3xl font-bold text-foreground text-center mb-2 font-mono tracking-tight">
          {user.name || "Unnamed User"}
        </h1>

        {/* Public Key (username) */}
        <p className="text-sm text-foreground/50 text-center mb-6 font-mono tracking-wider">
          @{user.publicKey}
        </p>

        {/* Bio */}
        {user.bio ? (
          <p className="text-foreground/70 text-center mb-10 leading-relaxed max-w-xl mx-auto">
            {user.bio}
          </p>
        ) : (
          <p className="text-foreground/40 text-center italic mb-10">No bio provided.</p>
        )}

        {/* Raw Data (collapsible-style) */}
        <details className="mt-10">
          <summary className="cursor-pointer text-sm font-mono text-foreground/60 hover:text-foreground transition-colors mb-3">
            View raw data
          </summary>
          <pre className="mt-3 p-4 bg-foreground/5 border border-foreground/10 rounded text-xs font-mono text-foreground/80 overflow-x-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        </details>
      </div>
    </main>
  );
}

// Reusable UI components
function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto" />
        <p className="mt-4 text-foreground/60 font-mono">{message}</p>
      </div>
    </div>
  );
}

function ErrorState({ code, message }: { code: string; message: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-foreground mb-3 font-mono">{code}</h1>
        <p className="text-lg text-foreground/60 mb-6">{message}</p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-foreground text-background rounded font-mono text-sm hover:opacity-90 transition-opacity"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}