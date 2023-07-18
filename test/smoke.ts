import { buildEddsa, buildPoseidon, buildPedersenHash, poseidonContract, buildBabyjub } from 'circomlibjs'
import { IncrementalMerkleTree } from '@zk-kit/incremental-merkle-tree'
import crypto from 'crypto';
import { Scalar } from "ffjavascript";
import * as secp from "@noble/secp256k1";

const numToHex = (num) => {
    const hex = num.toString(16);
    // Add missing padding based of hex number length
    const padded = `${'0'.repeat(64 - hex.length)}${hex}`;
    return `0x${Buffer.from(padded, 'hex').toString('hex')}`;
  };

describe("Test rollup", async () => {
    let eddsa, poseidon, _poseidon, F, zeroCache, treeDepth, bb, bjj
    let BarretenbergWasm, barretenberg

    before(async () => {
        bb = (await (await import("bb.js")).newBarretenbergApiAsync());
        bb
        eddsa = await buildEddsa();
        poseidon = await buildPoseidon();
        _poseidon = (data) => F.toObject(poseidon(data));
        treeDepth = 4
        F = poseidon.F;
        bjj = await buildBabyjub();

        zeroCache = [BigInt(0)];
        for (let i = 1; i <= treeDepth; i++) {
            const root = zeroCache[i - 1];
            const internalNode = poseidon([root, root])
            zeroCache.push(F.toObject(internalNode));
        }
    });

    it("should sign with poseidon", async () => {
        // make account
        // let bytes = crypto.randomBytes(32);
        let bytes = Buffer.from("5049aa9160a5bcc3d80a60a3d3d5e40a106c3cec52583362f894fd4ca9c868f8", 'hex');
        let account = {
            private: bytes,
            public: eddsa.prv2pub(bytes).map(point => F.toObject(point))
        }

        // make message
        let message = [1, 2, 3, 4, 5].map(element => F.toObject(element));
        let messageHash = poseidon([1, 2, 3, 4, 5]);
        // console.log("A", F.toObject(messageHash))
        console.log("B", numToHex(F.fromObject(messageHash)) )

        // sign message
        let signature = eddsa.signPoseidon(account.private, messageHash);
        // console.log("signature: ", signature)
        signature = [...signature.R8.map(point => F.toObject(point)), signature.S]

        // print values for verification
        // console.log("pubkey", account.public);
        // console.log("signature", signature);
    })

    xit("should produce hash for tx leaf", async () => {
        // generate the expected tx leaf hash (used in noir test)
        let message = [1, 2, 3, 4, 5, 6, 7, 8, 9]
        let messageHash = poseidon(message);
        console.log("tx leaf hash", F.toObject(messageHash));
    })

    xit("should produce hash for balance leaf", async () => {
        // generate the expected balance leaf hash (used in noir test)
        let message = [1, 2, 3, 4, 5]
        let messageHash = poseidon(message);
        console.log("balance leaf hash", F.toObject(messageHash));
    })

    xit("pedersen smoke", async () => {
        let message = [1n, 2n, 3n, 4n, 5n]
        // let messageHash = await bb.pedersenPlookupCompress(message);
        // console.log("pedersen hash", messageHash);
    })

    xit("poseidon merkle tree", async () => {
        // make new accounts
        const keys = [
            "4411fa416d3e9c18fc0d353b1e035bd6f387e99595255c93ce7f4395010eaf4d",
            "c0e64dc511ef13c75e286847f14a3bfd329307f4481b3bbd49debac6f42de868",
            "7f97f789946523c2e10ac3e70123e68f2194d50fdf37f87b6192d03b763be299"
        ];
        type Account = {
            priv: Buffer,
            pub: [bigint, bigint]
        }
        let accounts: Account[] = []
        for (let i = 0; i < keys.length; i++) {
            let priv = Buffer.from(keys[i], 'hex');
            accounts.push({
                priv,
                pub: eddsa.prv2pub(priv).map(point => F.toObject(point))
            })
        };

        // create arbitrary balance leaves
        let balanceLeafs = [
            // [pubkey_x, pubkey_y, balance, nonce, tokenType]
            [0n, 0n, 0n, 0n, 0n], // empty root
            [accounts[0].pub[0], accounts[0].pub[1], 100n, 1n, 1n],
            [accounts[1].pub[0], accounts[1].pub[1], 200n, 0n, 1n],
            [accounts[2].pub[0], accounts[2].pub[1], 0n, 3n, 1n]
        ];
        let hashes = balanceLeafs.map(leaf => poseidon(leaf));

        // built merkle tree
        let tree = new IncrementalMerkleTree(_poseidon, treeDepth, 0);
        for (let i = 0; i < hashes.length; i++) {
            tree.insert(F.toObject(hashes[i]));
        }


        // get merkle proof for leaf 2
        let proof = tree.createProof(2);
        let path = proof.siblings.map(sibling => sibling[0]);

        // log used variables in poseidon merkle smoke test
        console.log("account", accounts[1])
        console.log("hash: ", F.toObject(hashes[2]))
        console.log("proof path: ", path);
        console.log("index: 2")
        console.log("root: ", tree.root)
    })

    xit("pedersen merkle tree", async () => {
        const poseidonT3ABI = poseidonContract.generateABI(2);
        const poseidonT3Bytecode = poseidonContract.createCode(2);

        // console.log("poseidonT3ABI", poseidonT3ABI);
        // console.log("poseidonT3Bytecode", poseidonT3Bytecode);

        // const poseidonT6ABI = poseidonContract.generateABI(5);
        // const poseidonT6Bytecode = poseidonContract.createCode(5);
        
        // console.log("poseidonT6ABI", poseidonT6ABI);
        // console.log("poseidonT6Bytecode", poseidonT6Bytecode);
    })

    xit("eddsa", async () => {
        let key = Buffer.from("4411fa416d3e9c18fc0d353b1e035bd6f387e99595255c93ce7f4395010eaf4d", "hex");
        let keyObj = F.toObject(F.fromObject("0x4411fa416d3e9c18fc0d353b1e035bd6f387e99595255c93ce7f4395010eaf4d"));
        let message = F.toObject(poseidon([1n, 2n, 3n, 4n, 5n]));
        let ra = (await bb.pedersenPlookupCompress([keyObj, message])).value % bjj.subOrder
        console.log("ra_hash", ra)
        let ra1 = bjj.add
    })

    // it("schnorr / pedersen commits", async () => {
    //     let key = Buffer.from("4411fa416d3e9c18fc0d353b1e035bd6f387e99595255c93ce7f4395010eaf4d", "hex");
    //     console.log("key", key)
    //     let pubkey = bb.schnorrComputePublicKey(key);
    //     pubkey = {
    //         x: pubkey.x.value,
    //         y: pubkey.y.value
    //     }
    //     console.log("pubkey", pubkey);
    // })
})

