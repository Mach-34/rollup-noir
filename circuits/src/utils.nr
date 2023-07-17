use dep::std;

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
    std::hash::poseidon::bn254::hash_8([leaf.from.x, leaf.from.y, leaf.from_index, leaf.to.x, leaf.to.y, leaf.nonce, leaf.amount as Field, leaf.token_type])
}

fn leaf_exists(leaf_hash: Field, proof: InclusionProof) {
    // check hash exists in tree
    let root = compute_merkle_root_poseidon(leaf_hash, proof.index, proof.path);
    assert(root == proof.root);
}

fn leaf_signed(leaf_hash: Field, pubkey: Pubkey, signature: Signature) {
    let sig = std::eddsa::eddsa_poseidon_verify(
        pubkey.x,
        pubkey.y,
        signature.s,
        signature.r8_x,
        signature.r8_y,
        leaf_hash
    );
    std::println(sig);
    assert(sig);
}

#[test]
fn balance_leaf_smoke() {
    let leaf = BalanceLeaf {
        pubkey: Pubkey {x: 1, y: 2},
        balance: 3,
        nonce: 4,
        token_type: 5
    };
    let hash = balance_leaf_hash(leaf);
    assert(hash == 0x0dab9449e4a1398a15224c0b15a49d598b2174d305a316c918125f8feeb123c0);
}

#[test]
fn tx_leaf_smoke() {
    let leaf = TxLeaf {
        from: Pubkey {x: 1, y: 2},
        from_index: 3,
        to: Pubkey {x: 4, y: 5},
        nonce: 6,
        amount: 7,
        token_type: 8
    };
    let hash = tx_leaf_hash(leaf);
    assert(hash == 18604317144381847857886385684060986177838410221561136253933256952257712543953);
}

#[test]
fn balance_leaf_hash_smoke() {
    let leaf = BalanceLeaf {
        pubkey: Pubkey {x: 1, y: 2},
        balance: 3,
        nonce: 4,
        token_type: 5
    };
    let hash = balance_leaf_hash(leaf);
    let expected_hash = 6183221330272524995739186171720101788151706631170188140075976616310159254464;
    assert(hash == expected_hash);
}

#[test]
fn test_pedersen() {
    let hash = std::hash::pedersen([1, 2, 3, 4, 5]);
    std::println(hash);
    let expected = 10794459586154443268856875458305400297463667634167567592475511904802857085222;
    assert(expected == hash[0]);
}

// #[test]
// fn leaf_signed_smoke() {
//     let leaf = BalanceLeaf {
//         pubkey: Pubkey {x: 1, y: 2},
//         balance: 3,
//         nonce: 4,
//         token_type: 5
//     };
//     let hash = balance_leaf_hash(leaf);

//     let pubkey = Pubkey {
//         x: 12653757428061103024374384205286475483130951369739302427753609032037816464059,
//         y: 7645647562926909505182629635419116302593333231408581725901243858369176450121
//     };

//     let signature = Signature {
//         r8_x: 19847164716083616171251445047044473944329034859355418411967328142519510413295,
//         r8_y: 7555683800664792576856279407826277085998910420351675657964023460161425542592,
//         s: 181739666009581525486738516344469887876748881931663077411747898844416001857
//     };

//     leaf_signed(hash, pubkey, signature);
// }