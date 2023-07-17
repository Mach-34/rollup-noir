import { buildEddsa, buildPoseidon } from 'circomlibjs';
import { IncrementalMerkleTree } from '@zk-kit/incremental-merkle-tree';
import { writeFileSync } from 'fs';
import { stringify } from '@iarna/toml';

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

  // get merkle proof for leaf 2
  const index = 2;
  let proof = tree.createProof(index);
  let path = proof.siblings.map((sibling) => sibling[0]);

  const toIndex = 1;
  let proofTo = tree.createProof(toIndex);
  let pathTo = proofTo.siblings.map((sibling) => sibling[0]);

  // log used variables in poseidon merkle smoke test
  //   console.log('account', accounts[1]);
  //   console.log('hash: ', F.toObject(hashes[2]));
  //   console.log('proof path: ', path);
  //   console.log('index: 2');
  //   console.log('root: ', tree.root);
  const amount = 50;
  //   const amount = `0x${Buffer.from(numToHex(50), 'hex').toString('hex')}`;
  const bal_from = balanceLeafs[2][2];
  //   const bal_from = `0x${Buffer.from(
  //     numToHex(balanceLeafs[2][2]),
  //     'hex'
  //   ).toString('hex')}`;
  const bal_to = balanceLeafs[1][2];
  //   const bal_to = `0x${Buffer.from(numToHex(balanceLeafs[1][2]), 'hex').toString(
  //     'hex'
  //   )}`;
  const bal_intermediate_roots = intermediateRoots
    .reverse()
    .map((root) => numToHex(root));
  const bal_root = numToHex(tree.root);
  const bal_root_from_index = index;
  const bal_root_from_path = path.map((hash) => numToHex(hash));
  const bal_root_to_index = toIndex;
  const bal_root_to_path = pathTo.map((hash) => numToHex(hash));
  const from = {
    x: numToHex(accounts[1].pub[0]),
    y: numToHex(accounts[1].pub[1]),
  };
  const to = {
    x: numToHex(accounts[0].pub[0]),
    y: numToHex(accounts[0].pub[1]),
  };
  const nonce_from = balanceLeafs[2][3];
  //   const nonce_from = `0x${Buffer.from(
  //     numToHex(balanceLeafs[2][3]),
  //     'hex'
  //   ).toString('hex')}`;
  const nonce_to = balanceLeafs[1][3];
  //   const nonce_to = `0x${Buffer.from(
  //     numToHex(balanceLeafs[1][3]),
  //     'hex'
  //   ).toString('hex')}`;
  const token_type_from = balanceLeafs[2][4];
  //   const token_type_from = `0x${Buffer.from(
  //     numToHex(balanceLeafs[2][4]),
  //     'hex'
  //   ).toString('hex')}`;
  const token_type_to = balanceLeafs[1][4];
  //   const token_type_to = `0x${Buffer.from(
  //     numToHex(balanceLeafs[1][4]),
  //     'hex'
  //   ).toString('hex')}`;

  console.log(
    'Hash: ',
    numToHex(
      F.toObject(
        poseidon([accounts[1].pub[0], accounts[1].pub[1], 150n, 1n, 1n])
      )
    )
  );

  writeFileSync(
    '../circuits/Prover.toml',
    stringify({
      amount,
      bal_intermediate_roots,
      bal_from,
      bal_root,
      bal_root_from_index,
      bal_root_from_path,
      bal_root_to_index,
      bal_root_to_path,
      bal_to,
      from,
      nonce_from,
      nonce_to,
      to,
      token_type_from,
      token_type_to,
    })
  );
})();
