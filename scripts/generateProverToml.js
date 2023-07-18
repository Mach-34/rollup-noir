const { buildEddsa, buildPoseidon } = require('circomlibjs');
const { IncrementalMerkleTree } = require('@zk-kit/incremental-merkle-tree');
const { writeFileSync } = require('fs');
const { stringify } = require('@iarna/toml');

// Make new accounts
const generateAccounts = (eddsa, F) => {
  const keys = [
    '4411fa416d3e9c18fc0d353b1e035bd6f387e99595255c93ce7f4395010eaf4d',
    'c0e64dc511ef13c75e286847f14a3bfd329307f4481b3bbd49debac6f42de868',
    '7f97f789946523c2e10ac3e70123e68f2194d50fdf37f87b6192d03b763be299',
  ];

  const accounts = [];
  for (let i = 0; i < keys.length; i++) {
    let priv = Buffer.from(keys[i], 'hex');
    accounts.push({
      priv,
      pub: eddsa.prv2pub(priv).map((point) => F.toObject(point)),
    });
  }
  return accounts;
};

// Generate transactions
const generateTransactions = (accounts) => {
  const transactions = [
    {
      from: accounts[1].pub,
      fromIndex: 2,
      to: accounts[0].pub,
      toIndex: 1,
      nonce: 0,
      amount: 100,
      tokenType: 1,
    },
    {
      from: accounts[1].pub,
      fromIndex: 2,
      to: accounts[0].pub,
      toIndex: 1,
      nonce: 2,
      amount: 37,
      tokenType: 1,
    },
    {
      from: accounts[2].pub,
      fromIndex: 3,
      to: accounts[1].pub,
      toIndex: 2,
      nonce: 2,
      amount: 6,
      tokenType: 1,
    },
    {
      from: accounts[0].pub,
      fromIndex: 1,
      to: accounts[2].pub,
      toIndex: 3,
      nonce: 3,
      amount: 95,
      tokenType: 1,
    },
  ].slice(0, 1);
  return transactions;
};

const numToHex = (num) => {
  const hex = num.toString(16);
  // Add missing padding based of hex number length
  const padded = `${'0'.repeat(64 - hex.length)}${hex}`;
  return `0x${Buffer.from(padded, 'hex').toString('hex')}`;
};

const input = {
  amount: [], // array of L2 transaction values
  bal_root: undefined,
  from: [], // array of sender eddsa keys
  from_balance: [], // array of sender balances
  from_index: [], // array of sender index in balance tree
  from_nonce: [], // array of sender nonce for tx
  from_path: [],
  from_token_type: [], // array of sender token types
  intermediate_roots: [],
  to: [], // array of receiver eddsa keys x
  to_balance: [],
  to_index: [],
  to_nonce: [], // array of receiver nonce in bal tree
  to_path: [],
  to_token_type: [],
  tx_root: undefined,
  tx_path: [],
  // signature: [], // array of signatures by sender eddsa key on tx data
  // txPath: [],
  // txRoot: undefined,
  // nextRoot: undefined,
};

const toToml = (input) => {
  let amount = input.amount[0];
  let bal_root = input.bal_root;
  let from = {
    x: input.from[0][0],
    y: input.from[0][1],
  };
  let from_bal = input.from_balance[0];
  let from_index = input.from_index[0];
  let from_nonce = input.from_nonce[0];
  let from_path = input.from_path[0];
  let from_token_type = input.from_token_type[0];
  let intermediate_roots = input.intermediate_roots[0];
  let to = {
    x: input.to[0][0],
    y: input.to[0][1],
  };
  let to_bal = input.to_balance[0];
  let to_index = input.to_index[0];
  let to_nonce = input.to_nonce[0];
  let to_path = input.to_path[0];
  let to_token_type = input.to_token_type[0];
  let tx_root = input.tx_root;
  let tx_path = input.tx_path[0];
  // let signature = input.signature[0];
  // let nextRoot = input.nextRoot;
  writeFileSync(
    'circuits/Prover.toml',
    stringify({
      amount,
      bal_root,
      from,
      from_bal,
      from_index,
      from_nonce,
      from_path,
      from_token_type,
      intermediate_roots,
      to,
      to_bal,
      to_index,
      to_nonce,
      to_path,
      to_token_type,
      tx_root,
      tx_path,
      // nextRoot,
    })
  );
};

(async () => {
  const eddsa = await buildEddsa();
  const poseidon = await buildPoseidon();
  const _poseidon = (data) => F.toObject(poseidon(data));
  const F = poseidon.F;
  const treeDepth = 4;

  const accounts = generateAccounts(eddsa, F);
  const transactions = generateTransactions(accounts);

  // Create arbitrary balance leaves
  const balanceLeaves = [
    // [pubkey_x, pubkey_y, balance, nonce, tokenType]
    [0, 0, 0, 0, 0], // empty root
    [accounts[0].pub[0], accounts[0].pub[1], 100, 1, 1],
    [accounts[1].pub[0], accounts[1].pub[1], 200, 0, 1],
    [accounts[2].pub[0], accounts[2].pub[1], 0, 3, 1],
  ];

  const hashes = balanceLeaves.map((leaf) => poseidon(leaf));

  // built merkle tree
  const balanceTree = new IncrementalMerkleTree(_poseidon, treeDepth, 0);
  for (let i = 0; i < hashes.length; i++) {
    balanceTree.insert(F.toObject(hashes[i]));
  }

  const txTree = new IncrementalMerkleTree(_poseidon, treeDepth, 0);
  // Insert empty root
  txTree.insert(F.toObject(poseidon([0, 0, 0, 0, 0, 0, 0, 0])));

  const intermediateRoots = [];
  const oldRoot = balanceTree.root;
  for (let i = 0; i < transactions.length; i++) {
    const { amount, from, fromIndex, to, toIndex } = transactions[i];

    const fromBalance = balanceLeaves[fromIndex][2];
    const fromNonce = balanceLeaves[fromIndex][3];
    const toBalance = balanceLeaves[toIndex][2];
    const toNonce = balanceLeaves[toIndex][3];

    const newTxLeaf = [
      ...from,
      BigInt(fromIndex),
      ...to,
      BigInt(fromNonce),
      BigInt(amount),
      BigInt(1),
    ];

    const newTxLeafHash = F.toObject(poseidon(newTxLeaf));
    txTree.insert(newTxLeafHash);
    const txPath = txTree
      .createProof(i + 1)
      .siblings.map((sibling) => numToHex(sibling[0]));
    const txRoot = numToHex(txTree.root);

    const newSenderLeaf = [
      ...from,
      BigInt(fromBalance - amount),
      BigInt(fromNonce + 1),
      BigInt(1),
    ];

    const newSenderLeafHash = F.toObject(poseidon(newSenderLeaf));
    balanceTree.update(fromIndex, newSenderLeafHash);
    intermediateRoots.push(numToHex(balanceTree.root));

    const senderPath = balanceTree
      .createProof(fromIndex)
      .siblings.map((sibling) => numToHex(sibling[0]));

    const newReceiverLeaf = [
      ...to,
      BigInt(toBalance + amount),
      BigInt(toNonce),
      BigInt(1),
    ];

    const newReceiverLeafHash = F.toObject(poseidon(newReceiverLeaf));
    balanceTree.update(toIndex, newReceiverLeafHash);
    const receiverPath = balanceTree
      .createProof(toIndex)
      .siblings.map((sibling) => numToHex(sibling[0]));

    input.amount.push(amount);
    input.bal_root = numToHex(oldRoot);
    input.from.push(
      accounts[fromIndex - 1].pub.map((point) => numToHex(point))
    );
    input.intermediate_roots.push(intermediateRoots);
    input.from_balance.push(fromBalance);
    input.from_index.push(fromIndex);
    input.from_nonce.push(fromNonce);
    input.from_path.push(senderPath);
    input.from_token_type.push(1);
    input.to.push(accounts[toIndex - 1].pub.map((point) => numToHex(point)));
    input.to_balance.push(toBalance);
    input.to_index.push(toIndex);
    input.to_nonce.push(toNonce);
    input.to_path.push(receiverPath);
    input.to_token_type.push(1);
    input.tx_path.push(txPath);
    input.tx_root = txRoot;
    // input.signature.push(0);

    // Update balance leaf array
    balanceLeaves[fromIndex][2] -= amount; // Decrement from balance
    balanceLeaves[fromIndex][3] += 1; // Increment from nonce
    balanceLeaves[toIndex][2] += amount; // Increment to balance
  }

  toToml(input);
})();
