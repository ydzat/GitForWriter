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
        baseURL?: string; // Support for OpenAI-compatible APIs
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
 * Validate AI configuration (pure function for easy testing)
 * @param config The configuration to validate
 * @returns Validation result with errors if any
 */
export function validateAIConfig(config: AIConfig): ValidationResult {
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

