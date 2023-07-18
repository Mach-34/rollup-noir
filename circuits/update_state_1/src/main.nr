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
        //     path: [tx_paths[i * 2], tx_paths[i * 2 + 1]], 
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

        signed_leaf(tx_leaf, pubkey, signature);

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
  0xaa4420338856e860066c20b74d9b025557fd5858298069793617455d423611b2,
  0x8a6d7f582f4f055f2351dafcd918ac2f58dfc26f82cc3a22d6ab731e601d2357
];
let to_pubkeys = [
  0x9926713e3b996beb36fd1c829beeecdc5dedfb0f0147ef91e77c58de042de4ca,
  0x6a1bd8c96c43f9ec19e72f9a1961e23f8851a025667eae5bbd50f941135bf74b
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
  0x2aa7f74429382ee3d696b518637485fdb838680f6609fa24a10ce73ab5c22d9f,
  0x0c6b24b21ec1f797e0d87bdbabf2af4590ff8fbd611cbe498f2778437f76e203
];
let from_paths = [
  0x113e4420c1e584dfa261a07ac94aefa92cbf1908fcde687ebe2dec301a3a5855,
  0x207c4d21735059bc3ab0c41c9f0569ca96a9369994e3b4f2958cca919b5bce03,
  0x1069673dcdb12263df301a6ff584a7ec261a44cb9dc68df067a4774460b1f1e1,
  0x18f43331537ee2af2e3d758d50f72106467c6eea50371dd528d57eb2b856d238
];
let to_paths = [
  0x0a6806bd9baecbeaedc8e9594232bf892cdb5e126f30c380bd75ee3877e52400,
  0x207c4d21735059bc3ab0c41c9f0569ca96a9369994e3b4f2958cca919b5bce03,
  0x1069673dcdb12263df301a6ff584a7ec261a44cb9dc68df067a4774460b1f1e1,
  0x18f43331537ee2af2e3d758d50f72106467c6eea50371dd528d57eb2b856d238
];
let to_indeces = [ 3 ];
let tx_root = 0x04b0c3cc8e474db4ebf927199f7bec4f86c50ae2d894d7dfbd68541af57a5b36;
let bal_root = 0x02bea43cc144dd22bd403328932d59bc9fb3a13d13f64c534e01073698b3a492;
let next_root = 0x2a3db810e165adeedb61b4237d836e62d870c46f272c15581bee7a04c8bc3d15;
let signatures = [
  48,
  69,
  2,
  33,
  0,
  195,
  44,
  72,
  26,
  130,
  77,
  124,
  32,
  218,
  0,
  33,
  69,
  100,
  142,
  178,
  240,
  224,
  120,
  225,
  155,
  195,
  250,
  100,
  97,
  248,
  18,
  214,
  145,
  151,
  179,
  153,
  62,
  2,
  32,
  75,
  63,
  170,
  235,
  248,
  23,
  137,
  141,
  240,
  91,
  243,
  24,
  213,
  126,
  122,
  252,
  38,
  214,
  98,
  51,
  46,
  37,
  5,
  70,
  213
];
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

