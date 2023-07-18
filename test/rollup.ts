// const { ethers } = require('hardhat')
import { buildEddsa, buildPoseidon } from 'circomlibjs'
import { expect } from 'chai'
import { initializeContracts, generateAccounts, L2Account } from './utils'
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
                const expectedRoot = L2Account.emptyRoot(poseidon);
                const depositRoot = (await rollup.describeDeposits())._leaves[0];
                expect(expectedRoot).to.be.equal(depositRoot);
            })
            it("deposit: sequencer", async () => {
                // insert sequencer account (not neccessary but why not)
                const pubkey = accounts.coordinator.L2.pubkey.map(point => F.toObject(point));
                const tx = rollup.deposit(pubkey, 0, 0, { from: accounts.coordinator.L1.address });
                await expect(tx).to.emit(rollup, 'RequestDeposit').withArgs(pubkey, 0, 0);
                // check integrity of deposit root
                const data = [...pubkey, 0, 0, 0];
                const leafRoot = F.toObject(poseidon(data));
                const sibling = L2Account.emptyRoot(poseidon);
                const expectedRoot = F.toObject(poseidon([sibling, leafRoot]));
                const depositRoot = (await rollup.describeDeposits())._leaves[0];
                expect(expectedRoot).to.be.equal(depositRoot);
            })
            it("deposit: alice (user account #1)", async () => {
                // insert user account 1
                const pubkey = accounts.alice.L2.pubkey.map(point => F.toObject(point));
                const tx = rollup.connect(accounts.alice.L1).deposit(pubkey, 40000n, 1, { value: 40000n });
                await expect(tx).to.emit(rollup, 'RequestDeposit').withArgs(pubkey, 40000n, 1);
                accounts.alice.L2.credit(40000n);
                // check integrity of deposit root
                const expectedRoot = accounts.alice.L2.root;
                const depositRoot = (await rollup.describeDeposits())._leaves[1];
                expect(expectedRoot).to.be.equal(depositRoot);
            })
            it("deposit: bob (user account #2)", async () => {
                // check deposit fn execution logic
                const pubkey = accounts.bob.L2.pubkey.map(point => F.toObject(point));
                const tx = rollup.connect(accounts.bob.L1).deposit(pubkey, 15, 1, { value: 15 });
                await expect(tx).to.emit(rollup, 'RequestDeposit').withArgs(pubkey, 15, 1);
                accounts.bob.L2.credit(BigInt(15));
                // check deposit queue
                const coordinatorPubkey = accounts.coordinator.L2.pubkey.map(point => F.toObject(point));
                const coordinatorLeaf = F.toObject(poseidon([...coordinatorPubkey, 0, 0, 0]));
                const sibling = poseidon([L2Account.emptyRoot(poseidon), coordinatorLeaf])
                const current = poseidon([accounts.alice.L2.root, accounts.bob.L2.root]);
                const expectedRoot = F.toObject(poseidon([sibling, current].map(node => F.toObject(node))));
                const depositRoot = (await rollup.describeDeposits())._leaves[0];
                // expect(expectedRoot).to.be.equal(depositRoot);
                console.log("expectedRoot", expectedRoot);
                console.log("depositRoot", depositRoot);
                // @todo: fix
            })
            it('Process batch of 4 account leaves', async () => {
                // construct expected values
                const emptyLeaf = L2Account.emptyRoot(poseidon)
                const coordinatorPubkey = accounts.coordinator.L2.pubkey.map(point => F.toObject(point));
                const coordinatorLeaf = poseidon([...coordinatorPubkey, 0, 0, 0]);
                tree = new IncrementalMerkleTree(_poseidon, 4, 0);
                tree.insert(emptyLeaf);
                tree.insert(F.toObject(coordinatorLeaf));
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
                    const tx = rollup.deposit(pubkey, 0, 0, { from: accounts.coordinator.L1.address });
                    await expect(tx).to.emit(rollup, 'RequestDeposit').withArgs(pubkey, 0, 0);
                    // check integrity of deposit root
                    const data = [...pubkey, 0, 0, 0];
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
                    const coordinatorPubkey = accounts.coordinator.L2.getPubkey();
                    const coordinatorLeaf = _poseidon([...coordinatorPubkey, 0, 0, 0]);
                    const sibling = _poseidon([L2Account.emptyRoot(poseidon), coordinatorLeaf])
                    const current = _poseidon([accounts.alice.L2.root, accounts.bob.L2.root]);
                    const expectedRoot = _poseidon([sibling, current]);
                    const depositRoot = (await rollup.describeDeposits())._leaves[0];
                    expect(expectedRoot).to.be.equal(depositRoot);
                })
                it('Process batch of 4 account leaves', async () => {
                    // construct expected values
                    const emptyLeaf = L2Account.emptyRoot(poseidon)
                    const coordinatorPubkey = accounts.coordinator.L2.getPubkey();
                    const coordinatorLeaf = _poseidon([...coordinatorPubkey, 0, 0, 0]);
                    tree = new IncrementalMerkleTree(_poseidon, 4, 0);
                    tree.insert(F.toObject(emptyLeaf));
                    tree.insert(coordinatorLeaf);
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
            describe("Rollup transactions", async () => {
                // before(async () => {
                //     txs = [];
                //     txTree = new IncrementalMerkleTree(_poseidon, 2, BigInt(0));
                //     input = {
                //         from: [], // array of sender eddsa keys
                //         to: [], // array of receiver eddsa keys x
                //         amount: [], // array of L2 transaction values
                //         fromIndex: [], // array of sender index in balance tree
                //         fromNonce: [], // array of sender nonce for tx
                //         fromTokenType: [], // array of sender token types
                //         // signature: [], // array of signatures by sender eddsa key on tx data
                //         fromBalance: [], // array of sender balances
                //         toNonce: [], // array of receiver nonce in bal tree
                //         toBalance: [],
                //         toTokenType: [],
                //         // txPath: [],
                //         fromPath: [],
                //         toPath: [],
                //         // txRoot: undefined,
                //         prevRoot: tree.root,
                //         nextRoot: undefined
                //     }
                // })

                xit('Alice --{200}--> Bob', async () => {
                    // compute inclusion proof & update sender in balance tree 
                    const value = 200n;
                    const tokenType = 1;
                    const fromIndex = 2;
                    let { siblings: fromProof, pathIndices: fromPositions } = tree.createProof(fromIndex);
                    fromProof = fromProof.map(node => node[0]);
                    const fromBalance = accounts.alice.L2.balance;
                    const fromNonce = accounts.alice.L2.nonce;
                    accounts.alice.L2.debit(value);
                    tree.update(fromIndex, accounts.alice.L2.root);

                    // compute inclusion proof & update receiver in balance tree
                    let { siblings: toProof, pathIndices: toPositions } = tree.createProof(3);
                    toProof = toProof.map(node => node[0]);
                    const toBalance = accounts.bob.L2.balance;
                    accounts.bob.L2.credit(value);
                    tree.update(3, accounts.bob.L2.root);

                    // compute tx leaf
                    const txData = [
                        ...accounts.alice.L2.getPubkey(),
                        fromIndex, // fromIndex
                        ...accounts.bob.L2.getPubkey(),
                        fromNonce, // nonce
                        value, // amount
                        tokenType // tokenType
                    ].map(element => typeof element === 'string' ? F.toObject(element) : element);

                    // compute tx in tx tree inclusion proof
                    const half = txData.length / 2;
                    console.log("tx data: ", txData.slice(0, half))
                    const leaf = poseidon([poseidon(txData.slice(0, half)), poseidon(txData.slice(half))]);
                    const signature = accounts.alice.L2.sign(leaf);
                    txTree.insert(F.toObject(leaf));


                    // add data to input array
                    input.from.push(accounts.alice.L2.getPubkey());
                    input.to.push(accounts.bob.L2.getPubkey());
                    input.amount.push(value);
                    input.fromIndex.push(fromIndex);
                    input.fromNonce.push(fromNonce);
                    input.fromTokenType.push(tokenType);
                    input.signature.push(signature);
                    input.fromBalance.push(fromBalance);
                    input.toNonce.push(accounts.bob.L2.nonce);
                    input.toBalance.push(toBalance);
                    input.toTokenType.push(tokenType);
                    input.fromPositions.push(fromPositions);
                    input.fromProof.push(fromProof);
                    input.toPositions.push(toPositions);
                    input.toProof.push(toProof);
                });
            })
            describe("Withdraw", async () => {

            })
        })
