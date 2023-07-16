use dep::std;

struct BalanceLeaf {
    pubkey: [Field; 2],
    balance: Field,
    nonce: Field,
    tokenType: Field
}

fn BalanceLeafHash(leaf: BalanceLeaf) -> Field {
    std::hash::poseidon::bn254::hash_5([leaf.pubkey[0], leaf.pubkey[1], leaf.balance, leaf.nonce, leaf.tokenType])
}


#[test]
fn balance_leaf_smoke() {
    let leaf = BalanceLeaf {
        pubkey: [1, 2],
        balance: 3,
        nonce: 4,
        tokenType: 5
    };
    let hash = BalanceLeafHash(leaf);
    assert(hash == 0x0dab9449e4a1398a15224c0b15a49d598b2174d305a316c918125f8feeb123c0);
}