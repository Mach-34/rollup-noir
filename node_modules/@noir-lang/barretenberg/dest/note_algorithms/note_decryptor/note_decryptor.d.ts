/// <reference types="node" />
export interface NoteDecryptor {
    batchDecryptNotes(keysBuf: Buffer, privateKey: Buffer): Promise<Buffer>;
}
//# sourceMappingURL=note_decryptor.d.ts.map