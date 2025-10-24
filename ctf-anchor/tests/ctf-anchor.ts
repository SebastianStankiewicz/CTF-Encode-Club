import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CtfAnchor } from "../target/types/ctf_anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import * as assert from "assert";
import { randomBytes } from "crypto";

describe("ctf-anchor", () => {
  // Configure the client to use devnet/local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.ctfAnchor as Program<CtfAnchor>;
  const creator = provider.wallet.publicKey;

  // Generate a random challengeId each run
  const challengeId = new anchor.BN(Math.floor(Math.random() * 1_000_000));
  // Generate a random 32-byte flag hash
  const flagHash = randomBytes(32);
  const wrongHash = randomBytes(32); // another random 32 bytes for wrong guess

  // Compute PDA for the challenge account
  const [challengePda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("challenge"),
      creator.toBuffer(),
      challengeId.toArrayLike(Buffer, "le", 8),
    ],
    program.programId
  );

  it("Creates a challenge!", async () => {
    const tx = await program.methods
      .createChallenge(challengeId, flagHash)
      .accounts({
        creator,
        challenge: challengePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Challenge created, tx:", tx);

    const challengeAccount = await program.account.challengeData.fetch(challengePda);
    assert.ok(challengeAccount.creator.equals(creator));
    assert.ok(Buffer.from(challengeAccount.flagHash).equals(flagHash));
    assert.ok(challengeAccount.isSolved === false);
  });

  it("Submits a correct guess!", async () => {
    const tx = await program.methods
      .submitGuess(flagHash)
      .accounts({
        guesser: creator,
        challenge: challengePda,
      })
      .rpc();

    console.log("Submitted guess, tx:", tx);

    const challengeAccount = await program.account.challengeData.fetch(challengePda);
    assert.ok(challengeAccount.isSolved === true);
  });

  it("Fails on submitting a second guess after solved", async () => {
    try {
      await program.methods
        .submitGuess(wrongHash)
        .accounts({
          guesser: creator,
          challenge: challengePda,
        })
        .rpc();
  
      assert.fail("Should have thrown AlreadySolved error");
    } catch (err: any) {
      // Anchor v0.32+ returns error as an object
      assert.strictEqual(err.error?.code, "AlreadySolved");
      assert.strictEqual(err.error?.number, 6000); // optional, just for verification
      console.log("Caught expected error:", err.error?.code);
    }
  });
  
});
