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

  // Random challenge ID each run
  const challengeId = new anchor.BN(Math.floor(Math.random() * 1_000_000));

  // Plaintext flags
  const plaintextFlag = "flag{super_secret_flag}";
  const wrongFlag = "flag{wrong_one}";

  // Hash the flag before storing it (to simulate a hidden server-side flag)
  const flagHash = crypto.createHash("sha256").update(plaintextFlag).digest();

  // Derive PDA for challenge
  const [challengePda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("challenge"),
      creator.toBuffer(),
      challengeId.toArrayLike(Buffer, "le", 8),
    ],
    program.programId
  );

  it("Creates a challenge with 0.01 SOL deposit", async () => {
    const depositSol = 0.01;
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

  it("Rejects an incorrect plaintext guess", async () => {
    const tx = await program.methods
      .submitGuess(wrongFlag)
      .accounts({
        guesser: creator,
        challenge: challengePda,
      })
      .rpc();

    console.log("Submitted WRONG guess, tx:", tx);

    const challengeAccount = await program.account.challengeData.fetch(challengePda);
    assert.strictEqual(challengeAccount.isSolved, false, "Challenge should NOT be solved yet");
  });

  it("Accepts the correct plaintext guess", async () => {
    const tx = await program.methods
      .submitGuess(plaintextFlag)
      .accounts({
        guesser: creator,
        challenge: challengePda,
      })
      .rpc();

    console.log("Submitted correct guess, tx:", tx);

    const challengeAccount = await program.account.challengeData.fetch(challengePda);
    assert.strictEqual(challengeAccount.isSolved, true, "Challenge should be solved now");
  });

  it("Rejects a second wrong guess after solved", async () => {
    try {
      await program.methods
        .submitGuess(wrongFlag)
        .accounts({
          guesser: creator,
          challenge: challengePda,
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

