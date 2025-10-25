import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CtfAnchor } from "../target/types/ctf_anchor";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as assert from "assert";
import { randomBytes } from "crypto";

describe("ctf-anchor (SOL deposit test)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.ctfAnchor as Program<CtfAnchor>;
  const creator = provider.wallet.publicKey;

  const challengeId = new anchor.BN(Math.floor(Math.random() * 1_000_000));
  const flagHash = randomBytes(32);

  // Derive PDA
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

    // Get balance before deposit
    const beforeBalance = await provider.connection.getBalance(challengePda);

    // Create challenge (and deposit SOL)
    const tx = await program.methods
      .createChallenge(challengeId, flagHash, depositLamports) // updated to match Rust fn
      .accounts({
        creator,
        challenge: challengePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Challenge created, tx:", tx);

    // Get balance after deposit
    const afterBalance = await provider.connection.getBalance(challengePda);
    const diff = afterBalance - beforeBalance;

    console.log(`Lamports before: ${beforeBalance}, after: ${afterBalance}, diff: ${diff}`);

    // Assert deposit happened
    assert.ok(diff >= depositLamports.toNumber(), "SOL not deposited correctly");

    // Optionally, verify account data still looks right
    const challengeAccount = await program.account.challengeData.fetch(challengePda);
    assert.ok(challengeAccount.creator.equals(creator));
    assert.ok(Buffer.from(challengeAccount.flagHash).equals(flagHash));
    assert.ok(challengeAccount.isSolved === false);
  });
});
