const { ethers } = require('hardhat')
const { poseidonContract } = require('circomlibjs')
const L2Account = require('./accounts');
const crypto = require('crypto')



async function initializeContracts(zeroCache) {
    // get deploying account
    const [operator] = await ethers.getSigners();

    // deploy hash constructs for 2, 4, and 5 inputs
    const poseidonT3ABI = poseidonContract.generateABI(2);
    const poseidonT3Bytecode = poseidonContract.createCode(2);
    const poseidonT3Factory = new ethers.ContractFactory(poseidonT3ABI, poseidonT3Bytecode, operator);
    const poseidonT3 = await poseidonT3Factory.deploy();

    const poseidonT5ABI = poseidonContract.generateABI(4);
    const poseidonT5Bytecode = poseidonContract.createCode(4);
    const poseidonT5Factory = new ethers.ContractFactory(poseidonT5ABI, poseidonT5Bytecode, operator);
    const poseidonT5 = await poseidonT5Factory.deploy();

    const poseidonT6ABI = poseidonContract.generateABI(5);
    const poseidonT6Bytecode = poseidonContract.createCode(5);
    const poseidonT6Factory = new ethers.ContractFactory(poseidonT6ABI, poseidonT6Bytecode, operator);
    const poseidonT6 = await poseidonT6Factory.deploy();

    let poseidonAddresses = {
        PoseidonT3: await poseidonT3.getAddress(),
        PoseidonT5: await poseidonT5.getAddress(),
        PoseidonT6: await poseidonT6.getAddress()
    }

    // // deploy verifiers
    // const usvFactory = await ethers.getContractFactory('UpdateStateVerifier')
    // const usv = await usvFactory.deploy()
    // await usv.deployed()
    // const wsvFactory = await ethers.getContractFactory('WithdrawSignatureVerifier')
    // const wsv = await wsvFactory.deploy()
    // await wsv.deployed()
    
    // deploy token registry
    const tokenRegistryFactory = await ethers.getContractFactory('TokenRegistry')
    const tokenRegistry = await tokenRegistryFactory.deploy()
    await tokenRegistry.deployed()
    // deploy rollup contract
    const rollupFactory = await ethers.getContractFactory('Rollup', {
        libraries: {
            PoseidonT3: poseidonT3.address,
            PoseidonT5: poseidonT5.address,
            PoseidonT6: poseidonT6.address,
        }
    })
    const depths = [4, 2];
    const rollupDeployArgs = [
        // [usv.address, wsv.address, tokenRegistry.address],
        [usv.address, wsv.address, tokenRegistry.address],

        depths,
        0,
        zeroCache
    ]
    const rollup = await rollupFactory.deploy(...rollupDeployArgs)
    await rollup.deployed()
    // link registry and rollup
    await tokenRegistry.setRollup(rollup.address, { from: signers[0].address })
    return rollup;
}

/**
 * Generate L2 accounts and associate them with L1 signers by name
 * @param poseidon - instantiated circomlibjs poseidon object
 * @param eddsa - instantiated circomlibjs eddsa object
 * @return dictionary of human-readable account names to L1/L2 signing objects
 */
async function generateAccounts(poseidon, eddsa) {
    const signers = await ethers.getSigners()
    return ['coordinator', 'alice', 'bob', 'charlie', 'david', 'emily', 'frank']
        .map((account, index) => {
            // make new L2 account
            return {
                name: account,
                L1: signers[index],
                L2: L2Account.genAccount(poseidon, eddsa)
            }
        }).reduce((obj, entry) => {
            obj[entry.name] = {
                L1: entry.L1,
                L2: entry.L2
            }
            return obj;
        }, {});
}

module.exports = {
    initializeContracts,
    generateAccounts,
    L2Account
}