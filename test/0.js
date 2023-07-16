const { buildEddsa, buildPoseidon } = require('circomlibjs')
const crypto = require('crypto');

describe("Test rollup", async () => {
    let eddsa, poseidon, F

    before(async () => {
        eddsa = await buildEddsa();
        poseidon = await buildPoseidon();
        F = poseidon.F;
    });

    it("should sign with poseidon", async () => {
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
})