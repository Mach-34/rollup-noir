use dep::std;

struct BalanceLeaf {
    pubkey: [Field; 2],
    balance: Field,
    nonce: Field,
    tokenType: Field
}

struct TxLeaf {
    from: [Field; 2],
    fromIndex: Field,
    to: [Field; 2],
    toIndex: Field,
    nonce: Field,
    amount: Field,
    tokenType: Field
}

// hardcoded to 4 for now
struct InclusionProof {
    root: Field,
    index: Field,
    path: [Field; 4]
}

fn balance_leaf_hash(leaf: BalanceLeaf) -> Field {
    std::hash::poseidon::bn254::hash_5([leaf.pubkey[0], leaf.pubkey[1], leaf.balance, leaf.nonce, leaf.tokenType])
}

fn tx_leaf_hash(leaf: TxLeaf) -> Field {
    std::hash::poseidon::bn254::hash_9([leaf.from[0], leaf.from[1], leaf.fromIndex, leaf.to[0], leaf.to[1], leaf.toIndex, leaf.nonce, leaf.amount, leaf.tokenType])
}

fn leaf_exists(leafHash: Field, proof: InclusionProof) {
    // check hash exists in tree
    let root = std::merkle::compute_merkle_root(leafHash, proof.index, proof.path);
    assert(root == proof.root);
}

fn leaf_signed(leafHash: Field, pubkey: [Field; 2], sig: [Field; 3]) {
    let sig = std::eddsa::eddsa_poseidon_verify(pubkey[0], pubkey[1], sig[0], sig[1], sig[2], leafHash);
    assert(sig == true);
}

#[test]
fn balance_leaf_smoke() {
    let leaf = BalanceLeaf {
        pubkey: [1, 2],
        balance: 3,
        nonce: 4,
        tokenType: 5
    };
    let hash = balance_leaf_hash(leaf);
    assert(hash == 0x0dab9449e4a1398a15224c0b15a49d598b2174d305a316c918125f8feeb123c0);
}

#[test]
fn tx_leaf_smoke() {
    let leaf = TxLeaf {
        from: [1, 2],
        fromIndex: 3,
        to: [4, 5],
        toIndex: 6,
        nonce: 7,
        amount: 8000000,
        tokenType: 9
    };
    let hash = tx_leaf_hash(leaf);
    assert(hash == 0x27f1124b9b7e3b51c5bf70769996734beda148b6c4db91a155cf546a9ac279e0);
}

#[test]
fn tx_leaf_hash_smoke() {
    let leaf = TxLeaf {
        from: [1, 2],
        fromIndex: 3,
        to: [4, 5],
        toIndex: 6,
        nonce: 7,
        amount: 8,
        tokenType: 9
    };
    let hash = tx_leaf_hash(leaf);
    let expected_hash = 13589767895268936107593642967621470491511464502761040466226072462545218539640;
    assert(hash == expected_hash);
}

#[test]
fn balance_leaf_hash_smoke() {
    let leaf = BalanceLeaf {
        pubkey: [1, 2],
        balance: 3,
        nonce: 4,
        tokenType: 5
    };
    let hash = balance_leaf_hash(leaf);
    let expected_hash = 6183221330272524995739186171720101788151706631170188140075976616310159254464;
    assert(hash == expected_hash);
}
