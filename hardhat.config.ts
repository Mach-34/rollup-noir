require('dotenv').config()
require('hardhat-deploy')
require('hardhat-deploy-ethers')
require('@nomiclabs/hardhat-etherscan')
require("@nomicfoundation/hardhat-chai-matchers");

interface Accounts {
    mnemonic: string,
    path: string,
    initialIndex: number,
    count: number,
}

interface RPCs {
    [key: string]: string;
  }

// private environment information
const { INFURA, MNEMONIC, ETHERSCAN, POLYGONSCAN } = process.env

// map of chain to rpc url 
const RPCS: RPCs = {
    goerli: `https://goerli.infura.io/v3/${INFURA}`,
    rinkeby: `https://rinkeby.infura.io/v3/${INFURA}`,
    polygon: 'https://matic-mainnet.chainstacklabs.com',
    polygonMumbai: 'https://matic-mumbai.chainstacklabs.com',
    gnosis: 'https://rpc.gnosischain.com',
    sokol: 'https://sokol.poa.network',
    harmony: 'https://api.harmony.one',
    harmonyTestnet: 'https://api.s0.b.hmny.io'
}

// derive 10 accounts from mnemonic
const accounts: Accounts = {
    mnemonic: MNEMONIC!,
    path: "m/44'/60'/0'/0",
    initialIndex: 0,
    count: 10,
}

interface Networks {
    [key: string]: {
      url?: string,
      accounts: Accounts
    };
  }

/**
 * Return a hardhat compiler for a given version
 * @param {string} version - solidity version ex: 0.8.11
 */
const makeCompiler = (version: any) => {
    return {
        version,
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    }
}

/**
 * Return a hardhat network object for a given network
 * @param {string} network - the name of the hardhat network
 */
const makeNetwork = (network: string) => {
    return {
        url: RPCS[network],
        accounts
    }
}

const networks: Networks = Object.entries(RPCS).reduce((obj: Networks, network) => {
    obj[network[0]] = makeNetwork(network[0]);
    return obj;
}, {})

networks['hardhat'] = { accounts }

module.exports = {
    solidity: { compilers: [makeCompiler('0.6.11'), makeCompiler('0.8.19')] },
    networks,
    mocha: { timeout: 2000000 },
    etherscan: {
        apiKey: {
            rinkeby: ETHERSCAN,
            goerli: ETHERSCAN,
            polygon: POLYGONSCAN,
            polygonMumbai: POLYGONSCAN
        }
    }
}