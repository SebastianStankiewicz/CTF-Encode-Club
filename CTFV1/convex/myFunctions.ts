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
    difficulty: v.string(), // "easy", "medium", "hard"
  },
  handler: async (ctx, args) => {
    const { creatorPublicKey, difficulty, ...challengeData } = args;

    // Calculate points based on difficulty
    const pointsReward = difficulty === "easy" ? 100 : difficulty === "medium" ? 300 : 500;

    const challengeId = await ctx.db.insert("challenges", {
      ...challengeData,
      creatorPublicKey,
      difficulty,
      pointsReward,
      solveCount: 0,
    });

    // Award creator 500 points for creating challenge
    const creator = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("publicKey"), creatorPublicKey))
      .first();

    if (creator) {
      await ctx.db.patch(creator._id, {
        score: (creator.score || 0) + 500,
      });
      console.log(`Awarded 500 points to ${creatorPublicKey} for creating challenge`);
    }

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

    return challenge ?? null;
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

// ==================== FLAG SUBMISSION & SOLVES ====================

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

export const getChallengeLeaderboard = query({
  args: { challengeId: v.id("challenges") },
  handler: async (ctx, args) => {
    const solves = await ctx.db
      .query("solves")
      .filter((q) => q.eq(q.field("challengeId"), args.challengeId))
      .collect();

    // Sort by solve time (fastest first)
    const sorted = solves.sort((a, b) => a.solvedAt - b.solvedAt);

    // Get user info for each solve
    const leaderboard = await Promise.all(
      sorted.map(async (solve, index) => {
        const user = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("publicKey"), solve.userPublicKey))
          .first();

        return {
          rank: index + 1,
          publicKey: solve.userPublicKey,
          username: user?.username || "Anonymous",
          solvedAt: solve.solvedAt,
          pointsEarned: solve.pointsEarned,
        };
      })
    );

    return leaderboard;
  },
});

export const getUserSolves = query({
  args: { publicKey: v.string() },
  handler: async (ctx, args) => {
    const solves = await ctx.db
      .query("solves")
      .filter((q) => q.eq(q.field("userPublicKey"), args.publicKey))
      .collect();

    return solves;
  },
});

// ==================== WRITEUPS ====================

export const submitWriteup = mutation({
  args: {
    challengeId: v.id("challenges"),
    userPublicKey: v.string(),
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user solved the challenge
    const solve = await ctx.db
      .query("solves")
      .filter((q) => 
        q.and(
          q.eq(q.field("challengeId"), args.challengeId),
          q.eq(q.field("userPublicKey"), args.userPublicKey)
        )
      )
      .first();

    if (!solve) {
      throw new Error("You must solve the challenge before submitting a writeup");
    }

    const writeupId = await ctx.db.insert("writeups", {
      challengeId: args.challengeId,
      userPublicKey: args.userPublicKey,
      title: args.title,
      content: args.content,
      createdAt: Date.now(),
      upvotes: 0,
    });

    return writeupId;
  },
});

export const getChallengeWriteups = query({
  args: { challengeId: v.id("challenges") },
  handler: async (ctx, args) => {
    const writeups = await ctx.db
      .query("writeups")
      .filter((q) => q.eq(q.field("challengeId"), args.challengeId))
      .collect();

    // Get user info for each writeup
    const enriched = await Promise.all(
      writeups.map(async (writeup) => {
        const user = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("publicKey"), writeup.userPublicKey))
          .first();

        return {
          ...writeup,
          username: user?.username || "Anonymous",
        };
      })
    );

    return enriched.sort((a, b) => b.upvotes - a.upvotes);
  },
});

export const getWriteupById = query({
  args: { writeupId: v.id("writeups") },
  handler: async (ctx, args) => {
    const writeup = await ctx.db.get(args.writeupId);
    if (!writeup) return null;

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("publicKey"), writeup.userPublicKey))
      .first();

    return {
      ...writeup,
      username: user?.username || "Anonymous",
    };
  },
});

export const upvoteWriteup = mutation({
  args: {
    writeupId: v.id("writeups"),
  },
  handler: async (ctx, args) => {
    const writeup = await ctx.db.get(args.writeupId);
    if (!writeup) throw new Error("Writeup not found");

    await ctx.db.patch(args.writeupId, {
      upvotes: (writeup.upvotes || 0) + 1,
    });

    return { success: true };
  },
});

// ==================== POINTS TIPPING ====================

export const tipWithPoints = mutation({
  args: {
    fromPublicKey: v.string(),
    toPublicKey: v.string(),
    amount: v.number(),
    challengeId: v.optional(v.id("challenges")),
  },
  handler: async (ctx, args) => {
    // Get sender
    const sender = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("publicKey"), args.fromPublicKey))
      .first();

    if (!sender) throw new Error("Sender not found");
    if ((sender.score || 0) < args.amount) {
      throw new Error("Insufficient points");
    }

    // Get recipient
    const recipient = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("publicKey"), args.toPublicKey))
      .first();

    if (!recipient) throw new Error("Recipient not found");

    // Transfer points
    await ctx.db.patch(sender._id, {
      score: (sender.score || 0) - args.amount,
    });

    await ctx.db.patch(recipient._id, {
      score: (recipient.score || 0) + args.amount,
    });

    // Record tip
    await ctx.db.insert("tips", {
      fromPublicKey: args.fromPublicKey,
      toPublicKey: args.toPublicKey,
      amount: args.amount,
      type: "points",
      challengeId: args.challengeId,
      timestamp: Date.now(),
    });

    console.log(`${args.fromPublicKey} tipped ${args.amount} points to ${args.toPublicKey}`);
    return { success: true };
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

    // Get user's solves
    const solves = await ctx.db
      .query("solves")
      .filter((q) => q.eq(q.field("userPublicKey"), args.publicKey))
      .collect();

    // Get user's created challenges
    const createdChallenges = await ctx.db
      .query("challenges")
      .filter((q) => q.eq(q.field("creatorPublicKey"), args.publicKey))
      .collect();

    // Get all users for ranking
    const allUsers = await ctx.db.query("users").collect();

    const sortedUsers = allUsers
      .filter((u) => u.score > 0)
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    const userRank = sortedUsers.findIndex((u) => u._id === user._id) + 1;

    return {
      ...user,
      rank: userRank > 0 ? userRank : null,
      totalUsers: sortedUsers.length,
      solvedChallenges: solves.length,
      createdChallenges: createdChallenges.length,
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

    const newScore = (user.score || 0) + args.points;

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
      .filter((user) => (user.score || 0) > 0)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .map((user, index) => ({
        rank: index + 1,
        publicKey: user.publicKey,
        score: user.score || 0,
        username: user.username || user.publicKey.slice(0, 8) + "...",
        createdAt: user.createdAt,
      }));

    return sortedUsers;
  },
});

export const getGlobalLeaderboard = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();
    
    const sorted = users
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, args.limit || 100);

    return sorted.map((user, index) => ({
      rank: index + 1,
      publicKey: user.publicKey,
      username: user.username || "Anonymous",
      totalPoints: user.score || 0,
    }));
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
    const commentId = await ctx.db.insert("comments", {
      challengeId: args.challengeId,
      userPublicKey: args.publicKey,
      text: args.text,
      createdAt: Date.now(),
    });

    return commentId;
  },
});

export const getChallengeComments = query({
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
    const tipId = await ctx.db.insert("tips", {
      challengeId: args.challengeId,
      fromPublicKey: args.fromPublicKey,
      toPublicKey: args.toPublicKey,
      amount: args.amount,
      type: "sol",
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