import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CtfAnchor } from "../target/types/ctf_anchor";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as assert from "assert";
import crypto from "crypto";

describe("ctf-anchor (SOL deposit + rehashed guesses)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.ctfAnchor as Program<CtfAnchor>;
  const creator = provider.wallet.publicKey;

  // Random challenge ID for this test run
  const challengeId = new anchor.BN(Math.floor(Math.random() * 1_000_000));

  // Plaintext flags
  const plaintextFlag = "flag{super_secret_flag}";
  const wrongFlag = "flag{wrong_one}";

  // Hash the flag for storage
  const flagHash = crypto.createHash("sha256").update(plaintextFlag).digest();

  // Derive PDA for challenge
  const [challengePda, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("challenge"),
      creator.toBuffer(),
      challengeId.toArrayLike(Buffer, "le", 8),
    ],
    program.programId
  );

  it("Creates a challenge with 0.01 SOL deposit", async () => {
    const depositSol = 0.001;
    const depositLamports = new anchor.BN(depositSol * LAMPORTS_PER_SOL);

    const beforeBalance = await provider.connection.getBalance(challengePda);

    const tx = await program.methods
      .createChallenge(challengeId, flagHash, depositLamports)
      .accounts({
        creator,
        challenge: challengePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Challenge created, tx:", tx);

    const afterBalance = await provider.connection.getBalance(challengePda);
    const diff = afterBalance - beforeBalance;
    console.log(`Lamports before: ${beforeBalance}, after: ${afterBalance}, diff: ${diff}`);
    assert.ok(diff >= depositLamports.toNumber(), "SOL not deposited correctly");

    const challengeAccount = await program.account.challengeData.fetch(challengePda);
    assert.ok(challengeAccount.creator.equals(creator));
    assert.ok(Buffer.from(challengeAccount.flagHash).equals(flagHash));
    assert.strictEqual(challengeAccount.isSolved, false);
  });

  it("Rejects an incorrect plaintext guess first", async () => {
    await program.methods
      .submitGuess(wrongFlag, bump)
      .accounts({
        guesser: creator,
        challenge: challengePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const challengeAccount = await program.account.challengeData.fetch(challengePda);
    assert.strictEqual(challengeAccount.isSolved, false, "Challenge should NOT be solved yet");
  });

  it("Accepts the correct plaintext guess and transfers SOL", async () => {
    const beforeBalance = await provider.connection.getBalance(creator);
  
    try {
      await program.methods
        .submitGuess(plaintextFlag, bump)
        .accounts({
          guesser: creator,
          challenge: challengePda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    } catch (err: any) {
      // If the tx fails, print all logs
      if (err.logs) {
        console.log("Transaction logs:");
        err.logs.forEach((l: string) => console.log(l));
      } else if (err.error?.logs) {
        console.log("Transaction logs:");
        err.error.logs.forEach((l: string) => console.log(l));
      } else {
        console.error(err);
      }
      throw err; // rethrow so the test still fails
    }
  
    const afterBalance = await provider.connection.getBalance(creator);
    assert.ok(afterBalance > beforeBalance, "SOL should have been transferred to guesser");
  
    const challengeAccount = await program.account.challengeData.fetch(challengePda);
    assert.strictEqual(challengeAccount.isSolved, true, "Challenge should be solved now");
  });
  

  it("Rejects a second wrong guess after solved", async () => {
    try {
      await program.methods
        .submitGuess(wrongFlag, bump)
        .accounts({
          guesser: creator,
          challenge: challengePda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      assert.fail("Should have thrown AlreadySolved error");
    } catch (err: any) {
      const code =
        err.error?.errorCode?.code ||
        err.error?.code ||
        err.error?.message ||
        err.message;
      console.log("Caught expected error:", code);
      assert.ok(String(code).includes("AlreadySolved"), "Expected AlreadySolved error");
    }
  });
});
