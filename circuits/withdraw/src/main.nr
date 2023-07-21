use dep::std;
mod utils;
use crate::utils::{
    Pubkey,
    signed_leaf
};

fn main(
    pubkey: Pubkey,
    signature: [u8; 64],
    recipient: Field,
    nonce: Field
) {
    let message = std::hash::poseidon::bn254::hash_2([nonce, recipient]);
    signed_leaf(message, pubkey, signature)
} 