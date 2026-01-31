export declare class VaultClient {
    private mode;
    private supabaseClient?;
    private pgPool?;
    private encryptionKey?;
    constructor(encryptionKey?: string | undefined);
    setEncryptionKey(encryptionKey: string): Promise<void>;
    setSecret(name: string, value: string, description?: string): Promise<string>;
    getSecret(name: string): Promise<string | null>;
    getSecrets(names: string[]): Promise<Record<string, string>>;
    deleteSecret(name: string): Promise<void>;
    listSecrets(): Promise<string[]>;
    getTenantSecret(tenantId: string, secretType: string): Promise<string | null>;
    setTenantSecret(tenantId: string, secretType: string, value: string): Promise<void>;
}
export declare const vault: VaultClient;
//# sourceMappingURL=vault-client.d.ts.map