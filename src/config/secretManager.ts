import * as vscode from 'vscode';

/**
 * SecretManager handles secure storage of API keys using VSCode's SecretStorage API.
 * API keys are encrypted and stored securely, never in plain text.
 */
export class SecretManager {
    private static readonly OPENAI_KEY = 'gitforwriter.openai.apiKey';
    private static readonly CLAUDE_KEY = 'gitforwriter.claude.apiKey';

    constructor(private secretStorage: vscode.SecretStorage) {}

    /**
     * Store OpenAI API key securely
     * @param apiKey The OpenAI API key to store
     */
    async setOpenAIKey(apiKey: string): Promise<void> {
        if (!apiKey || apiKey.trim() === '') {
            throw new Error('API key cannot be empty');
        }
        await this.secretStorage.store(SecretManager.OPENAI_KEY, apiKey.trim());
    }

    /**
     * Retrieve OpenAI API key
     * @returns The stored OpenAI API key, or undefined if not set
     */
    async getOpenAIKey(): Promise<string | undefined> {
        // First try to get from SecretStorage
        const storedKey = await this.secretStorage.get(SecretManager.OPENAI_KEY);
        if (storedKey) {
            return storedKey;
        }

        // Fallback to environment variable for development/testing ONLY.
        // WARNING: This allows using a .env file with API_KEY variable, but environment variables
        // in VS Code extensions are less secure than SecretStorage.
        // Do NOT use this method in production. API keys in environment variables may be exposed
        // to other processes or users.
        if (process.env.API_KEY) {
            console.warn('⚠️ Using API key from environment variable (development mode only)');
            return process.env.API_KEY;
        }

        return undefined;
    }

    /**
     * Store Claude API key securely
     * @param apiKey The Claude API key to store
     */
    async setClaudeKey(apiKey: string): Promise<void> {
        if (!apiKey || apiKey.trim() === '') {
            throw new Error('API key cannot be empty');
        }
        await this.secretStorage.store(SecretManager.CLAUDE_KEY, apiKey.trim());
    }

    /**
     * Retrieve Claude API key
     * @returns The stored Claude API key, or undefined if not set
     */
    async getClaudeKey(): Promise<string | undefined> {
        return await this.secretStorage.get(SecretManager.CLAUDE_KEY);
    }

    /**
     * Delete OpenAI API key
     */
    async deleteOpenAIKey(): Promise<void> {
        await this.secretStorage.delete(SecretManager.OPENAI_KEY);
    }

    /**
     * Delete Claude API key
     */
    async deleteClaudeKey(): Promise<void> {
        await this.secretStorage.delete(SecretManager.CLAUDE_KEY);
    }

    /**
     * Clear all stored API keys
     */
    async clearAllKeys(): Promise<void> {
        await Promise.all([
            this.deleteOpenAIKey(),
            this.deleteClaudeKey()
        ]);
    }

    /**
     * Check if an API key is set for the given provider
     * @param provider The AI provider to check
     * @returns True if API key is set, false otherwise
     */
    async hasKey(provider: 'openai' | 'claude'): Promise<boolean> {
        if (provider === 'openai') {
            const key = await this.getOpenAIKey();
            return key !== undefined && key.length > 0;
        } else if (provider === 'claude') {
            const key = await this.getClaudeKey();
            return key !== undefined && key.length > 0;
        }
        return false;
    }
}

