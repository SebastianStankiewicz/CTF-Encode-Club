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