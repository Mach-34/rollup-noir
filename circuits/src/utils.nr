use dep::std;
use dep::std::ec::consts::te::baby_jubjub;

struct Pubkey {
    x: Field,
    y: Field
}

struct Signature {
    r8_x: Field,
    r8_y: Field,
    s: Field
}

struct BalanceLeaf {
    pubkey: Pubkey,
    balance: u32,
    nonce: Field,
    token_type: Field
}

struct TxLeaf {
    from: Pubkey,
    from_index: Field,
    to: Pubkey,
    to_index: Field,
    nonce: Field,
    amount: u32,
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
    std::hash::poseidon::bn254::hash_9([leaf.from.x, leaf.from.y, leaf.from_index, leaf.to.x, leaf.to.y, leaf.to_index, leaf.nonce, leaf.amount as Field, leaf.token_type])
}

fn leaf_exists(leaf_hash: Field, proof: InclusionProof) {
    // check hash exists in tree
    let root = compute_merkle_root_poseidon(leaf_hash, proof.index, proof.path);
    assert(root == proof.root);
}

// fn leaf_signed(leaf_hash: Field, pubkey: Pubkey, signature: Signature) {
//     let sig = std::eddsa::eddsa_poseidon_verify(
//         pubkey.x,
//         pubkey.y,
//         signature.s,
//         signature.r8_x,
//         signature.r8_y,
//         leaf_hash
//     );
//     std::println(sig);
//     assert(sig);
// }

#[test]
fn balance_leaf_smoke() {
    let leaf = BalanceLeaf {
        pubkey: Pubkey {x: 1, y: 2},
        balance: 3,
        nonce: 4,
        token_type: 5
    };
    let hash = balance_leaf_hash(leaf);
    assert(hash == 6183221330272524995739186171720101788151706631170188140075976616310159254464);
    let hash_bytes = hash.to_be_bytes(32);
    
    let mut arr = [0; 32];
    for i in 0..32 {
        arr[i] = hash_bytes[i];
    }
    std::println(arr);
}

// #[test]
// fn tx_leaf_smoke() {
//     let leaf = TxLeaf {
//         from: Pubkey {x: 1, y: 2},
//         from_index: 3,
//         to: Pubkey {x: 4, y: 5},
//         to_index: 6,
//         nonce: 7,
//         amount: 8000000,
//         token_type: 9
//     };
//     let hash = tx_leaf_hash(leaf);
//     assert(hash == 0x27f1124b9b7e3b51c5bf70769996734beda148b6c4db91a155cf546a9ac279e0);
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
// fn tx_leaf_hash_smoke() {
//     let leaf = TxLeaf {
//         from: Pubkey {x: 1, y: 2},
//         from_index: 3,
//         to: Pubkey {x: 4, y: 5},
//         to_index: 6,
//         nonce: 7,
//         amount: 8,
//         token_type: 9
//     };
//     let hash = tx_leaf_hash(leaf);
//     let expected_hash = 13589767895268936107593642967621470491511464502761040466226072462545218539640;
//     assert(hash == expected_hash);
// }

// #[test]
// fn test_pedersen() {
//     // let hash = std::hash::pedersen([1, 2, 3, 4, 5]);
//     // let expected = 10794459586154443268856875458305400297463667634167567592475511904802857085222;
//     // assert(expected == hash[0]);
//     let priv = 8900794432412098678157843732451793825914519421842587003037498930217951866700;
//     let message = std::hash::poseidon::bn254::hash_5([1, 2, 3, 4, 5]);
//     let bjj = baby_jubjub();
//     let r_a_hash = std::hash::pedersen([priv, message]);
//     let r_a = r_a_hash[0] % bjj.suborder;
//     let expected = 1130638797890098283256262364707153579998729768022358804625580947888279421389;
//     // std::println(r_a);
//     // std::println(expected);

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
// fn schnorr_smoke() {
//     // let privkey = 0x4411fa416d3e9c18fc0d353b1e035bd6f387e99595255c93ce7f4395010eaf4d;
//     let privkey = 0x000000000000000000000000000000000000000000000000000000616c696365;
//     let pubkey = std::scalar_mul::fixed_base(privkey);
//     // let expected_x = 371434088001897802303880190524913994082732621376151683699692493994841643869;
//     // let expected_y = 11775518236557956576257551166622112934216379426254866820167370416701353685313;
//     // assert(pubkey[0] == expected_x);
//     // assert(pubkey[1] == expected_y);
// }