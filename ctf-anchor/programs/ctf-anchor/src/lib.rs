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

        let challenge_key = ctx.accounts.challenge.key();
        let challenge_account_info = ctx.accounts.challenge.to_account_info();

        let challenge = &mut ctx.accounts.challenge;
        challenge.challenge_id = challenge_id;
        challenge.creator = *ctx.accounts.creator.key;
        challenge.flag_hash = flag_hash;
        challenge.is_solved = false;

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

    pub fn submit_guess(
        ctx: Context<SubmitGuess>,
        guess_plain: String,
        bump: u8,
    ) -> Result<()> {
        // Clone AccountInfo before mutable borrow
        let challenge_info = ctx.accounts.challenge.to_account_info();
        let guesser_info = ctx.accounts.guesser.to_account_info();
        let system_program_info = ctx.accounts.system_program.to_account_info();
    
        // Mutable borrow of challenge
        let challenge = &mut ctx.accounts.challenge;
    
        // Check if already solved
        if challenge.is_solved {
            return Err(CtfError::AlreadySolved.into());
        }
    
        // Hash the guess
        let hashed_guess = hash(guess_plain.as_bytes());
        let guess_bytes = hashed_guess.to_bytes();
    
        if challenge.flag_hash == guess_bytes {
            challenge.is_solved = true;
            msg!("Correct guess! Challenge solved by {}", ctx.accounts.guesser.key());
        
            // Transfer lamports but keep PDA alive
            let seeds = &[
                b"challenge",
                challenge.creator.as_ref(),
                &challenge.challenge_id.to_le_bytes(),
                &[bump],
            ];
        
            let challenge_info = ctx.accounts.challenge.to_account_info();
            let guesser_info = ctx.accounts.guesser.to_account_info();
        
            // Compute rent-exempt minimum for the PDA
            let rent = Rent::get()?;
            let min_balance = rent.minimum_balance(challenge_info.data_len());
        
            let total_lamports = **challenge_info.lamports.borrow();
            // Only transfer the lamports above the minimum balance
            let lamports_to_transfer = total_lamports.saturating_sub(min_balance);
        
            **guesser_info.lamports.borrow_mut() += lamports_to_transfer;
            **challenge_info.lamports.borrow_mut() -= lamports_to_transfer;
        
            msg!(
                "Transferred {} lamports to guesser, PDA remains rent-exempt with {} lamports",
                lamports_to_transfer,
                **challenge_info.lamports.borrow()
            );
        }else {
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
        space = 8 + 8 + 32 + 32 + 1 // discriminator + challenge_id + flag_hash + creator + is_solved
    )]
    pub challenge: Account<'info, ChallengeData>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitGuess<'info> {
    #[account(mut)]
    pub challenge: Account<'info, ChallengeData>,

    #[account(mut)]
    pub guesser: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct ChallengeData {
    pub challenge_id: u64,
    pub flag_hash: [u8; 32],
    pub creator: Pubkey,
    pub is_solved: bool,
}

#[error_code]
pub enum CtfError {
    #[msg("Challenge already solved")]
    AlreadySolved,
}
