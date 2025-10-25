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
    const { creatorPublicKey, difficulty, ...challengeData } = args;

    // Set points based on difficulty
    let pointsReward = 100; // Default to easy
    if (difficulty === "medium") pointsReward = 300;
    if (difficulty === "hard") pointsReward = 500;

    const challengeId = await ctx.db.insert("challenges", {
      ...challengeData,
      creatorPublicKey,
      difficulty: difficulty || "easy",
      pointsReward,
      solveCount: 0,
      createdAt: Date.now(),
    });

    // Give creator 500 points for creating a challenge
    const creator = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("publicKey"), creatorPublicKey))
      .first();

    if (creator) {
      await ctx.db.patch(creator._id, {
        score: (creator.score || 0) + 500,
      });
    } else {
      // Create user if doesn't exist
      await ctx.db.insert("users", {
        publicKey: creatorPublicKey,
        username: `Creator_${creatorPublicKey.slice(0, 8)}`,
        createdAt: new Date().toISOString(),
        score: 500,
      });
    }

    return {
      challengeId,
      pointsEarned: 500,
      challengePoints: pointsReward,
    };
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

export const getChallengeLeaderboard = query({
  args: {
    challengeId: v.id("challenges"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    // Get all solves for this challenge
    const solves = await ctx.db
      .query("solves")
      .filter((q) => q.eq(q.field("challengeId"), args.challengeId))
      .collect();

    // Sort by solve time (earliest first)
    const sortedSolves = solves.sort((a, b) => a.solvedAt - b.solvedAt);

    // Get user data for each solve
    const leaderboard = [];
    for (let i = 0; i < Math.min(sortedSolves.length, limit); i++) {
      const solve = sortedSolves[i];
      const user = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("publicKey"), solve.userPublicKey))
        .first();

      if (user) {
        leaderboard.push({
          rank: i + 1,
          publicKey: solve.userPublicKey,
          username: user.username || user.publicKey.slice(0, 8) + "...",
          solvedAt: solve.solvedAt,
          pointsEarned: solve.pointsEarned,
          timeToSolve: solve.solvedAt, // You might want to calculate this relative to challenge start
        });
      }
    }

    return {
      leaderboard,
      totalSolvers: solves.length,
    };
  },
});

export const getChallengeStats = query({
  args: {
    challengeId: v.id("challenges"),
  },
  handler: async (ctx, args) => {
    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) return null;

    const solves = await ctx.db
      .query("solves")
      .filter((q) => q.eq(q.field("challengeId"), args.challengeId))
      .collect();

    const tips = await ctx.db
      .query("tips")
      .filter((q) => q.eq(q.field("challengeId"), args.challengeId))
      .collect();

    const comments = await ctx.db
      .query("comments")
      .filter((q) => q.eq(q.field("challengeId"), args.challengeId))
      .collect();

    const firstSolve = solves.length > 0 ? 
      solves.reduce((earliest, solve) => 
        solve.solvedAt < earliest.solvedAt ? solve : earliest
      ) : null;

    const totalTips = tips.reduce((sum, tip) => sum + tip.amount, 0);

    return {
      challenge: {
        ...challenge,
        flagSolution: undefined, // Don't expose the flag
      },
      stats: {
        totalSolvers: solves.length,
        totalTips,
        totalComments: comments.length,
        firstSolve: firstSolve ? {
          userPublicKey: firstSolve.userPublicKey,
          solvedAt: firstSolve.solvedAt,
          timeToSolve: firstSolve.solvedAt - challenge.createdAt,
        } : null,
        averageSolveTime: solves.length > 0 ? 
          solves.reduce((sum, solve) => sum + (solve.solvedAt - challenge.createdAt), 0) / solves.length : 0,
      },
    };
  },
});

// ==================== TOKEN/POINTS MANAGEMENT ====================

export const getUserPointsBreakdown = query({
  args: { publicKey: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("publicKey"), args.publicKey))
      .first();

    if (!user) return null;

    // Get points from solving challenges
    const solves = await ctx.db
      .query("solves")
      .filter((q) => q.eq(q.field("userPublicKey"), args.publicKey))
      .collect();

    const pointsFromSolving = solves.reduce((sum, solve) => sum + solve.pointsEarned, 0);

    // Get points from creating challenges (500 each)
    const challenges = await ctx.db
      .query("challenges")
      .filter((q) => q.eq(q.field("creatorPublicKey"), args.publicKey))
      .collect();

    const pointsFromCreating = challenges.length * 500;

    // Get points received from tips
    const tipsReceived = await ctx.db
      .query("tips")
      .filter((q) => q.eq(q.field("toPublicKey"), args.publicKey))
      .collect();

    const pointsFromTips = tipsReceived.reduce((sum, tip) => sum + tip.amount, 0);

    // Get points spent on tips
    const tipsSent = await ctx.db
      .query("tips")
      .filter((q) => q.eq(q.field("fromPublicKey"), args.publicKey))
      .collect();

    const pointsSpentOnTips = tipsSent.reduce((sum, tip) => sum + tip.amount, 0);

    return {
      user,
      breakdown: {
        totalPoints: user.score,
        pointsFromSolving,
        pointsFromCreating,
        pointsFromTips,
        pointsSpentOnTips,
        netTips: pointsFromTips - pointsSpentOnTips,
      },
      activity: {
        challengesSolved: solves.length,
        challengesCreated: challenges.length,
        tipsReceived: tipsReceived.length,
        tipsSent: tipsSent.length,
      },
    };
  },
});

export const getPointsLeaderboard = query({
  args: {
    category: v.optional(v.union(v.literal("total"), v.literal("solving"), v.literal("creating"), v.literal("tips"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const category = args.category ?? "total";

    const users = await ctx.db.query("users").collect();
    
    let leaderboard = [];

    for (const user of users) {
      let score = 0;
      
      if (category === "total") {
        score = user.score;
      } else if (category === "solving") {
        const solves = await ctx.db
          .query("solves")
          .filter((q) => q.eq(q.field("userPublicKey"), user.publicKey))
          .collect();
        score = solves.reduce((sum, solve) => sum + solve.pointsEarned, 0);
      } else if (category === "creating") {
        const challenges = await ctx.db
          .query("challenges")
          .filter((q) => q.eq(q.field("creatorPublicKey"), user.publicKey))
          .collect();
        score = challenges.length * 500;
      } else if (category === "tips") {
        const tipsReceived = await ctx.db
          .query("tips")
          .filter((q) => q.eq(q.field("toPublicKey"), user.publicKey))
          .collect();
        score = tipsReceived.reduce((sum, tip) => sum + tip.amount, 0);
      }

      if (score > 0) {
        leaderboard.push({
          publicKey: user.publicKey,
          username: user.username || user.publicKey.slice(0, 8) + "...",
          score,
          createdAt: user.createdAt,
        });
      }
    }

    leaderboard.sort((a, b) => b.score - a.score);
    
    return leaderboard
      .slice(0, limit)
      .map((user, index) => ({
        ...user,
        rank: index + 1,
      }));
  },
});

export const getDifficultyStats = query({
  args: {},
  handler: async (ctx) => {
    const challenges = await ctx.db.query("challenges").collect();
    
    const stats = {
      easy: { count: 0, totalSolves: 0, avgPoints: 100 },
      medium: { count: 0, totalSolves: 0, avgPoints: 300 },
      hard: { count: 0, totalSolves: 0, avgPoints: 500 },
    };

    for (const challenge of challenges) {
      const difficulty = challenge.difficulty || "easy";
      if (stats[difficulty as keyof typeof stats]) {
        stats[difficulty as keyof typeof stats].count++;
        stats[difficulty as keyof typeof stats].totalSolves += challenge.solveCount || 0;
      }
    }

    return stats;
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

export const tipWithPoints = mutation({
  args: {
    challengeId: v.id("challenges"),
    fromPublicKey: v.string(),
    toPublicKey: v.string(),
    points: v.number(),
  },
  handler: async (ctx, args) => {
    // Validate positive points
    if (args.points <= 0) {
      throw new Error("Tip amount must be greater than 0");
    }

    // Get sender's user data
    const sender = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("publicKey"), args.fromPublicKey))
      .first();

    if (!sender) {
      throw new Error("Sender not found");
    }

    // Check if sender has enough points
    if (sender.score < args.points) {
      throw new Error("Insufficient points to tip");
    }

    // Get receiver's user data
    const receiver = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("publicKey"), args.toPublicKey))
      .first();

    if (!receiver) {
      throw new Error("Receiver not found");
    }

    // Deduct points from sender
    await ctx.db.patch(sender._id, {
      score: sender.score - args.points,
    });

    // Add points to receiver
    await ctx.db.patch(receiver._id, {
      score: receiver.score + args.points,
    });

    // Record the tip
    const tipId = await ctx.db.insert("tips", {
      challengeId: args.challengeId,
      fromPublicKey: args.fromPublicKey,
      toPublicKey: args.toPublicKey,
      amount: args.points,
      timestamp: Date.now(),
    });

    return {
      tipId,
      senderNewScore: sender.score - args.points,
      receiverNewScore: receiver.score + args.points,
    };
  },
});

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

export const addSampleChallenges = mutation({
  args: {},
  handler: async (ctx) => {
    const sampleChallenges = [
      {
        title: "Basic Buffer Overflow",
        difficulty: "easy",
        pointsReward: 100,
        flagSolution: "FLAG{easy_buffer_overflow_123}",
        flagDetails: "Find the buffer overflow vulnerability in the given C program",
        challengeType: "binary exploitation",
        creatorPublicKey: "Alice123456789",
      },
      {
        title: "RSA Encryption Challenge",
        difficulty: "medium", 
        pointsReward: 300,
        flagSolution: "FLAG{rsa_factorization_456}",
        flagDetails: "Factor the RSA modulus to decrypt the message",
        challengeType: "cryptography",
        creatorPublicKey: "Bob987654321",
      },
      {
        title: "Advanced Web Exploitation",
        difficulty: "hard",
        pointsReward: 500,
        flagSolution: "FLAG{advanced_sqli_xss_789}",
        flagDetails: "Chain multiple vulnerabilities to achieve RCE",
        challengeType: "web security",
        creatorPublicKey: "Charlie111222",
      },
    ];

    for (const challenge of sampleChallenges) {
      const existingChallenge = await ctx.db
        .query("challenges")
        .filter((q) => q.eq(q.field("title"), challenge.title))
        .first();

      if (!existingChallenge) {
        await ctx.db.insert("challenges", {
          ...challenge,
          prizeAmount: 0,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          challengePDA: `challenge_${Math.random().toString(36).substr(2, 9)}`,
          flagHash: `hash_${Math.random().toString(36).substr(2, 16)}`,
          solveCount: Math.floor(Math.random() * 50),
          createdAt: Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time in last week
        });
      }
    }

    console.log("Sample challenges added");
    return { status: "success", message: "Sample challenges added" };
  },
});