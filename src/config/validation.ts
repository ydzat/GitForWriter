/**
 * Supported AI providers
 */
export type AIProvider = 'unified' | 'openai' | 'claude' | 'local';

/**
 * AI configuration interface
 */
export interface AIConfig {
    provider: AIProvider;
    unified: {
        provider: 'openai' | 'anthropic'; // Underlying provider for unified interface
        model: string; // Model name (e.g., 'gpt-4', 'claude-3-opus-20240229')
        baseURL?: string; // For OpenAI-compatible APIs
    };
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
    if (!['unified', 'openai', 'claude', 'local'].includes(config.provider)) {
        errors.push(`Invalid AI provider: ${config.provider}`);
    }

    // Validate unified provider specific settings
    if (config.provider === 'unified') {
        if (!config.unified.provider || !['openai', 'anthropic'].includes(config.unified.provider)) {
            errors.push('Unified provider must specify underlying provider (openai or anthropic)');
        }
        if (!config.unified.model || config.unified.model.trim() === '') {
            errors.push('Unified provider model name is required');
        }
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

