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

fn leaf_signed(leafHash: Field, pubkey: Pubkey, signature: Signature) {
    let sig = std::eddsa::eddsa_poseidon_verify(
        pubkey.x,
        pubkey.y,
        signature.s,
        signature.r8_x,
        signature.r8_y,
        leafHash
    );
    std::println(sig);
    assert(sig);
}

// #[test]
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

// #[test]
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

// #[test]
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

// #[test]
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
fn compute_merkle_root_poseidon_smoke() {
    // compute leaf hash
    let leaf = BalanceLeaf {
        pubkey: [
            7660126285266445286548324255609813871639407507152527639553716363917170804277,
            11419010026410334240551877080760791434837049736904505893713114771266686468710
        ],
        balance: 200,
        nonce: 0,
        tokenType: 1
    };
    let hash = balance_leaf_hash(leaf);
    // hardcode proof (see 0.js)
    let index = 2;
    let expectedRoot = 5735766539539648816700417747761444171779780605970317510153689184814710974970;
    let path = [
        9686388100806161308074724616194138161728276585166465104628140895705977187689,
        4732818058559901513408018651692750856554170670513858096493186557109422001110,
        7423237065226347324353380772367382631490014989348495481811164164159255474657,
        11286972368698509976183087595462810875513684078608517520839298933882497716792
    ];
    let root = compute_merkle_root_poseidon(hash, index, path);
    assert(root == expectedRoot);
}


#[test]
fn leaf_signed_smoke() {
    let leaf = BalanceLeaf {
        pubkey: [1, 2],
        balance: 3,
        nonce: 4,
        tokenType: 5
    };
    let hash = balance_leaf_hash(leaf);

    let pubkey = Pubkey {
        x: 12653757428061103024374384205286475483130951369739302427753609032037816464059,
        y: 7645647562926909505182629635419116302593333231408581725901243858369176450121
    };

    let signature = Signature {
        r8_x: 19847164716083616171251445047044473944329034859355418411967328142519510413295,
        r8_y: 7555683800664792576856279407826277085998910420351675657964023460161425542592,
        s: 181739666009581525486738516344469887876748881931663077411747898844416001857
    };

    leaf_signed(hash, pubkey, signature);
}