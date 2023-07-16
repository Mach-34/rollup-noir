const { buildEddsa, buildPoseidon } = require('circomlibjs')
const crypto = require('crypto');

describe("Test rollup", async () => {
    let eddsa, poseidon, F

    before(async () => {
        eddsa = await buildEddsa();
        poseidon = await buildPoseidon();
        F = poseidon.F;
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
        let message = [0, 1, 2, 3, 4].map(element => F.toObject(element));
        let messageHash = poseidon(message);

        // sign message
        let signature = eddsa.signPoseidon(account.private, messageHash);
        signature = [...signature.R8.map(point => F.toObject(point)), signature.S]

        // print values for verification
        console.log("signature", signature);
    })

    it("should produce hash for tx leaf", async () => {
        // generate the expected tx leaf hash (used in noir test)
        let message = [1, 2, 3, 4, 5, 6, 7, 8, 9]
        let messageHash = poseidon(message);
        console.log("tx leaf hash", F.toObject(messageHash));
    })

    it("should produce hash for balance leaf", async () => {
        // generate the expected balance leaf hash (used in noir test)
        let message = [1, 2, 3, 4, 5]
        let messageHash = poseidon(message);
        console.log("balance leaf hash", F.toObject(messageHash));
    })
})