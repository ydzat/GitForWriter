/**
 * Provider factory utilities
 * Shared logic for initializing AI providers
 */

import { AIProvider } from './aiProvider';
import { ConfigManager } from '../../config/configManager';
import { SecretManager } from '../../config/secretManager';

/**
 * Initialize AI provider based on configuration
 * Shared by DiffAnalyzer and ReviewEngine
 */
export async function initializeAIProvider(
    configManager: ConfigManager,
    secretManager: SecretManager
): Promise<AIProvider | null> {
    const config = configManager.getConfig();
    const provider = config.provider;

    if (provider === 'unified') {
        // Use unified provider (Vercel AI SDK)
        const unifiedProvider = config.unified.provider;
        let apiKey: string | undefined = undefined;

        if (unifiedProvider === 'openai') {
            apiKey = await secretManager.getOpenAIKey();
        } else if (unifiedProvider === 'anthropic') {
            apiKey = await secretManager.getClaudeKey();
        }

        if (!apiKey) {
            console.warn(`${unifiedProvider} API key not found, will use fallback`);
            return null;
        }

        const { UnifiedProvider } = await import('./unifiedProvider');
        const providerConfig = {
            provider: unifiedProvider,
            model: config.unified.model,
            apiKey,
            ...(config.unified.baseURL && { baseURL: config.unified.baseURL })
        };
        return new UnifiedProvider(providerConfig);
    } else if (provider === 'openai') {
        const apiKey = await secretManager.getOpenAIKey();
        if (!apiKey) {
            console.warn('OpenAI API key not found, will use fallback');
            return null;
        }

        const { OpenAIProvider } = await import('./openaiProvider');
        return new OpenAIProvider({
            apiKey,
            model: config.openai.model,
            baseURL: config.openai.baseURL
        });
    } else if (provider === 'claude') {
        const apiKey = await secretManager.getClaudeKey();
        if (!apiKey) {
            console.warn('Claude API key not found, will use fallback');
            return null;
        }

        const { ClaudeProvider } = await import('./claudeProvider');
        return new ClaudeProvider({
            apiKey,
            model: config.claude.model
        });
    }

    return null;
}

