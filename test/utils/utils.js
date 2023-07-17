const { ethers } = require('hardhat')
const { poseidonContract } = require('circomlibjs')
const L2Account = require('./accounts');
const crypto = require('crypto')



async function initializeContracts(zeroCache) {
    const signers = await ethers.getSigners()

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