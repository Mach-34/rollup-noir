export interface PrivacySet {
    value: bigint;
    users: number;
}
export interface PrivacySetJson {
    value: string;
    users: number;
}
export declare function privacySetsToJson(privacySets: {
    [key: number]: PrivacySet[];
}): {
    [key: string]: PrivacySetJson[];
};
export declare function privacySetsFromJson(privacySets: {
    [key: string]: PrivacySetJson[];
}): {
    [key: number]: PrivacySet[];
};
export declare function getDefaultPrivacySets(): {
    [key: number]: PrivacySet[];
};
//# sourceMappingURL=privacy_set.d.ts.map