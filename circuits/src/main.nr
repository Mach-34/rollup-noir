mod utils;

use crate::utils::{ 
    BalanceLeaf, 
    balance_leaf_hash, 
    compute_merkle_root_poseidon,
    InclusionProof, 
    leaf_exists, 
    // leaf_signed, 
    Pubkey,
    // Signature,
    tx_leaf_hash, 
    TxLeaf 
};
use dep::std;

fn main(
    amount: u32,
    // _intermediate_roots: [Field; 1],
    bal_root: pub Field,
    from: Pubkey, 
    from_bal: u32,
    from_index: Field,
    from_nonce: Field,
    from_path: [Field; 4],
    from_token_type: Field,
    to: Pubkey,
    to_bal: u32,
    to_index: Field,
    to_nonce: Field,
    to_path: [Field; 4],
    to_token_type: Field, 
    tx_path: [Field; 4],
    tx_root: Field
    // // Depth of the balance tree
    // _bal_tree_depth: Field, 
    // // Root of tx merkle tree
    // tx_root: pub Field,
    // // Position of transaction root
    // tx_root_index: Field,
    // // Path to transaction root. Harcoded to four for now
    // tx_root_path: [Field; 4],
    // // Transaction signature
    // tx_signature: Signature,
    // // Depth of transaction tree
    // _tx_tree_depth: u32
    ) -> pub Field {

    // // let ZERO_ADDRESS = Pubkey {
    // //     x: 0x0000000000000000000000000000000000000000,
    // //     y: 0x0000000000000000000000000000000000000000
    // // };
    let NONCE_MAX_VALUE = 100;

    // Assert current state equals first intermediate root
    // assert(bal_root == intermediate_roots[0]);
    // Assert transaction exists and that it is signed
    let tx_leaf: Field = tx_leaf_hash(
        TxLeaf {
             amount, 
             from, 

             from_index: from_index, 
             nonce: from_nonce, 
             to, 
             token_type: from_token_type
        }
    );
    leaf_exists(tx_leaf, InclusionProof { index: 1, path: tx_path, root: tx_root});
    // leaf_signed(tx_leaf, from, tx_signature);

    // Check tx sender balance exists
    let from_bal_leaf = balance_leaf_hash(BalanceLeaf { balance: from_bal, nonce: from_nonce, pubkey: from, token_type: from_token_type });
    leaf_exists(from_bal_leaf, InclusionProof { index: from_index, path: from_path, root: bal_root});

    // Check balances
    assert(from_bal - amount <= from_bal);
    assert(to_bal + amount >= to_bal);
    assert(from_nonce != NONCE_MAX_VALUE);

    // Check token types if not withdraw
    // if(to.x == ZERO_ADDRESS.x & to.y == ZERO_ADDRESS.y) {
    //     assert(token_type_to == token_type_from);
    // }

    // Create new sender
    let new_sender_balance = BalanceLeaf {
        balance: from_bal - amount,
        nonce: from_nonce + 1,
        pubkey: from,
        token_type: from_token_type
    };

    // Get intermediate root for sender
    let new_sender_balance_hash = balance_leaf_hash(new_sender_balance);
    let intermediate_root = compute_merkle_root_poseidon(new_sender_balance_hash, from_index, from_path);

    // // Check receiver existence in intermediate root
    let to_bal_leaf = balance_leaf_hash(BalanceLeaf { balance: to_bal, nonce: to_nonce, pubkey: to, token_type: to_token_type });
    leaf_exists(to_bal_leaf, InclusionProof { index: to_index, root: intermediate_root, path: to_path });

    // Check whether receiver is 0 address and if not then increment balance
    // TODO
    let new_receiver_balance = BalanceLeaf {
        balance: to_bal + amount,
        nonce: to_nonce,
        pubkey: from,
        token_type: to_token_type
    };
    // Create new receiver balance leaf
    let to_bal_new_leaf = balance_leaf_hash(new_receiver_balance);
    let computed_root_from_new_receiver = compute_merkle_root_poseidon(to_bal_new_leaf, to_index, to_path);

    computed_root_from_new_receiver
}
