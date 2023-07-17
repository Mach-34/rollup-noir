const { buildEddsa, buildPoseidon, buildPedersenHash } = require('circomlibjs')

// import { SinglePedersen } from '@noir-lang/barretenberg/dest/crypto/pedersen';
const crypto = require('crypto');

describe("Test rollup", async () => {
    let eddsa, poseidon, pedersen, F, zeroCache, bb

    before(async () => {
        bb = await (await import("bb.js")).newBarretenbergApiAsync();
        eddsa = await buildEddsa();
        poseidon = await buildPoseidon();
        pedersen = await buildPedersenHash();
        _pedersen = (data) => F.toObject(pedersen(data));

        F = poseidon.F;

        // zeroCache = [BigInt(0)];
        // for (let i = 1; i <= depths[0]; i++) {
        //     const root = zeroCache[i - 1];
        //     const internalNode = pedersen([root, root])
        //     zeroCache.push(F.toObject(internalNode));
        // }
    });

    xit("should sign with poseidon", async () => {
        // make account
        // let bytes = crypto.randomBytes(32);
        let bytes = Buffer.from("5049aa9160a5bcc3d80a60a3d3d5e40a106c3cec52583362f894fd4ca9c868f8", 'hex');
        console.log("raw", bytes);
        let account = {
            private: bytes,
            public: eddsa.prv2pub(bytes).map(point => F.toObject(point))
        }

        // make message
        let message = [1, 2, 3, 4, 5].map(element => F.toObject(element));
        let messageHash = poseidon(message);

        // sign message
        let signature = eddsa.signPoseidon(account.private, messageHash);
        console.log("signature: ", signature)
        signature = [...signature.R8.map(point => F.toObject(point)), signature.S]

        // print values for verification
        console.log("pubkey", account.public);
        console.log("signature", signature);
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

    it("pedersen smoke", async () => {
        let message = [1n, 2n, 3n, 4n, 5n]
        let messageHash = await bb.pedersenPlookupCompress(message);
        console.log("pedersen hash", messageHash);
    })

    // it("merkle tree", async () => {
    //     let tree = new IncrementalMerkleTree(_pedersen, 4, 0)
    //     let empty = 
    // })

})