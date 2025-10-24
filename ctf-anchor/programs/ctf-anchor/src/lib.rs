use anchor_lang::prelude::*;

declare_id!("GrTTrdzrLzGnLE1rDbxxv4xdZgQi7pNXGeMpb5TaYecF");

#[program]
pub mod ctf_anchor {
    use super::*;

    pub fn create_challenge(ctx: Context<CreateChallenge>, challenge_id: u64, flag_hash: [u8; 32]) -> Result<()> {
        msg!("Creating Challenge PDA...");

        let challenge = &mut ctx.accounts.challenge;

        challenge.creator = *ctx.accounts.creator.key;
        challenge.flag_hash = flag_hash;
        challenge.is_solved = false;

        msg!("Challenge PDA created successfully:");
        msg!(" Creator: {}", challenge.creator);
        msg!(" Challenge ID: {}", challenge_id);
        Ok(())
    }

    pub fn submit_guess(ctx: Context<SubmitGuess>, guess_hash: [u8; 32]) -> Result<()> {
        let challenge = &mut ctx.accounts.challenge;

        if challenge.is_solved {
            return Err(CtfError::AlreadySolved.into());
        }

        if challenge.flag_hash == guess_hash {
            challenge.is_solved = true;
            msg!("Correct guess! Challenge solved by {}", ctx.accounts.guesser.key());
        } else {
            msg!("Incorrect guess.");
        }

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(challenge_id: u64)]
pub struct CreateChallenge<'info> {
    #[account(
        init,
        seeds = [b"challenge", creator.key().as_ref(), &challenge_id.to_le_bytes()],
        bump,
        payer = creator,
        space = 8 + 32 + 32 + 1 // discriminator + flag_hash + creator + is_solved
    )]
    pub challenge: Account<'info, ChallengeData>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct ChallengeData {
    pub flag_hash: [u8; 32],
    pub creator: Pubkey,
    pub is_solved: bool,
}

#[derive(Accounts)]
pub struct SubmitGuess<'info> {
    #[account(mut)]
    pub challenge: Account<'info, ChallengeData>,

    pub guesser: Signer<'info>,
}

#[error_code]
pub enum CtfError {
    #[msg("Challenge already solved")]
    AlreadySolved,
}