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
    amount: [u32; 4],
    // _intermediate_roots: [Field; 1],
    bal_root: pub Field,
    from_pubkeys: [Field; 8], 
    from_bals: [u32; 4],
    from_indeces: [Field; 4],
    from_nonces: [Field; 4],
    from_paths: [Field; 16],
    from_token_types: [Field; 4],
    to_pubkeys: [Field; 8],
    to_bals: [u32; 4],
    to_indeces: [Field; 4],
    to_nonces: [Field; 4],
    to_paths: [Field; 16],
    to_token_types: [Field; 4], 
    tx_paths: [Field; 16],
    tx_root: Field
    ) {

    // // let ZERO_ADDRESS = Pubkey {
    // //     x: 0x0000000000000000000000000000000000000000,
    // //     y: 0x0000000000000000000000000000000000000000
    // // };
    let NONCE_MAX_VALUE = 100;

    // Assert current state equals first intermediate root
    // assert(bal_root == intermediate_roots[0]);

    for i in 0..3 {

        let from = Pubkey {
            x: from_pubkeys[i * 2],
            y: from_pubkeys[i * 2 + 1]
        };

        let to = Pubkey {
            x: to_pubkeys[i * 2],
            y: to_pubkeys[i * 2 + 1]
        };

        // Assert transaction exists and that it is signed
        // let tx_leaf: Field = tx_leaf_hash(
        //     TxLeaf {
        //          amount: amount[i], 
        //          from, 
        //          from_index: from_indeces[i], 
        //          nonce: from_nonces[i], 
        //          to, 
        //          token_type: from_token_types[i]
        //     }
        // );
        // leaf_exists(tx_leaf, InclusionProof { 
        //     index: i + 1, 
        //     path: [tx_paths[i], tx_paths[i + 1], tx_paths[i + 2], tx_paths[i + 3]], 
        //     root: tx_root
        // });
    // leaf_signed(tx_leaf, from, tx_signature);

    // Check tx sender balance exists
    let from_bal_leaf = balance_leaf_hash(BalanceLeaf { 
        balance: from_bals[i], 
        nonce: from_nonces[i], 
        pubkey: from, 
        token_type: from_token_types[i] 
    });
    leaf_exists(from_bal_leaf, InclusionProof { 
        index: from_indeces[i], 
        path: [
            from_paths[i * 4],
            from_paths[i * 4 + 1],
            from_paths[i * 4 + 2],
            from_paths[i * 4 + 3]
        ], 
        root: bal_root
    });

    // Check balances
    assert(from_bals[i] - amount[i] <= from_bals[i]);
    assert(to_bals[i] + amount[i] >= to_bals[i]);
    assert(from_nonces[i] != NONCE_MAX_VALUE);

    // Check token types if not withdraw
    // if(to.x == ZERO_ADDRESS.x & to.y == ZERO_ADDRESS.y) {
    //     assert(token_type_to == token_type_from);
    // }

    // Create new sender
    // let new_sender_balance = BalanceLeaf {
    //     balance: from_bals[i] - amount[i],
    //     nonce: from_nonces[i] + 1,
    //     pubkey: from,
    //     token_type: from_token_types[i]
    // };

    // // Get intermediate root for sender
    // let new_sender_balance_hash = balance_leaf_hash(new_sender_balance);
    // let intermediate_root = compute_merkle_root_poseidon(
    //     new_sender_balance_hash, 
    //     from_indeces[i], 
    //     [from_paths[i], from_paths[i + 1], from_paths[i + 2], from_paths[i + 3]]
    // );

    // // // Check receiver existence in intermediate root
    // let to_bal_leaf = balance_leaf_hash(BalanceLeaf { balance: to_bals[i], nonce: to_nonces[i], pubkey: to, token_type: to_token_types[i] });
    // leaf_exists(to_bal_leaf, InclusionProof { 
    //     index: to_indeces[i], 
    //     root: intermediate_root, 
    //     path: [to_paths[i], to_paths[i + 1], to_paths[i + 2], to_paths[i + 3]] 
    // });

    // // Check whether receiver is 0 address and if not then increment balance
    // // TODO
    // let new_receiver_balance = BalanceLeaf {
    //     balance: to_bals[i] + amount[i],
    //     nonce: to_nonces[i],
    //     pubkey: from,
    //     token_type: to_token_types[i]
    // };
    // // Create new receiver balance leaf
    // let to_bal_new_leaf = balance_leaf_hash(new_receiver_balance);
    // let computed_root_from_new_receiver = compute_merkle_root_poseidon(
    //     to_bal_new_leaf, 
    //     to_indeces[i], 
    //     [to_paths[i], to_paths[i + 1], to_paths[i + 2], to_paths[i + 3]]
    // );
    }

    // computed_root_from_new_receiver
}
