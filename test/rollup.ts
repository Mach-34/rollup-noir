// const { ethers } = require('hardhat')
import { buildEddsa, buildPoseidon } from 'circomlibjs'
import { expect } from 'chai'
import { initializeContracts, generateAccounts, L2Account, numToHex, readInNoirProof } from './utils'
import { IncrementalMerkleTree } from '@zk-kit/incremental-merkle-tree'


describe("Test Noir Rollup", async () => {
    let rollup, accounts, eddsa, poseidon, F, zeroCache, bb, treeDepth, _poseidon
    let tree, subtree, input, txs, txTree
    before(async () => {
        // prepare imports
        // bb = await (await import("bb.js")).newBarretenbergApiAsync();
        eddsa = await buildEddsa();
        poseidon = await buildPoseidon();
        _poseidon = (data) => F.toObject(poseidon(data));
        treeDepth = 4
        F = poseidon.F;

        // compute zero cache
        zeroCache = [BigInt(0)];
        for (let i = 1; i <= treeDepth; i++) {
            const root = zeroCache[i - 1];
            const internalNode = poseidon([root, root])
            zeroCache.push(F.toObject(internalNode));
        }

        // locally deploy contracts
        rollup = await initializeContracts(zeroCache)

        // generate some accounts
        accounts = await generateAccounts(poseidon);
    })

    describe("Test Despositing", async () => {
        describe("Batch deposit", async () => {
            it("deposit: zero address", async () => {
                // need to insert zero address (REQUIRED)
                const tx = rollup.deposit([0, 0], 0, 0, { from: accounts.coordinator.L1.address });
                await expect(tx).to.emit(rollup, 'RequestDeposit').withArgs([0, 0], 0, 0);
                const expectedRoot = F.toObject(L2Account.emptyRoot(poseidon));
                const depositRoot = (await rollup.describeDeposits())._leaves[0];
                expect(expectedRoot).to.be.equal(depositRoot);
            })
            it("deposit: sequencer", async () => {
                // insert sequencer account (not neccessary but why not)
                const pubkey = accounts.coordinator.L2.getPubkey();
                const tx = rollup.deposit(pubkey, 10000, 1, { from: accounts.coordinator.L1.address, value: 10000n });
                await expect(tx).to.emit(rollup, 'RequestDeposit').withArgs(pubkey, 10000, 1);
                accounts.coordinator.L2.credit(BigInt(10000));

                // check integrity of deposit root
                const data = [...pubkey, 10000, 0, 1];
                const leafRoot = poseidon(data);
                const sibling = L2Account.emptyRoot(poseidon);
                const expectedRoot = _poseidon([sibling, leafRoot]);
                const depositRoot = (await rollup.describeDeposits())._leaves[0];
                expect(expectedRoot).to.be.equal(depositRoot);
            })
            it("deposit: alice (user account #1)", async () => {
                // insert user account 1
                const pubkey = accounts.alice.L2.getPubkey();
                const tx = rollup.connect(accounts.alice.L1).deposit(pubkey, 40000n, 1, { value: 40000n });
                await expect(tx).to.emit(rollup, 'RequestDeposit').withArgs(pubkey, 40000n, 1);
                accounts.alice.L2.credit(40000n);
                // check integrity of deposit root
                const expectedRoot = accounts.alice.L2.root;
                const depositRoot = (await rollup.describeDeposits())._leaves[1];
                expect(expectedRoot).to.be.equal(depositRoot);
            })
            it("deposit: bob (user account #2)", async () => {
                // insert user account 1
                const pubkey = accounts.bob.L2.getPubkey();
                const tx = rollup.connect(accounts.bob.L1).deposit(pubkey, 15, 1, { value: 15 });
                await expect(tx).to.emit(rollup, 'RequestDeposit').withArgs(pubkey, 15, 1);
                accounts.bob.L2.credit(BigInt(15));
                // check integrity of deposit root
                const sibling = _poseidon([L2Account.emptyRoot(poseidon), accounts.coordinator.L2.root])
                const current = _poseidon([accounts.alice.L2.root, accounts.bob.L2.root]);
                const expectedRoot = _poseidon([sibling, current]);
                const depositRoot = (await rollup.describeDeposits())._leaves[0];
                expect(expectedRoot).to.be.equal(depositRoot);
            })
            it('Process batch of 4 account leaves', async () => {
                // construct expected values
                const emptyLeaf = L2Account.emptyRoot(poseidon)
                tree = new IncrementalMerkleTree(_poseidon, 4, 0);
                tree.insert(F.toObject(emptyLeaf));
                tree.insert(accounts.coordinator.L2.root);
                tree.insert(accounts.alice.L2.root);
                tree.insert(accounts.bob.L2.root);
                const expected = {
                    oldRoot: zeroCache[zeroCache.length - 1],
                    newRoot: tree.root
                }
                // construct transaction
                const position = [0, 0];
                const proof = [zeroCache[2], zeroCache[3]];
                const tx = rollup.connect(accounts.coordinator.L1).processDeposits(2, position, proof);
                // verify execution integrity
                await expect(tx).to.emit(rollup, "ConfirmDeposit").withArgs(
                    expected.oldRoot,
                    expected.newRoot,
                    4
                );
            })
        })

        describe("Roll up transactions to L2", async () => {
            before(async () => {
                txs = [];
                txTree = new IncrementalMerkleTree(_poseidon, 2, BigInt(0));
                input = {
                    from_pubkeys: [], // array of sender eddsa keys
                    to_pubkeys: [], // array of receiver eddsa keys x
                    amount: [], // array of L2 transaction values
                    from_indeces: [], // array of sender index in balance tree
                    from_nonces: [], // array of sender nonce for tx
                    from_token_types: [], // array of sender token types
                    from_bals: [], // array of sender balances
                    to_nonces: [], // array of receiver nonce in bal tree
                    to_bals: [],
                    to_token_types: [],
                    tx_paths: [],
                    from_paths: [],
                    to_paths: [],
                    to_indeces: [],
                    tx_root: undefined,
                    bal_root: tree.root,
                    next_root: undefined,
                    signatures: [], // array of signatures (64 bytes per) by sender eddsa key on tx data
                }
            })

            it('Alice --{200}--> Bob', async () => {
                // compute inclusion proof & values for sender pre update
                const value = 200n;
                const tokenType = 1n;
                const fromIndex = 2; //index of alice
                const fromBalance = accounts.alice.L2.balance;
                const fromNonce = accounts.alice.L2.nonce;
                const fromPath = tree
                    .createProof(fromIndex)
                    .siblings.map((sibling) => numToHex(sibling[0]));

                // update sender state and recompute balance tree
                accounts.alice.L2.debit(value);
                tree.update(fromIndex, accounts.alice.L2.root);

                // compute inclusion proof & values for receiver pre update
                const toBalance = accounts.bob.L2.balance;
                const toPath = tree
                    .createProof(3) // index of bob
                    .siblings.map((sibling) => numToHex(sibling[0]));

                // update receiver state and recompute balance tree
                accounts.bob.L2.credit(value);
                tree.update(3, accounts.bob.L2.root);

                // compute tx leaf
                let from = accounts.alice.L2.getPubkey();
                let to = accounts.bob.L2.getPubkey();
                const txData = [
                    ...from,
                    BigInt(fromIndex), // fromIndex
                    ...to,
                    fromNonce, // nonce
                    value, // amount
                    tokenType // tokenType
                ];

                // compute tx in tx tree inclusion proof
                const half = txData.length / 2;
                let front = poseidon(txData.slice(0, half));
                let back = poseidon(txData.slice(half));
                const leaf = _poseidon(front, back);
                txTree.insert(leaf);

                // sign the tx leaf
                const signature = Array.from(await accounts.alice.L2.sign(leaf));


                // add data to input array
                input.from_pubkeys = input.from_pubkeys.concat(from)
                input.to_pubkeys = input.to_pubkeys.concat(to)
                input.amount.push(value);
                input.from_bals.push(fromBalance);
                input.from_indeces.push(fromIndex);
                input.from_nonces.push(fromNonce);
                input.from_token_types.push(tokenType);
                input.to_nonces.push(accounts.bob.L2.nonce);
                input.to_bals.push(toBalance);
                input.to_token_types.push(tokenType);
                input.from_paths = input.from_paths.concat(fromPath);
                input.to_paths = input.to_paths.concat(toPath);
                input.to_indeces.push(3);
                input.signatures = input.signatures.concat(signature);

            });

            it('Bob --{50}--> Coordinator', async () => {
                // compute inclusion proof & values for sender pre update
                const value = 50n;
                const tokenType = 1n;
                const fromIndex = 3; //index of alice
                const fromBalance = accounts.bob.L2.balance;
                const fromNonce = accounts.bob.L2.nonce;
                const fromPath = tree
                    .createProof(fromIndex)
                    .siblings.map((sibling) => numToHex(sibling[0]));

                // update sender state and recompute balance tree
                accounts.bob.L2.debit(value);
                tree.update(fromIndex, accounts.bob.L2.root);

                // compute inclusion proof & values for receiver pre update
                const toBalance = accounts.coordinator.L2.balance;
                const toPath = tree
                    .createProof(1) // index of bob
                    .siblings.map((sibling) => numToHex(sibling[0]));

                // update receiver state and recompute balance tree
                accounts.coordinator.L2.credit(value);
                tree.update(1, accounts.bob.L2.root);

                // compute tx leaf
                let from = accounts.bob.L2.getPubkey();
                let to = accounts.coordinator.L2.getPubkey();
                const txData = [
                    ...from,
                    BigInt(fromIndex), // fromIndex
                    ...to,
                    fromNonce, // nonce
                    value, // amount
                    tokenType // tokenType
                ];

                // compute tx in tx tree inclusion proof
                const half = txData.length / 2;
                let front = poseidon(txData.slice(0, half));
                let back = poseidon(txData.slice(half));
                const leaf = _poseidon(front, back);
                txTree.insert(leaf);

                // sign the tx leaf
                const signature = Array.from(await accounts.bob.L2.sign(leaf));

                // add data to input array
                // input.from_pubkeys = input.from_pubkeys.concat(from)
                // input.to_pubkeys = input.to_pubkeys.concat(to)
                // input.amount.push(value);
                // input.from_bals.push(fromBalance);
                // input.from_indeces.push(fromIndex);
                // input.from_nonces.push(fromNonce);
                // input.from_token_types.push(tokenType);
                // input.to_nonces.push(accounts.coordinator.L2.nonce);
                // input.to_bals.push(toBalance);
                // input.to_token_types.push(tokenType);
                // input.from_paths = input.from_paths.concat(fromPath);
                // input.to_paths = input.to_paths.concat(toPath);
                // input.signatures = input.signatures.concat(signature);
            });

            it('Bob --{20}--> Alice', async () => {
                // compute inclusion proof & values for sender pre update
                const value = 20n;
                const tokenType = 1n;
                const fromIndex = 3; //index of alice
                const fromBalance = accounts.bob.L2.balance;
                const fromNonce = accounts.bob.L2.nonce;
                const fromPath = tree
                    .createProof(fromIndex)
                    .siblings.map((sibling) => numToHex(sibling[0]));

                // update sender state and recompute balance tree
                accounts.bob.L2.debit(value);
                tree.update(fromIndex, accounts.bob.L2.root);

                // compute inclusion proof & values for receiver pre update
                const toBalance = accounts.alice.L2.balance;
                const toPath = tree
                    .createProof(2) // index of bob
                    .siblings.map((sibling) => numToHex(sibling[0]));

                // update receiver state and recompute balance tree
                accounts.alice.L2.credit(value);
                tree.update(2, accounts.alice.L2.root);

                // compute tx leaf
                let from = accounts.bob.L2.getPubkey();
                let to = accounts.alice.L2.getPubkey();
                const txData = [
                    ...from,
                    BigInt(fromIndex), // fromIndex
                    ...to,
                    fromNonce, // nonce
                    value, // amount
                    tokenType // tokenType
                ];

                // compute tx in tx tree inclusion proof
                const half = txData.length / 2;
                let front = poseidon(txData.slice(0, half));
                let back = poseidon(txData.slice(half));
                const leaf = _poseidon(front, back);
                txTree.insert(leaf);

                // sign the tx leaf
                const signature = Array.from(await accounts.bob.L2.sign(leaf));


                // add data to input array
                // input.from_pubkeys = input.from_pubkeys.concat(from)
                // input.to_pubkeys = input.to_pubkeys.concat(to)
                // input.amount.push(value);
                // input.from_bals.push(fromBalance);
                // input.from_indeces.push(fromIndex);
                // input.from_nonces.push(fromNonce);
                // input.from_token_types.push(tokenType);
                // input.to_nonces.push(accounts.alice.L2.nonce);
                // input.to_bals.push(toBalance);
                // input.to_token_types.push(tokenType);
                // input.from_paths = input.from_paths.concat(fromPath);
                // input.to_paths = input.to_paths.concat(toPath);
                // input.signatures = input.signatures.concat(signature);
            });

            it('Coordinator --{17}--> Alice', async () => {
                // compute inclusion proof & values for sender pre update
                const value = 17n;
                const tokenType = 1n;
                const fromIndex = 1; //index of alice
                const fromBalance = accounts.coordinator.L2.balance;
                const fromNonce = accounts.coordinator.L2.nonce;
                const fromPath = tree
                    .createProof(fromIndex)
                    .siblings.map((sibling) => numToHex(sibling[0]));

                // update sender state and recompute balance tree
                accounts.coordinator.L2.debit(value);
                tree.update(fromIndex, accounts.coordinator.L2.root);

                // compute inclusion proof & values for receiver pre update
                const toBalance = accounts.alice.L2.balance;
                const toPath = tree
                    .createProof(2) // index of bob
                    .siblings.map((sibling) => numToHex(sibling[0]));

                // update receiver state and recompute balance tree
                accounts.alice.L2.credit(value);
                tree.update(2, accounts.alice.L2.root);

                // compute tx leaf
                let from = accounts.coordinator.L2.getPubkey();
                let to = accounts.alice.L2.getPubkey();
                const txData = [
                    ...from,
                    BigInt(fromIndex), // fromIndex
                    ...to,
                    fromNonce, // nonce
                    value, // amount
                    tokenType // tokenType
                ];

                // compute tx in tx tree inclusion proof
                const half = txData.length / 2;
                let front = poseidon(txData.slice(0, half));
                let back = poseidon(txData.slice(half));
                const leaf = _poseidon(front, back);
                txTree.insert(leaf);

                // sign the tx leaf
                const signature = Array.from(await accounts.coordinator.L2.sign(leaf));

                // add data to input array
                // input.from_pubkeys = input.from_pubkeys.concat(from)
                // input.to_pubkeys = input.to_pubkeys.concat(to)
                // input.amount.push(value);
                // input.from_bals.push(fromBalance);
                // input.from_indeces.push(fromIndex);
                // input.from_nonces.push(fromNonce);
                // input.from_token_types.push(tokenType);
                // input.to_nonces.push(accounts.alice.L2.nonce);
                // input.to_bals.push(toBalance);
                // input.to_token_types.push(tokenType);
                // input.from_paths = input.from_paths.concat(fromPath);
                // input.to_paths = input.to_paths.concat(toPath);
                // input.signatures = input.signatures.concat(signature);
            });

            it("Roll up transaction batch onchain", async () => {
                // compute tx paths
                for (let i = 0; i < 4; i++) {
                    const txPath = txTree
                        .createProof(i) // index of bob
                        .siblings.map((sibling) => numToHex(sibling[0]));
                    input.tx_paths = input.tx_paths.concat(txPath);
                }

                // set tx root and output root
                input.tx_root = txTree.root;
                input.next_root = tree.root;

                console.log("input", input)

                input.bal_root = numToHex(input.bal_root);
                input.from_bals = input.from_bals.map(bal => numToHex(bal));
                input.from_pubkeys = input.from_pubkeys.map(key => numToHex(key));
                input.to_bals = input.to_bals.map(bal => numToHex(bal));
                input.to_pubkeys = input.to_pubkeys.map(key => numToHex(key));
                input.tx_root = numToHex(txTree.root);
                input.next_root = numToHex(tree.root);

                readInNoirProof(input)
            })
        })
        describe("Withdraw", async () => {

        })
    })
})
