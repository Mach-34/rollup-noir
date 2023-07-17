const { ethers } = require('hardhat')
const { solidity } = require("ethereum-waffle");
const { buildEddsa, buildPoseidon } = require('circomlibjs')
const { expect } = require("chai").use(solidity)
const { initializeContracts, generateAccounts, L2Account } = require('./utils')

