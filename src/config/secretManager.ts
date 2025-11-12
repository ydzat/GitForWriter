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
        await this.secretStorage.store(SecretManager.OPENAI_KEY, apiKey);
    }

    /**
     * Retrieve OpenAI API key
     * @returns The stored OpenAI API key, or undefined if not set
     */
    async getOpenAIKey(): Promise<string | undefined> {
        return await this.secretStorage.get(SecretManager.OPENAI_KEY);
    }

    /**
     * Store Claude API key securely
     * @param apiKey The Claude API key to store
     */
    async setClaudeKey(apiKey: string): Promise<void> {
        await this.secretStorage.store(SecretManager.CLAUDE_KEY, apiKey);
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
        await this.deleteOpenAIKey();
        await this.deleteClaudeKey();
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

