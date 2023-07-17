"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeInnerProof = exports.getEncodedProofSizeForId = exports.decodeProofId = void 0;
const client_proofs_1 = require("../client_proofs");
const rollup_account_proof_data_1 = require("./rollup_account_proof_data");
const rollup_defi_claim_proof_data_1 = require("./rollup_defi_claim_proof_data");
const rollup_defi_deposit_proof_data_1 = require("./rollup_defi_deposit_proof_data");
const rollup_deposit_proof_data_1 = require("./rollup_deposit_proof_data");
const rollup_padding_proof_data_1 = require("./rollup_padding_proof_data");
const rollup_send_proof_data_1 = require("./rollup_send_proof_data");
const rollup_withdraw_proof_data_1 = require("./rollup_withdraw_proof_data");
const decodeProofId = (encoded) => encoded.readUInt8(0);
exports.decodeProofId = decodeProofId;
const recoverProof = (encoded) => {
    const proofId = (0, exports.decodeProofId)(encoded);
    switch (proofId) {
        case client_proofs_1.ProofId.DEPOSIT:
            return rollup_deposit_proof_data_1.RollupDepositProofData.decode(encoded);
        case client_proofs_1.ProofId.WITHDRAW:
            return rollup_withdraw_proof_data_1.RollupWithdrawProofData.decode(encoded);
        case client_proofs_1.ProofId.SEND:
            return rollup_send_proof_data_1.RollupSendProofData.decode(encoded);
        case client_proofs_1.ProofId.ACCOUNT:
            return rollup_account_proof_data_1.RollupAccountProofData.decode(encoded);
        case client_proofs_1.ProofId.DEFI_DEPOSIT:
            return rollup_defi_deposit_proof_data_1.RollupDefiDepositProofData.decode(encoded);
        case client_proofs_1.ProofId.DEFI_CLAIM:
            return rollup_defi_claim_proof_data_1.RollupDefiClaimProofData.decode(encoded);
        case client_proofs_1.ProofId.PADDING:
            return rollup_padding_proof_data_1.RollupPaddingProofData.decode(encoded);
    }
};
const getEncodedProofSizeForId = (proofId) => {
    switch (proofId) {
        case client_proofs_1.ProofId.DEPOSIT:
            return rollup_deposit_proof_data_1.RollupDepositProofData.ENCODED_LENGTH;
        case client_proofs_1.ProofId.WITHDRAW:
            return rollup_withdraw_proof_data_1.RollupWithdrawProofData.ENCODED_LENGTH;
        case client_proofs_1.ProofId.SEND:
            return rollup_send_proof_data_1.RollupSendProofData.ENCODED_LENGTH;
        case client_proofs_1.ProofId.ACCOUNT:
            return rollup_account_proof_data_1.RollupAccountProofData.ENCODED_LENGTH;
        case client_proofs_1.ProofId.DEFI_DEPOSIT:
            return rollup_defi_deposit_proof_data_1.RollupDefiDepositProofData.ENCODED_LENGTH;
        case client_proofs_1.ProofId.DEFI_CLAIM:
            return rollup_defi_claim_proof_data_1.RollupDefiClaimProofData.ENCODED_LENGTH;
        case client_proofs_1.ProofId.PADDING:
            return rollup_padding_proof_data_1.RollupPaddingProofData.ENCODED_LENGTH;
    }
};
exports.getEncodedProofSizeForId = getEncodedProofSizeForId;
const decodeInnerProof = (encoded) => recoverProof(encoded);
exports.decodeInnerProof = decodeInnerProof;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb2RlX2lubmVyX3Byb29mLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3JvbGx1cF9wcm9vZi9kZWNvZGVfaW5uZXJfcHJvb2YudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsb0RBQTJDO0FBQzNDLDJFQUFxRTtBQUNyRSxpRkFBMEU7QUFDMUUscUZBQThFO0FBQzlFLDJFQUFxRTtBQUNyRSwyRUFBcUU7QUFDckUscUVBQStEO0FBQy9ELDZFQUF1RTtBQUVoRSxNQUFNLGFBQWEsR0FBRyxDQUFDLE9BQWUsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUExRCxRQUFBLGFBQWEsaUJBQTZDO0FBRXZFLE1BQU0sWUFBWSxHQUFHLENBQUMsT0FBZSxFQUFFLEVBQUU7SUFDdkMsTUFBTSxPQUFPLEdBQUcsSUFBQSxxQkFBYSxFQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3ZDLFFBQVEsT0FBTyxFQUFFO1FBQ2YsS0FBSyx1QkFBTyxDQUFDLE9BQU87WUFDbEIsT0FBTyxrREFBc0IsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDaEQsS0FBSyx1QkFBTyxDQUFDLFFBQVE7WUFDbkIsT0FBTyxvREFBdUIsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDakQsS0FBSyx1QkFBTyxDQUFDLElBQUk7WUFDZixPQUFPLDRDQUFtQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM3QyxLQUFLLHVCQUFPLENBQUMsT0FBTztZQUNsQixPQUFPLGtEQUFzQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNoRCxLQUFLLHVCQUFPLENBQUMsWUFBWTtZQUN2QixPQUFPLDJEQUEwQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNwRCxLQUFLLHVCQUFPLENBQUMsVUFBVTtZQUNyQixPQUFPLHVEQUF3QixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNsRCxLQUFLLHVCQUFPLENBQUMsT0FBTztZQUNsQixPQUFPLGtEQUFzQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztLQUNqRDtBQUNILENBQUMsQ0FBQztBQUVLLE1BQU0sd0JBQXdCLEdBQUcsQ0FBQyxPQUFnQixFQUFFLEVBQUU7SUFDM0QsUUFBUSxPQUFPLEVBQUU7UUFDZixLQUFLLHVCQUFPLENBQUMsT0FBTztZQUNsQixPQUFPLGtEQUFzQixDQUFDLGNBQWMsQ0FBQztRQUMvQyxLQUFLLHVCQUFPLENBQUMsUUFBUTtZQUNuQixPQUFPLG9EQUF1QixDQUFDLGNBQWMsQ0FBQztRQUNoRCxLQUFLLHVCQUFPLENBQUMsSUFBSTtZQUNmLE9BQU8sNENBQW1CLENBQUMsY0FBYyxDQUFDO1FBQzVDLEtBQUssdUJBQU8sQ0FBQyxPQUFPO1lBQ2xCLE9BQU8sa0RBQXNCLENBQUMsY0FBYyxDQUFDO1FBQy9DLEtBQUssdUJBQU8sQ0FBQyxZQUFZO1lBQ3ZCLE9BQU8sMkRBQTBCLENBQUMsY0FBYyxDQUFDO1FBQ25ELEtBQUssdUJBQU8sQ0FBQyxVQUFVO1lBQ3JCLE9BQU8sdURBQXdCLENBQUMsY0FBYyxDQUFDO1FBQ2pELEtBQUssdUJBQU8sQ0FBQyxPQUFPO1lBQ2xCLE9BQU8sa0RBQXNCLENBQUMsY0FBYyxDQUFDO0tBQ2hEO0FBQ0gsQ0FBQyxDQUFDO0FBakJXLFFBQUEsd0JBQXdCLDRCQWlCbkM7QUFFSyxNQUFNLGdCQUFnQixHQUFHLENBQUMsT0FBZSxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFFLENBQUM7QUFBL0QsUUFBQSxnQkFBZ0Isb0JBQStDIn0=