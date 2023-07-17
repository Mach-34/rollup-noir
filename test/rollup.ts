// const { ethers } = require('hardhat')
import { buildEddsa, buildPoseidon } from 'circomlibjs'
import { expect } from 'chai'
import { initializeContracts, generateAccounts, L2Account } from './utils'
import { IncrementalMerkleTree } from '@zk-kit/incremental-merkle-tree'


describe("Test Noir Rollup", async () => {
    let rollup, accounts, eddsa, poseidon, F, zeroCache, bb, treeDepth, _poseidon
    let tree, subtree
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
        accounts = await generateAccounts(poseidon, eddsa);

        // compile noir circuits
        // await compileCircuits();
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
                const coordinatorLeaf = poseidon([...coordinatorPubkey, 0, 0, 0]);
                const sibling = poseidon([L2Account.emptyRoot(poseidon), coordinatorLeaf])
                const current = poseidon([accounts.alice.L2.root, accounts.bob.L2.root]);
                const expectedRoot = F.toObject(poseidon([sibling, current]));
                const depositRoot =  (await rollup.describeDeposits())._leaves[0];
                subtree = depositRoot;
                expect(expectedRoot).to.be.equal(depositRoot);
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
        })


    })
})
