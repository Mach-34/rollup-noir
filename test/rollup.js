// const { ethers } = require('hardhat')
const { buildEddsa, buildPoseidon } = require('circomlibjs')
const { expect } = require('chai')
const { initializeContracts, generateAccounts, L2Account } = require('./utils')


describe("Test Noir Rollup", async () => {
    let rollup, accounts, eddsa, poseidon, F, zeroCache, bb, treeDepth
    before(async () => {
        // prepare imports
        bb = await (await import("bb.js")).newBarretenbergApiAsync();
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
        console.log("accounts", accounts)
    })

    describe("Test Despositing", async () => {
        describe("Batch 1", async () => {
            it("deposit: zero address", async () => {
                // need to insert zero address
                const tx = rollup.deposit([0, 0], 0, 0, { from: accounts.coordinator.L1.address });
                await expect(tx).to.emit(rollup, 'RequestDeposit').withArgs([0, 0], 0, 0); 
                const expectedRoot = L2Account.emptyRoot(poseidon);
                const depositRoot = (await rollup.describeDeposits())._leaves[0];
                expect(expectedRoot).to.be.equal(depositRoot);
            })

        })

        it("should pass", async () => {
            console.log("hi")
            expect(true)
        })


    })
})
