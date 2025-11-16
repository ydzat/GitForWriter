/**
 * Provider factory utilities
 * Shared logic for initializing AI providers
 */

import * as vscode from 'vscode';
import { AIProvider } from './aiProvider';
import { ConfigManager } from '../../config/configManager';
import { SecretManager } from '../../config/secretManager';

/**
 * Initialize AI provider based on configuration
 * Shared by DiffAnalyzer and ReviewEngine
 */
export async function initializeAIProvider(
    configManager: ConfigManager,
    secretManager: SecretManager,
    outputChannel?: vscode.OutputChannel
): Promise<AIProvider | null> {
    const config = configManager.getConfig();
    const perfConfig = configManager.getPerformanceConfig();
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
            ...(config.unified.baseURL && { baseURL: config.unified.baseURL }),
            enableCache: perfConfig.enableCache,
            cacheTTL: perfConfig.cacheTTL,
            cacheMaxSize: perfConfig.cacheMaxSize,
            ...(outputChannel && { outputChannel })
        };
        return new UnifiedProvider(providerConfig);
    } else if (provider === 'openai') {
        const apiKey = await secretManager.getOpenAIKey();
        if (!apiKey) {
            console.warn('OpenAI API key not found, will use fallback');
            if (outputChannel) {
                outputChannel.appendLine('⚠️ OpenAI API key not found in SecretStorage');
            }
            return null;
        }

        const { OpenAIProvider } = await import('./openaiProvider');
        const providerConfig = {
            apiKey,
            model: config.openai.model,
            baseURL: config.openai.baseURL
        };

        if (outputChannel) {
            outputChannel.appendLine(`🔧 Initializing OpenAI Provider:`);
            outputChannel.appendLine(`   Model: ${providerConfig.model}`);
            outputChannel.appendLine(`   Base URL: ${providerConfig.baseURL || '(default OpenAI)'}`);
            outputChannel.appendLine(`   API Key: ${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`);
        }

        return new OpenAIProvider(providerConfig);
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

