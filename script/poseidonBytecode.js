const fs = require("fs");
const { poseidonContract } = require("circomlibjs");

/**
 * Generates poseidon hasher contracts
 */
let main = async () => {
    // deploy poseidonT3 (hash 2)
    try {
        const poseidonT3Bytecode = poseidonContract.createCode(2);
        fs.writeFileSync("contracts/poseidon/poseidon2.bin", poseidonT3Bytecode);
    } catch (err) {
        console.error("Could not generate poseidon2: ", err)
    }

    // deploy poseidonT5 (hash 4)
    try {
        const poseidonT5Bytecode = poseidonContract.createCode(4);
        fs.writeFileSync("contracts/poseidon/poseidon4.bin", poseidonT5Bytecode);
    } catch (err) {
        console.error("Could not generate poseidon4: ", err)
    }

    try {
        // deploy poseidonT6 (hash 5)
        const poseidonT6Bytecode = poseidonContract.createCode(5);
        fs.writeFileSync("contracts/poseidon/poseidon5.bin", poseidonT6Bytecode);
    } catch (err) {
        console.error("Could not generate poseidon5: ", err)
    }
}

main()