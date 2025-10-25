import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";

// ==================== EXAMPLE FUNCTIONS ====================

export const listNumbers = query({
  args: {
    count: v.number(),
  },
  handler: async (ctx, args) => {
    const numbers = await ctx.db
      .query("numbers")
      .order("desc")
      .take(args.count);
    return {
      viewer: (await ctx.auth.getUserIdentity())?.name ?? null,
      numbers: numbers.reverse().map((number) => number.value),
    };
  },
});

export const addNumber = mutation({
  args: {
    value: v.number(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("numbers", { value: args.value });
    console.log("Added new document with id:", id);
    return id;
  },
});

export const myAction = action({
  args: {
    first: v.number(),
    second: v.string(),
  },
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(api.myFunctions.listNumbers, {
      count: 10,
    });
    console.log(data);

    await ctx.runMutation(api.myFunctions.addNumber, {
      value: args.first,
    });
  },
});

// ==================== FILE STORAGE ====================

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

export const getFileUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// ==================== CHALLENGES ====================
export const submitFlag = mutation({
  args: {
    challengeId: v.id("challenges"),
    userPublicKey: v.string(),
    flagSubmission: v.string(),
  },
  handler: async (ctx, args) => {
    // Get challenge
    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) throw new Error("Challenge not found");

    // Check if already solved
    const existingSolve = await ctx.db
      .query("solves")
      .filter((q) => 
        q.and(
          q.eq(q.field("challengeId"), args.challengeId),
          q.eq(q.field("userPublicKey"), args.userPublicKey)
        )
      )
      .first();

    if (existingSolve) {
      return { 
        success: false, 
        message: "You've already solved this challenge!",
        pointsEarned: 0
      };
    }

    // Verify flag
    if (args.flagSubmission.trim() !== challenge.flagSolution) {
      return { 
        success: false, 
        message: "Incorrect flag. Try again!",
        pointsEarned: 0
      };
    }

    // Record solve
    await ctx.db.insert("solves", {
      challengeId: args.challengeId,
      userPublicKey: args.userPublicKey,
      solvedAt: Date.now(),
      pointsEarned: challenge.pointsReward || 0,
    });

    // Update challenge solve count
    await ctx.db.patch(args.challengeId, {
      solveCount: (challenge.solveCount || 0) + 1,
    });

    // Update user points
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("publicKey"), args.userPublicKey))
      .first();

    if (user) {
      await ctx.db.patch(user._id, {
        score: (user.score || 0) + (challenge.pointsReward || 0),
      });
    }

    return {
      success: true,
      message: `Correct! You earned ${challenge.pointsReward} points!`,
      pointsEarned: challenge.pointsReward || 0,
    };
  },
});



export const addChallenge = mutation({
  args: {
    title: v.string(),
    flagSolution: v.string(),
    prizeAmount: v.number(),
    startDate: v.string(),
    endDate: v.string(),
    flagDetails: v.string(),
    files: v.optional(v.array(v.string())),
    challengeType: v.optional(v.string()),
    flagFormat: v.optional(v.string()),
    hint: v.optional(v.string()),
    hintReleaseDate: v.optional(v.string()),
    fileNames: v.optional(v.array(v.string())),
    creatorPublicKey: v.string(),
    challengePDA: v.string(),
    flagHash: v.string(),
    difficulty: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { creatorPublicKey, ...challengeData } = args;

    const challengeId = await ctx.db.insert("challenges", {
      ...challengeData,
      creatorPublicKey,
    });

    return challengeId;
  },
});

export const getChallengeBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const challenge = await ctx.db
      .query("challenges")
      .filter((q) => q.eq(q.field("_id"), args.slug))
      .first();

    if (!challenge) return null;

    // Destructure to exclude the flagSolution
    const { flagSolution, ...publicChallengeData } = challenge;

    return publicChallengeData;
  },
});

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

    return challenges;
  },
});

// ==================== USERS ====================

export const verifyOrCreateUser = mutation({
  args: {
    publicKey: v.string(),
    username: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("publicKey"), args.publicKey))
      .first();

    if (existingUser) {
      console.log("User already exists:", existingUser.publicKey);
      return { status: "logged_in" as const, user: existingUser };
    }

    const newUserId = await ctx.db.insert("users", {
      publicKey: args.publicKey,
      username: args.username || `User_${args.publicKey.slice(0, 8)}`,
      createdAt: new Date().toISOString(),
      score: 0,
    });

    console.log("Created new user with id:", newUserId);
    return { status: "created" as const, userId: newUserId };
  },
});

export const updateUserProfile = mutation({
  args: {
    publicKey: v.string(),
    username: v.optional(v.string()),
    bio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("publicKey"), args.publicKey))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const updates: any = {};
    
    if (args.username !== undefined) {
      updates.username = args.username;
    }
    
    if (args.bio !== undefined) {
      updates.bio = args.bio;
    }

    await ctx.db.patch(user._id, updates);

    console.log(`Updated profile for ${args.publicKey}`);
    return { success: true };
  },
});

export const getUserByPublicKey = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("publicKey"), args.slug))
      .first();

    return user ?? null;
  },
});

export const getUserStats = query({
  args: { publicKey: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("publicKey"), args.publicKey))
      .first();

    if (!user) return null;

    const allUsers = await ctx.db.query("users").collect();

    const sortedUsers = allUsers
      .filter((u) => u.score > 0)
      .sort((a, b) => b.score - a.score);

    const userRank = sortedUsers.findIndex((u) => u._id === user._id) + 1;

    return {
      ...user,
      rank: userRank > 0 ? userRank : null,
      totalUsers: sortedUsers.length,
    };
  },
});

export const updateUserScore = mutation({
  args: {
    publicKey: v.string(),
    points: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("publicKey"), args.publicKey))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const newScore = user.score + args.points;

    await ctx.db.patch(user._id, {
      score: newScore,
    });

    console.log(`Updated user ${args.publicKey} score by ${args.points} points`);
    return { newScore };
  },
});

// ==================== LEADERBOARD ====================

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

    const sortedUsers = users
      .filter((user) => user.score > 0)
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

// ==================== COMMENTS ====================

export const addComment = mutation({
  args: {
    challengeId: v.id("challenges"),
    publicKey: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    // Remove auth check, just use the passed publicKey
    const commentId = await ctx.db.insert("comments", {
      challengeId: args.challengeId,
      userPublicKey: args.publicKey,
      text: args.text,
      createdAt: Date.now(),
    });

    return commentId;
  },
});

export const getChallengeComments  = query({
  args: {
    challengeId: v.id("challenges"),
  },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .filter((q) => q.eq(q.field("challengeId"), args.challengeId))
      .order("desc")
      .collect();

    return comments;
  },
});

export const getUserComments = query({
  args: {
    publicKey: v.string(),
  },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .filter((q) => q.eq(q.field("publicKey"), args.publicKey))
      .order("desc")
      .collect();

    return comments;
  },
});

// ==================== TIPPING ====================

export const recordTip = mutation({
  args: {
    challengeId: v.id("challenges"),
    fromPublicKey: v.string(),
    toPublicKey: v.string(),
    amount: v.number(),
    signature: v.string(),
  },
  handler: async (ctx, args) => {
    // Remove auth check
    const tipId = await ctx.db.insert("tips", {
      challengeId: args.challengeId,
      fromPublicKey: args.fromPublicKey,
      toPublicKey: args.toPublicKey,
      amount: args.amount,
      signature: args.signature,
      timestamp: Date.now(),
    });

    return tipId;
  },
});

export const getChallengeTips = query({
  args: {
    challengeId: v.id("challenges"),
  },
  handler: async (ctx, args) => {
    const tips = await ctx.db
      .query("tips")
      .filter((q) => q.eq(q.field("challengeId"), args.challengeId))
      .collect();
    
    const totalTips = tips.reduce((sum, tip) => sum + tip.amount, 0);
    return { tips, totalTips, count: tips.length };
  },
});

export const getTipsBySender = query({
  args: {
    publicKey: v.string(),
  },
  handler: async (ctx, args) => {
    const tips = await ctx.db
      .query("tips")
      .filter((q) => q.eq(q.field("fromPublicKey"), args.publicKey))
      .order("desc")
      .collect();
    
    const totalSent = tips.reduce((sum, tip) => sum + tip.amount, 0);
    return { tips, totalSent, count: tips.length };
  },
});

export const getTipsByReceiver = query({
  args: {
    publicKey: v.string(),
  },
  handler: async (ctx, args) => {
    const tips = await ctx.db
      .query("tips")
      .filter((q) => q.eq(q.field("toPublicKey"), args.publicKey))
      .order("desc")
      .collect();
    
    const totalReceived = tips.reduce((sum, tip) => sum + tip.amount, 0);
    return { tips, totalReceived, count: tips.length };
  },
});

// ==================== TEST DATA ====================

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
      const existingUser = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("publicKey"), user.publicKey))
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