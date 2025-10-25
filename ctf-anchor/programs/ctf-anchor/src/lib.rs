use anchor_lang::prelude::*;
use solana_program::hash::hash;


declare_id!("GrTTrdzrLzGnLE1rDbxxv4xdZgQi7pNXGeMpb5TaYecF");

#[program]
pub mod ctf_anchor {
    use super::*;

    pub fn create_challenge(
        ctx: Context<CreateChallenge>,
        challenge_id: u64,
        flag_hash: [u8; 32],
        deposit_lamports: u64,
    ) -> Result<()> {
        msg!("Creating Challenge PDA...");
    
        // Clone the PDA key & account info before mut borrow
        let challenge_key = ctx.accounts.challenge.key();
        let challenge_account_info = ctx.accounts.challenge.to_account_info();
    
        let challenge = &mut ctx.accounts.challenge;
        challenge.creator = *ctx.accounts.creator.key;
        challenge.flag_hash = flag_hash;
        challenge.is_solved = false;
    
        // Transfer SOL from creator to PDA
        if deposit_lamports > 0 {
            let ix = anchor_lang::solana_program::system_instruction::transfer(
                &ctx.accounts.creator.key(),
                &challenge_key,
                deposit_lamports,
            );
    
            anchor_lang::solana_program::program::invoke(
                &ix,
                &[
                    ctx.accounts.creator.to_account_info(),
                    challenge_account_info,
                ],
            )?;
    
            msg!("Deposited {} lamports into the Challenge PDA.", deposit_lamports);
        }
    
        msg!("Challenge PDA created successfully:");
        msg!(" Creator: {}", challenge.creator);
        msg!(" Challenge ID: {}", challenge_id);
        Ok(())
    }
    
    
    

    pub fn submit_guess(ctx: Context<SubmitGuess>, guess_plain: String) -> Result<()> {
        let challenge = &mut ctx.accounts.challenge;
    
        if challenge.is_solved {
            return Err(CtfError::AlreadySolved.into());
        }
    
        // Hash the guess using SHA-256
        let hashed_guess = hash(guess_plain.as_bytes());
        let guess_bytes = hashed_guess.to_bytes(); // [u8; 32]
    
        // Compare to stored flag_hash
        if challenge.flag_hash == guess_bytes {
            challenge.is_solved = true;
            msg!("✅ Correct guess! Challenge solved by {}", ctx.accounts.guesser.key());
        } else {
            msg!("❌ Incorrect guess.");
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
