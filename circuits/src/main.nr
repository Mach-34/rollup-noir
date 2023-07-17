mod utils;

use crate::utils::{ 
    BalanceLeaf, 
    balance_leaf_hash, 
    compute_merkle_root_poseidon,
    InclusionProof, 
    leaf_exists, 
    leaf_signed, 
    Pubkey,
    Signature,
    tx_leaf_hash, 
    TxLeaf 
};

fn main(
    // Amount being transferred
    amount: u32,
    // Balance from
    bal_from: u32,
    bal_intermediate_roots: [Field; 2],
    // Root of the balance tree
    bal_root: pub Field,
    bal_root_from_index: Field,
    bal_root_to_index: Field,
    bal_root_from_path: [Field; 4],
    bal_root_to_path: [Field; 4],
    bal_to: u32,
    // Depth of the balance tree
    _bal_tree_depth: Field, 
    from: Pubkey, 
    nonce_to: Field,
    nonce_from: Field,
    to: Pubkey,
    token_type_to: Field, 
    token_type_from: Field,
    // Root of tx merkle tree
    tx_root: pub Field,
    // Position of transaction root
    tx_root_index: Field,
    // Path to transaction root. Harcoded to four for now
    tx_root_path: [Field; 4],
    // Transaction signature
    tx_signature: Signature,
    // Depth of transaction tree
    _tx_tree_depth: u32
    )  {

    // let ZERO_ADDRESS = Pubkey {
    //     x: 0x0000000000000000000000000000000000000000,
    //     y: 0x0000000000000000000000000000000000000000
    // };
    let NONCE_MAX_VALUE = 100;

    // Assert current state equals first intermediate root
    assert(bal_root == bal_intermediate_roots[0]);

    // Assert transaction exists and that it is signed
    let tx_leaf: Field = tx_leaf_hash(
        TxLeaf {
             amount, 
             from, 
             from_index: bal_root_from_index, 
             nonce: nonce_from, 
             to, 
             to_index: bal_root_to_index, 
             token_type: token_type_from 
        }
    );
    leaf_exists(tx_leaf, InclusionProof { index: tx_root_index, path: tx_root_path, root: tx_root});
    leaf_signed(tx_leaf, from, tx_signature);

    // Check tx sender balance exists
    let from_bal_leaf = balance_leaf_hash(BalanceLeaf { balance: bal_from, nonce: nonce_from, pubkey: from, token_type: token_type_from });
    leaf_exists(from_bal_leaf, InclusionProof { index: bal_root_from_index, path: bal_root_from_path, root: bal_root});

    // Check balances
    assert(bal_from - amount <= bal_from);
    assert(bal_to + amount >= bal_to);
    assert(nonce_from != NONCE_MAX_VALUE);

    // Check token types if not withdraw
    // if(to.x == ZERO_ADDRESS.x & to.y == ZERO_ADDRESS.y) {
    //     assert(token_type_to == token_type_from);
    // }

    // Create new sender
    let new_sender_balance = BalanceLeaf {
        balance: bal_from - amount,
        nonce: nonce_from + 1,
        pubkey: to,
        token_type: token_type_from
    };

    // Get intermediate root for sender
    let new_sender_balance_hash = balance_leaf_hash(new_sender_balance);
    let intermediate_root = compute_merkle_root_poseidon(new_sender_balance_hash, bal_root_from_index, bal_root_from_path);

    // Check receiver existence in intermediate root
    let to_bal_leaf = balance_leaf_hash(BalanceLeaf { balance: bal_to, nonce: nonce_to, pubkey: to, token_type: token_type_to });
    leaf_exists(to_bal_leaf, InclusionProof { index: bal_root_to_index, root: intermediate_root, path: bal_root_to_path });

    // Check whether receiver is 0 address and if not then increment balance
    // TODO
    let new_receiver_balance = BalanceLeaf {
        balance: bal_to + amount,
        nonce: nonce_to,
        pubkey: from,
        token_type: token_type_to
    };
    // Create new receiver balance leaf
    let to_bal_new_leaf = balance_leaf_hash(new_receiver_balance);
    let computed_root_from_new_receiver = compute_merkle_root_poseidon(to_bal_new_leaf, bal_root_to_index, bal_root_to_path);

    // computed_root_from_new_receiver
}