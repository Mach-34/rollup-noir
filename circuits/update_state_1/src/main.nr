mod utils;

use crate::utils::{ 
    BalanceLeaf, 
    balance_leaf_hash, 
    compute_merkle_root_poseidon,
    InclusionProof, 
    leaf_exists, 
    signed_leaf, 
    Pubkey,
    // Signature,
    tx_leaf_hash, 
    TxLeaf 
};
use dep::std;

fn main(
    amount: [u126; 1],
    // _intermediate_roots: [Field; 1],
    bal_root: pub Field,
    from_pubkeys: [Field; 2], 
    from_bals: [u126; 1],
    from_indeces: [Field; 1],
    from_nonces: [Field; 1],
    from_paths: [Field; 4],
    from_token_types: [Field; 1],
    to_pubkeys: [Field; 2],
    to_bals: [u126; 1],
    to_indeces: [Field; 1],
    to_nonces: [Field; 1],
    to_paths: [Field; 4],
    to_token_types: [Field; 1], 
    tx_paths: [Field; 2],
    signatures: [u8; 64],
    tx_root: pub Field
) -> pub Field {
    
    // let NONCE_MAX_VALUE = 100;

    // Assert current state equals first intermediate root
    // assert(bal_root == intermediate_roots[0]);

    let mut out_root: Field = 0;

    for i in 0..1 {

        let from = Pubkey {
            x: from_pubkeys[i * 2],
            y: from_pubkeys[i * 2 + 1]
        };

        let to = Pubkey {
            x: to_pubkeys[i * 2],
            y: to_pubkeys[i * 2 + 1]
        };

        // Assert transaction exists and that it is signed
        let tx_leaf: Field = tx_leaf_hash(
            TxLeaf {
                amount: amount[i], 
                from, 
                from_index: from_indeces[i], 
                nonce: from_nonces[i], 
                to,
                token_type: from_token_types[i]
            }
        );

        // leaf_exists(tx_leaf, InclusionProof { 
        //     index: i,
        //     path: [tx_paths[i * 4], tx_paths[i * 4 + 1], tx_paths[i * 4 + 2], tx_paths[i * 4 + 3]], 
        //     root: tx_root
        // });

        let mut signature = [0; 64];
        for j in 0..64 {
            signature[j] = signatures[i*64 + j];
        }

        let pubkey = Pubkey {
            x: from_pubkeys[i * 2],
            y: from_pubkeys[i * 2 + 1]
        };

        // signed_leaf(tx_leaf, pubkey, signature);

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
        

        // Check sufficient balance
        assert(from_bals[i] >= amount[i] );
        // assert(from_nonces[i] != NONCE_MAX_VALUE);

        // Check token types if not withdraw
        if(to.x == 0) {
            if (to.y == 0) {
                assert(to_token_types[i] == from_token_types[i]);
            }
        }

        // Create new sender
        let new_sender_balance = BalanceLeaf {
            balance: from_bals[i] - amount[i],
            nonce: from_nonces[i] + 1,
            pubkey: from,
            token_type: from_token_types[i]
        };

        // Get intermediate root for sender
        let new_sender_balance_hash = balance_leaf_hash(new_sender_balance);
        let intermediate_root = compute_merkle_root_poseidon(
            new_sender_balance_hash, 
            from_indeces[i], 
            [from_paths[i * 4], from_paths[i * 4 + 1], from_paths[i * 4 + 2], from_paths[i * 4 + 3]]
        );

        // Check receiver existence in intermediate root
        let to_bal_leaf = balance_leaf_hash(BalanceLeaf { 
            balance: to_bals[i],
            nonce: to_nonces[i],
            pubkey: to,
            token_type: to_token_types[i]
        });

        leaf_exists(to_bal_leaf, InclusionProof { 
            index: to_indeces[i], 
            root: intermediate_root, 
            path: [to_paths[i * 4], to_paths[i * 4 + 1], to_paths[i * 4 + 2], to_paths[i * 4 + 3]] 
        });

        // Check whether receiver is 0 address and if not then increment balance
        let mut bal_to_add: u126 = 0;
        if (to.x == 0) {
            if (to.y == 0) {
                bal_to_add = 0;
            } else {
                bal_to_add = amount[i];
            }
        } else {
            bal_to_add = amount[i];
        }

        let new_receiver_balance = BalanceLeaf {
            balance: to_bals[i] + bal_to_add,
            nonce: to_nonces[i],
            pubkey: from,
            token_type: to_token_types[i]
        };
    
        // Create new receiver balance leaf
        let to_bal_new_leaf = balance_leaf_hash(new_receiver_balance);
        out_root = compute_merkle_root_poseidon(
            to_bal_new_leaf, 
            to_indeces[i], 
            [to_paths[i * 4], to_paths[i * 4 + 1], to_paths[i * 4 + 2], to_paths[i * 4 + 3]]
        );
    }

    out_root
}

#[test]
fn hardcoded_no_time() {
    let from_pubkeys = [
        0x8b8cbd7965656f7b552ccd2b89e64a107012642456bfcd15039ecaa74b3e6dfc,
        0xa350d2706cc6742254bea0d07961e8462d51ce65a255c959548e5d6016d632da
    ];
    let to_pubkeys = [
        0xef796c2b9d7ccbcdea9505a89a88d404ab1a25acced1a25a5d0040ab18e05a48,
        0x7abdd9582e3d984f3266fc97acd94d44216fd87a8e4d53efe31c5e0b16021d83
    ];
    let amount = [ 200 ];
    let from_indeces = [ 2 ];
    let from_nonces = [ 0 ];
    let from_token_types = [ 1 ];
    let from_bals = [
        0x0000000000000000000000000000000000000000000000000000000000009c40
    ];
    let to_nonces = [ 0 ];
    let to_bals = [
        0x000000000000000000000000000000000000000000000000000000000000000f
    ];
    let to_token_types = [ 1 ];
    let tx_paths = [
        0x1ee9416ff6b676a92e8ca07083a1ffd86147ec3b65fb590058add34b5695170a,
        0x1948b5e9c93c4dafd504eddd7871fb9010be1a1cd2ce2ca50f53460322de1f1f,
    ];
    let from_paths = [
        0x1431d9f800f029d5c98023f38b0b30063af60e8a5f72e0b9fba8bac0a4e8b1e2,
        0x305c340ca0068202374dad283f56aa3a80b3195b861688e8ee91fee4b420c05d,
        0x1069673dcdb12263df301a6ff584a7ec261a44cb9dc68df067a4774460b1f1e1,
        0x18f43331537ee2af2e3d758d50f72106467c6eea50371dd528d57eb2b856d238
    ];
    let to_paths = [
        0x1ba2535109abad7b7d1fafd800e6099e4773446f85385d20d3949b6336bd0110,
        0x305c340ca0068202374dad283f56aa3a80b3195b861688e8ee91fee4b420c05d,
        0x1069673dcdb12263df301a6ff584a7ec261a44cb9dc68df067a4774460b1f1e1,
        0x18f43331537ee2af2e3d758d50f72106467c6eea50371dd528d57eb2b856d238
    ];
    let tx_root = 0x1f437f063bba48c0b3d265483fcac96d56e6a0c1096c0fa2d5118ed637ac6666;
    let bal_root = 0x2ca891617e89824c8a6b50c218a019980ab2e4df050173153438ca478825f1cd;
    let next_root = 0x0f2799e8c3234c1e2190b67e5e60e10f8bec372addf3a9bdf93d86f178d3c8e1;
    let signatures = [
        48,
        69,
        2,
        33,
        0,
        229,
        234,
        15,
        67,
        19,
        24,
        14,
        232,
        125,
        163,
        16,
        199,
        226,
        13,
        233,
        81,
        21,
        36,
        210,
        231,
        236,
        25,
        66,
        200,
        118,
        219,
        33,
        156,
        177,
        237,
        56,
        188,
        2,
        32,
        100,
        145,
        32,
        148,
        207,
        78,
        48,
        255,
        42,
        29,
        209,
        12,
        165,
        91,
        11,
        101,
        177,
        167,
        185,
        160,
        89,
        201,
        3,
        97,
        49
    ];
    let to_indeces = [ 3 ];
    crate::main(
        amount,
        bal_root,
        from_pubkeys,
        from_bals,
        from_indeces,
        from_nonces,
        from_paths,
        from_token_types,
        to_pubkeys,
        to_bals,
        to_indeces,
        to_nonces,
        to_paths,
        to_token_types,
        tx_paths,
        signatures,
        tx_root
    );
}
