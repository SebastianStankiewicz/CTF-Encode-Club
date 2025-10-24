"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";

export default function ChallengePage() {
  const params = useParams();
  const slug = params.slug;
  
  const challenge = useQuery(api.myFunctions.getChallengeBySlug, { 
    slug: slug 
  });

  // Loading state
  if (challenge === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading challenge...</p>
        </div>
      </div>
    );
  }

  // Challenge not found
  if (challenge === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
          <p className="text-xl text-gray-600">Challenge not found</p>
          <a 
            href="/challenges" 
            className="mt-6 inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Back to Challenges
          </a>
        </div>
      </div>
    );
  }

  // Display challenge
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <article className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {challenge.title}
        </h1>
        
        {challenge.flagDetails && (
          <p className="text-xl text-gray-600 mb-6">
            {challenge.flagDetails}
          </p>
        )}

        <div className="mb-6 flex items-center gap-4">
          {challenge.prizeAmount && (
            <span className="inline-block px-4 py-2 bg-green-100 text-green-800 rounded-lg font-semibold">
              Prize: ${challenge.prizeAmount}
            </span>
          )}
        </div>

        {challenge.startDate && challenge.endDate && (
          <div className="mb-6 text-gray-700">
            <p><strong>Start Date:</strong> {new Date(challenge.startDate).toLocaleDateString()}</p>
            <p><strong>End Date:</strong> {new Date(challenge.endDate).toLocaleDateString()}</p>
          </div>
        )}

        {challenge.files && challenge.files.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Challenge Files</h2>
            <div className="space-y-2">
              {challenge.files.map((file, index) => (
                <a 
                  key={index}
                  href={file}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-4 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition"
                >
                  File {index + 1}
                </a>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}