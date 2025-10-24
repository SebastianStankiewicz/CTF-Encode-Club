import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";

// Write your Convex functions in any file inside this directory (`convex`).
// See https://docs.convex.dev/functions for more.

// You can read data from the database via a query:
export const listNumbers = query({
  // Validators for arguments.
  args: {
    count: v.number(),
  },

  // Query implementation.
  handler: async (ctx, args) => {
    //// Read the database as many times as you need here.
    //// See https://docs.convex.dev/database/reading-data.
    const numbers = await ctx.db
      .query("numbers")
      // Ordered by _creationTime, return most recent
      .order("desc")
      .take(args.count);
    return {
      viewer: (await ctx.auth.getUserIdentity())?.name ?? null,
      numbers: numbers.reverse().map((number) => number.value),
    };
  },
});

// You can write data to the database via a mutation:
export const addNumber = mutation({
  // Validators for arguments.
  args: {
    value: v.number(),
  },

  // Mutation implementation.
  handler: async (ctx, args) => {
    //// Insert or modify documents in the database here.
    //// Mutations can also read from the database like queries.
    //// See https://docs.convex.dev/database/writing-data.

    const id = await ctx.db.insert("numbers", { value: args.value });

    console.log("Added new document with id:", id);
    // Optionally, return a value from your mutation.
    // return id;
  },
});

// You can fetch data from and send data to third-party APIs via an action:
export const myAction = action({
  // Validators for arguments.
  args: {
    first: v.number(),
    second: v.string(),
  },

  // Action implementation.
  handler: async (ctx, args) => {
    //// Use the browser-like `fetch` API to send HTTP requests.
    //// See https://docs.convex.dev/functions/actions#calling-third-party-apis-and-using-npm-packages.
    // const response = await ctx.fetch("https://api.thirdpartyservice.com");
    // const data = await response.json();

    //// Query data by running Convex queries.
    const data = await ctx.runQuery(api.myFunctions.listNumbers, {
      count: 10,
    });
    console.log(data);

    //// Write data by running Convex mutations.
    await ctx.runMutation(api.myFunctions.addNumber, {
      value: args.first,
    });
  },
});


export const addChallenge = mutation({
  // Validators for arguments.
  args: {
    flagSolution: v.string(),
    prizeAmount: v.number(),
    startDate: v.string(),
    endDate: v.string(),
    files: v.optional(v.array(v.string())),
    flagDetails: v.string(),
    challengeType: v.optional(v.string()),
    flagFormat: v.optional(v.string()),
    hint: v.optional(v.string()),
    hintReleaseDate: v.optional(v.string()),
    keepAfterFirstSolve: v.optional(v.boolean()),
  },

  // Mutation implementation.
  handler: async (ctx, args) => {
    //// Insert or modify documents in the database here.
    //// Mutations can also read from the database like queries.
    //// See https://docs.convex.dev/database/writing-data.

    const id = await ctx.db.insert("challenges", {
      flagSolution: args.flagSolution,
      prizeAmount: args.prizeAmount,
      startDate: args.startDate,
      endDate: args.endDate,
      files: args.files ?? [],
      flagDetails: args.flagDetails,
      challengeType: args.challengeType ?? "misc",
      flagFormat: args.flagFormat,
      hint: args.hint,
      hintReleaseDate: args.hintReleaseDate,
      keepAfterFirstSolve: args.keepAfterFirstSolve ?? true,
    });

    console.log("Added new challenge with id:", id);
    // Optionally, return a value from your mutation.
    // return id;
  },
});


export const verifyOrCreateUser = mutation({
  // Validators for arguments.
  args: {
    publicKey: v.string(),
    username: v.optional(v.string()),
  },

  // Mutation implementation.
  handler: async (ctx, args) => {
    //// Check if user already exists in "users" table.
    const existingUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("publicKey"), args.publicKey))
      .first();

    if (existingUser) {
      console.log("User already exists:", existingUser.publicKey);
      return { status: "logged_in", user: existingUser };
    }

    //// If not, create a new user.
    const newUserId = await ctx.db.insert("users", {
      publicKey: args.publicKey,
      username: args.username || `User_${args.publicKey.slice(0, 8)}`,
      createdAt: new Date().toISOString(),
      score: 0,
    });

    console.log("Created new user with id:", newUserId);

    return { status: "created", userId: newUserId };
  },
});


export const getChallengeBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const challenge = await ctx.db
      .query("challenges")
      .filter(q => q.eq(q.field("_id"), args.slug))
      .first();

    if (!challenge) return null;
    return challenge;
  },
});

// Get all challenges
export const getAllChallenges = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    
    const challenges = await ctx.db
      .query("challenges")
      .order("desc")
      .take(limit);

    return challenges.map(challenge => ({
      _id: challenge._id,
      flagSolution: challenge.flagSolution,
      prizeAmount: challenge.prizeAmount,
      startDate: challenge.startDate,
      endDate: challenge.endDate,
      flagDetails: challenge.flagDetails,
      files: challenge.files || [],
      challengeType: challenge.challengeType || "misc",
      flagFormat: challenge.flagFormat,
      hint: challenge.hint,
      hintReleaseDate: challenge.hintReleaseDate,
      keepAfterFirstSolve: challenge.keepAfterFirstSolve ?? true,
      _creationTime: challenge._creationTime,
    }));
  },
});

export const getUserByPublicKey = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const challenge = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("publicKey"), args.slug))
      .first();

    if (!challenge) return null;
    return challenge;
  },
});

// Get leaderboard data
export const getLeaderboard = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    
    const users = await ctx.db
      .query("users")
      .order("desc")
      .take(limit);

    // Sort by score in descending order
    const sortedUsers = users
      .filter(user => user.score > 0) // Only show users with points
      .sort((a, b) => b.score - a.score)
      .map((user, index) => ({
        rank: index + 1,
        publicKey: user.publicKey,
        score: user.score,
        username: user.username || user.publicKey.slice(0, 8) + "...",
        createdAt: user.createdAt,
      }));

    return sortedUsers;
  },
});

// Update user score (for when they solve challenges)
export const updateUserScore = mutation({
  args: {
    publicKey: v.string(),
    points: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("publicKey"), args.publicKey))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      score: user.score + args.points,
    });

    console.log(`Updated user ${args.publicKey} score by ${args.points} points`);
    return { newScore: user.score + args.points };
  },
});

// Get user stats
export const getUserStats = query({
  args: { publicKey: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("publicKey"), args.publicKey))
      .first();

    if (!user) return null;

    // Get all users to calculate rank
    const allUsers = await ctx.db
      .query("users")
      .collect();

    const sortedUsers = allUsers
      .filter(u => u.score > 0)
      .sort((a, b) => b.score - a.score);

    const userRank = sortedUsers.findIndex(u => u._id === user._id) + 1;

    return {
      ...user,
      rank: userRank > 0 ? userRank : null,
      totalUsers: sortedUsers.length,
    };
  },
});

// Test function to add sample leaderboard data
export const addSampleUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const sampleUsers = [
      { publicKey: "Alice123456789", username: "alice_hacker", score: 2450 },
      { publicKey: "Bob987654321", username: "bob_security", score: 2340 },
      { publicKey: "Charlie111222", username: "charlie_pwn", score: 2150 },
      { publicKey: "Diana333444", username: "diana_crypto", score: 1980 },
      { publicKey: "Eve555666", username: "eve_reverse", score: 1875 },
      { publicKey: "Frank777888", username: "frank_web", score: 1720 },
      { publicKey: "Grace999000", username: "grace_forensics", score: 1650 },
      { publicKey: "Henry111333", username: "henry_exploit", score: 1540 },
    ];

    for (const user of sampleUsers) {
      // Check if user already exists
      const existingUser = await ctx.db
        .query("users")
        .filter(q => q.eq(q.field("publicKey"), user.publicKey))
        .first();

      if (!existingUser) {
        await ctx.db.insert("users", {
          publicKey: user.publicKey,
          username: user.username,
          score: user.score,
          createdAt: new Date().toISOString(),
        });
      }
    }

    console.log("Sample users added to leaderboard");
    return { status: "success", message: "Sample users added" };
  },
});