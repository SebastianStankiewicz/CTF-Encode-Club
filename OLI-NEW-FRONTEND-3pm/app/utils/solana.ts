import { Program, AnchorProvider, web3, Idl } from "@coral-xyz/anchor";
import idlJson from  "@/rust-config/ctf_anchor.json";
import { CtfAnchor } from "@/target/types/ctf_anchor";

export const programId = new web3.PublicKey(
  "GrTTrdzrLzGnLE1rDbxxv4xdZgQi7pNXGeMpb5TaYecF"
);

export const idl = idlJson as Idl;

export function getProgram(provider: AnchorProvider): Program<CtfAnchor> {
  return new Program<CtfAnchor>(idl, programId, provider);
}
