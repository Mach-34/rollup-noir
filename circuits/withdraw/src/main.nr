use dep::std;
mod utils;
use crate::utils::{
    Pubkey,
    signed_leaf
};

fn main(
    pubkey: Pubkey,
    signature: [u8; 64],
    recipient: Pubkey,
    nonce: Field
) {
    let message = std::hash::poseidon::bn254::hash_3([nonce, recipient.x, recipient.y]);
    signed_leaf(message, pubkey, signature)
} 