import * as vscode from 'vscode';

/**
 * Supported AI providers
 */
export type AIProvider = 'openai' | 'claude' | 'local';

/**
 * AI configuration interface
 */
export interface AIConfig {
    provider: AIProvider;
    openai: {
        model: string;
    };
    claude: {
        model: string;
    };
    local: {
        endpoint: string;
        model: string;
    };
}

/**
 * Configuration validation result
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

/**
 * ConfigManager handles reading and validating VSCode configuration settings
 */
export class ConfigManager {
    private static readonly CONFIG_SECTION = 'gitforwriter';

    /**
     * Get current AI configuration from VSCode settings
     * @returns Current AI configuration
     */
    getConfig(): AIConfig {
        const config = vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION);
        
        return {
            provider: config.get<AIProvider>('aiProvider', 'openai'),
            openai: {
                model: config.get<string>('openai.model', 'gpt-4')
            },
            claude: {
                model: config.get<string>('claude.model', 'claude-3-sonnet')
            },
            local: {
                endpoint: config.get<string>('local.endpoint', 'http://localhost:11434'),
                model: config.get<string>('local.model', 'llama2')
            }
        };
    }

    /**
     * Set the AI provider
     * @param provider The AI provider to use
     */
    async setProvider(provider: AIProvider): Promise<void> {
        await vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION).update(
            'aiProvider',
            provider,
            vscode.ConfigurationTarget.Global
        );
    }

    /**
     * Set OpenAI model
     * @param model The OpenAI model to use
     */
    async setOpenAIModel(model: string): Promise<void> {
        await vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION).update(
            'openai.model',
            model,
            vscode.ConfigurationTarget.Global
        );
    }

    /**
     * Set Claude model
     * @param model The Claude model to use
     */
    async setClaudeModel(model: string): Promise<void> {
        await vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION).update(
            'claude.model',
            model,
            vscode.ConfigurationTarget.Global
        );
    }

    /**
     * Set local LLM endpoint
     * @param endpoint The local LLM endpoint URL
     */
    async setLocalEndpoint(endpoint: string): Promise<void> {
        await vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION).update(
            'local.endpoint',
            endpoint,
            vscode.ConfigurationTarget.Global
        );
    }

    /**
     * Set local LLM model
     * @param model The local LLM model name
     */
    async setLocalModel(model: string): Promise<void> {
        await vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION).update(
            'local.model',
            model,
            vscode.ConfigurationTarget.Global
        );
    }

    /**
     * Validate AI configuration
     * @param config The configuration to validate
     * @returns Validation result with errors if any
     */
    validateConfig(config: AIConfig): ValidationResult {
        const errors: string[] = [];

        // Validate provider
        if (!['openai', 'claude', 'local'].includes(config.provider)) {
            errors.push(`Invalid AI provider: ${config.provider}`);
        }

        // Validate local provider specific settings
        if (config.provider === 'local') {
            if (!config.local.endpoint || config.local.endpoint.trim() === '') {
                errors.push('Local LLM endpoint is required when using local provider');
            }
            if (!config.local.model || config.local.model.trim() === '') {
                errors.push('Local LLM model name is required when using local provider');
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get the current provider
     * @returns The current AI provider
     */
    getCurrentProvider(): AIProvider {
        return this.getConfig().provider;
    }
}

