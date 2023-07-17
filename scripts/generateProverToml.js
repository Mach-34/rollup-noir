const { buildEddsa, buildPoseidon } = require('circomlibjs');
const { IncrementalMerkleTree } = require('@zk-kit/incremental-merkle-tree');
const { writeFileSync } = require('fs');
const { stringify } = require('@iarna/toml');

const numToHex = (num) => {
  const hex = num.toString(16);
  // Add missing padding based of hex number length
  const padded = `${'0'.repeat(64 - hex.length)}${hex}`;
  return `0x${Buffer.from(padded, 'hex').toString('hex')}`;
};

(async () => {
  const eddsa = await buildEddsa();
  const poseidon = await buildPoseidon();
  const _poseidon = (data) => F.toObject(poseidon(data));
  const F = poseidon.F;
  const treeDepth = 4;

  // make new accounts
  const keys = [
    '4411fa416d3e9c18fc0d353b1e035bd6f387e99595255c93ce7f4395010eaf4d',
    'c0e64dc511ef13c75e286847f14a3bfd329307f4481b3bbd49debac6f42de868',
    '7f97f789946523c2e10ac3e70123e68f2194d50fdf37f87b6192d03b763be299',
  ];
  // type Account = {
  //     priv: Buffer,
  //     pub: [bigint, bigint]
  // }
  let accounts = [];
  for (let i = 0; i < keys.length; i++) {
    let priv = Buffer.from(keys[i], 'hex');
    accounts.push({
      priv,
      pub: eddsa.prv2pub(priv).map((point) => F.toObject(point)),
    });
  }

  // create arbitrary balance leaves
  let balanceLeafs = [
    // [pubkey_x, pubkey_y, balance, nonce, tokenType]
    [0n, 0n, 0n, 0n, 0n], // empty root
    [accounts[0].pub[0], accounts[0].pub[1], 100n, 1n, 1n],
    [accounts[1].pub[0], accounts[1].pub[1], 200n, 0n, 1n],
    [accounts[2].pub[0], accounts[2].pub[1], 0n, 3n, 1n],
  ];
  let hashes = balanceLeafs.map((leaf) => poseidon(leaf));

  // built merkle tree
  let tree = new IncrementalMerkleTree(_poseidon, treeDepth, 0);
  let intermediateRoots = [];
  for (let i = 0; i < hashes.length; i++) {
    tree.insert(F.toObject(hashes[i]));
  }

  let TxLeaf = {
    from: accounts[1].pub,
    fromIndex: 2,
    to: accounts[0].pub,
    nonce: 1,
    amount: 100,
    tokenType: 1,
  }

  // get old root for state change 1
  let oldRoot = tree.root;
  // compute sender changed leaf
  let newSenderLeaf = [
    ...accounts[1].pub,
    BigInt(200 - 100),
    BigInt(0 + 1),
    BigInt(1),
  ]
  let newSenderLeafHash = F.toObject(poseidon(newSenderLeaf));
  tree.update(2, newSenderLeafHash);
  // get intermediate proof for state change 1
  let intermediateRoot = tree.root;
  let senderPath = tree.createProof(2).siblings.map(sibling => numToHex(sibling[0]));
  // compute receiver changed leaf
  let newReceiverLeaf = [
    ...accounts[0].pub,
    BigInt(100 - 100),
    BigInt(1),
    BigInt(1),
  ]
  let newReceiverLeafHash = F.toObject(poseidon(newReceiverLeaf));
  tree.update(1, newReceiverLeafHash);
  // get new root for state change 1
  let newRoot = tree.root;
  let receiverPath = tree.createProof(1).siblings.map(sibling => numToHex(sibling[0]));

  input = {
    from: [], // array of sender eddsa keys
    to: [], // array of receiver eddsa keys x
    amount: [], // array of L2 transaction values
    fromIndex: [], // array of sender index in balance tree
    fromNonce: [], // array of sender nonce for tx
    fromTokenType: [], // array of sender token types
    // signature: [], // array of signatures by sender eddsa key on tx data
    fromBalance: [], // array of sender balances
    toNonce: [], // array of receiver nonce in bal tree
    toBalance: [],
    toTokenType: [],
    // txPath: [],
    fromPath: [],
    toPath: [],
    // txRoot: undefined,
    prevRoot: undefined,
    nextRoot: undefined
  }

  input.from.push(accounts[1].pub.map(point => numToHex(point)));
  input.to.push(accounts[1].pub.map(point => numToHex(point)));
  input.amount.push(100);
  input.fromIndex.push(2);
  input.fromNonce.push(0);
  input.fromTokenType.push(1);
  // input.signature.push(0);
  input.fromBalance.push(200);
  input.toNonce.push(1);
  input.toBalance.push(100);
  input.toTokenType.push(1);
  input.fromPath.push(senderPath);
  input.toPath.push(receiverPath);
  input.prevRoot = numToHex(oldRoot);
  input.nextRoot = numToHex(newRoot);

  let toToml = (input) => {
    let from = {
      x: input.from[0][0],
      y: input.from[0][1]
    }
    let to = {
      x: input.to[0][0],
      y: input.to[0][1]
    }
    let amount = input.amount[0];
    let fromIndex = input.fromIndex[0];
    let fromNonce = input.fromNonce[0];
    let fromTokenType = input.fromTokenType[0];
    // let signature = input.signature[0];
    let fromBalance = input.fromBalance[0];
    let toNonce = input.toNonce[0];
    let toBalance = input.toBalance[0];
    let toTokenType = input.toTokenType[0];
    let fromPath = input.fromPath[0];
    let toPath = input.toPath[0];
    let prevRoot = input.prevRoot;
    let nextRoot = input.nextRoot;
    writeFileSync(
      'circuits/Prover.toml',
      stringify({
        from,
        to,
        amount,
        fromIndex,
        fromNonce,
        fromTokenType,
        fromBalance,
        toNonce,
        toBalance,
        toTokenType,
        fromPath,
        toPath,
        prevRoot,
        nextRoot
      })
    )
  }

  toToml(input)

})();
