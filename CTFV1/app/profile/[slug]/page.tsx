"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";

export default function ProfilePage() {
  const params = useParams();
  const slug = params.slug; // This slug is the publicKey
  
  // Fetch the user using the slug as the argument for the query
  const user = useQuery<any>(api.myFunctions.getUserByPublicKey, { slug });

  // Loading state
  if (user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  // User not found
  if (user === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
          <p className="text-xl text-gray-600">User not found</p>
          <a 
            href="/" 
            className="mt-6 inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  // Display user profile
  return (
    <main className="container mx-auto max-w-2xl px-4 py-12">
      <div className="bg-white shadow-lg rounded-lg p-8 text-center">
        {/* Profile Image */}
        <img
          src={user.profileImageUrl || 'https://placehold.co/128x128/e2e8f0/64748b?text=User'}
          alt={`${user.name || 'User'}'s profile picture`}
          className="w-32 h-32 rounded-full mx-auto mb-6 border-4 border-gray-200"
          onError={(e) => { e.currentTarget.src = 'https://placehold.co/128x128/e2e8f0/64748b?text=User'; }}
        />

        {/* User Name */}
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
          {user.name || "Unnamed User"}
        </h1>

        {/* Public Key (can be used as a "username") */}
        <p className="text-md text-gray-500 mb-6 font-mono">
          @{user.publicKey}
        </p>
        
        {/* User Bio */}
        <p className="text-lg text-gray-700 mb-8">
          {user.bio || "No bio provided."}
        </p>

        {/* Raw Data Display */}
        <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg text-left">
           <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Raw User Data
            </h2>
            <pre className="bg-gray-900 text-white p-4 rounded-md overflow-x-auto">
              {JSON.stringify(user, null, 2)}
            </pre>
        </div>
      </div>
    </main>
  );
}

