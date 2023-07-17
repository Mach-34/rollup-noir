const { buildEddsa, buildPoseidon, buildPedersenHash } = require('circomlibjs')
const { IncrementalMerkleTree } = require('@zk-kit/incremental-merkle-tree')
const crypto = require('crypto');

describe("Test rollup", async () => {
    let eddsa, poseidon, pedersen, F, zeroCache, bb

    before(async () => {
        bb = await (await import("bb.js")).newBarretenbergApiAsync();
        eddsa = await buildEddsa();
        poseidon = await buildPoseidon();
        pedersen = await buildPedersenHash();
        _poseidon = (data) => F.toObject(poseidon(data));

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

    xit("pedersen smoke", async () => {
        let message = [1n, 2n, 3n, 4n, 5n]
        let messageHash = await bb.pedersenPlookupCompress(message);
        console.log("pedersen hash", messageHash);
    })

    it("poseidon merkle tree", async () => {
        // make new accounts
        const keys = [
            "4411fa416d3e9c18fc0d353b1e035bd6f387e99595255c93ce7f4395010eaf4d",
            "c0e64dc511ef13c75e286847f14a3bfd329307f4481b3bbd49debac6f42de868",
            "7f97f789946523c2e10ac3e70123e68f2194d50fdf37f87b6192d03b763be299"
        ];
        let accounts = []
        for (let i = 0; i < keys.length; i++) {
            let private = Buffer.from(keys[i], 'hex');
            accounts.push({
                private: private,
                public: eddsa.prv2pub(private).map(point => F.toObject(point))
            })
        };
        console.log(accounts)
        // create arbitrary balance leaves
        let balanceLeafs = [
            // [pubkey_x, pubkey_y, balance, nonce, tokenType]
            [0n, 0n, 0n, 0n, 0n], // empty root
            [accounts[0].public[0], accounts[0].public[1], 100n, 1n, 1n],
            [accounts[1].public[0], accounts[1].public[1], 200n, 0n, 1n],
            [accounts[2].public[0], accounts[2].public[1], 0n, 3n, 1n]
        ];

        // console.log("balance leafs", balanceLeafs);
        let hashes = balanceLeafs.map(leaf => F.toObject(poseidon(leaf)));
        console.log("hashes", hashes);
    })

})

