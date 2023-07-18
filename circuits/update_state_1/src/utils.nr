use dep::std;
use dep::std::ec::consts::te::baby_jubjub;

struct Pubkey {
    x: Field,
    y: Field
}

struct BalanceLeaf {
    pubkey: Pubkey,
    balance: u126,
    nonce: Field,
    token_type: Field
}

struct TxLeaf {
    from: Pubkey,
    from_index: Field,
    to: Pubkey,
    nonce: Field,
    amount: u126,
    token_type: Field
}

// hardcoded to 4 for now
struct InclusionProof {
    root: Field,
    index: Field,
    path: [Field; 4]
}

// poseidon merkle root computation
fn compute_merkle_root_poseidon(leaf: Field, index: Field, hash_path: [Field]) -> Field {
    let n = hash_path.len();
    let index_bits = index.to_le_bits(n as u32);
    let mut current = leaf;
    for i in 0..n {
        let path_bit = index_bits[i] as bool;
        let (hash_left, hash_right) = if path_bit {
            (hash_path[i], current)
         } else {
            (current, hash_path[i])
         };

      current = std::hash::poseidon::bn254::hash_2([hash_left, hash_right]);
    };
    current
}

fn balance_leaf_hash(leaf: BalanceLeaf) -> Field {
    std::hash::poseidon::bn254::hash_5([leaf.pubkey.x, leaf.pubkey.y, leaf.balance as Field, leaf.nonce, leaf.token_type])
}

fn tx_leaf_hash(leaf: TxLeaf) -> Field {
    let front = std::hash::poseidon::bn254::hash_4([leaf.from.x, leaf.from.y, leaf.from_index, leaf.to.x]);
    let back = std::hash::poseidon::bn254::hash_4([leaf.to.y, leaf.nonce, leaf.amount as Field, leaf.token_type]);
    std::hash::poseidon::bn254::hash_2([front, back])
}

fn leaf_exists(leaf_hash: Field, proof: InclusionProof) {
    // check hash exists in tree
    let root = compute_merkle_root_poseidon(leaf_hash, proof.index, proof.path);
    assert(root == proof.root);
}

fn signed_leaf(leaf_hash: Field, pubkey: Pubkey, signature: [u8; 64]) {
    // decompose field into bytes
    let hash_bytes = leaf_hash.to_be_bytes(32);
    let x_bytes = pubkey.x.to_be_bytes(32);
    let y_bytes = pubkey.y.to_be_bytes(32);

    // copy bytes into correctly sized arrays
    let mut hash_arr = [0; 32];
    let mut x_arr = [0; 32];
    let mut y_arr = [0; 32];
    for i in 0..32 {
        hash_arr[i] = hash_bytes[i];
        x_arr[i] = x_bytes[i];
        y_arr[i] = y_bytes[i];
    }

    // verify signature
    std::ecdsa_secp256k1::verify_signature(x_arr, y_arr, signature, hash_arr);
}

// #[test]
// fn balance_leaf_smoke() {
//     let leaf = BalanceLeaf {
//         pubkey: Pubkey {x: 1, y: 2},
//         balance: 3,
//         nonce: 4,
//         token_type: 5
//     };
//     let hash = balance_leaf_hash(leaf);
//     assert(hash == 6183221330272524995739186171720101788151706631170188140075976616310159254464);
// }

// #[test]
// fn tx_leaf_smoke() {
//     let leaf = TxLeaf {
//         from: Pubkey {x: 1, y: 2},
//         from_index: 3,
//         to: Pubkey {x: 4, y: 5},
//         nonce: 6,
//         amount: 7,
//         token_type: 8
//     };
//     let hash = tx_leaf_hash(leaf);
//     assert(hash == 10338625729162463398541084174035223994976596358038685478464815845052942941177);
// }

// #[test]
// fn balance_leaf_hash_smoke() {
//     let leaf = BalanceLeaf {
//         pubkey: Pubkey {x: 1, y: 2},
//         balance: 3,
//         nonce: 4,
//         token_type: 5
//     };
//     let hash = balance_leaf_hash(leaf);
//     let expected_hash = 6183221330272524995739186171720101788151706631170188140075976616310159254464;
//     assert(hash == expected_hash);
// }

// #[test]
// fn test_pedersen() {
//     let hash = std::hash::pedersen([1, 2, 3, 4, 5]);
//     let expected = 10794459586154443268856875458305400297463667634167567592475511904802857085222;
//     assert(expected == hash[0]);
// }

// #[test]
// fn compute_merkle_root_poseidon_smoke() {
//     // compute leaf hash
//     let leaf = BalanceLeaf {
//         pubkey: Pubkey {
//             x: 7660126285266445286548324255609813871639407507152527639553716363917170804277,
//             y: 11419010026410334240551877080760791434837049736904505893713114771266686468710
//         },
//         balance: 200,
//         nonce: 0,
//         token_type: 1
//     };
//     let hash = balance_leaf_hash(leaf);
//     // hardcode proof (see 0.js)
//     let index = 2;
//     let expectedRoot = 5735766539539648816700417747761444171779780605970317510153689184814710974970;
//     let path = [
//         9686388100806161308074724616194138161728276585166465104628140895705977187689,
//         4732818058559901513408018651692750856554170670513858096493186557109422001110,
//         7423237065226347324353380772367382631490014989348495481811164164159255474657,
//         11286972368698509976183087595462810875513684078608517520839298933882497716792
//     ];
//     let root = compute_merkle_root_poseidon(hash, index, path);
//     // std::println(root);
//     assert(root == expectedRoot);
// }

// #[test]
// fn signed_leaf_smoke() {
//     let hash = std::hash::poseidon::bn254::hash_5([1, 2, 3, 4, 5]);
//     let pubkey = Pubkey {
//         x: 0x0087a91bf746016aa6b04b478424ae1f86e2373cc5daee38d80460fba09ff5f7,
//         y: 0x95007bc08332e8a27939a8f72d83a6072d05296b030f7490235111874c3d877c
//     };
//     let signature = [
//         48,  68,   2,  32, 100, 245,  70, 135,  88,  74, 225,
//         16, 188, 176, 132,  22, 218, 211,  83,  89, 115, 138,
//         77, 229,  70, 171, 195, 113,  69,  68,  13,  58,  41,
//         30, 169,  48,   2,  32, 117, 195,   8, 227, 230, 148,
//         60,  71, 199,  41,   6,  46, 184, 246,  59, 213, 232,
//         128,  52, 134, 248,  90, 250, 218,  94, 251
//     ];
//     signed_leaf(hash, pubkey, signature);
// }
