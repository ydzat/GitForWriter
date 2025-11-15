import { expect } from 'chai';
import { initializeAIProvider } from '../../ai/providers/providerFactory';
import { ConfigManager } from '../../config/configManager';
import { SecretManager } from '../../config/secretManager';

describe('ProviderFactory Unit Tests', () => {
    let mockConfigManager: any;
    let mockSecretManager: any;

    beforeEach(() => {
        mockConfigManager = {
            getConfig: () => ({
                provider: 'openai',
                openai: { model: 'gpt-4', baseURL: undefined },
                claude: { model: 'claude-3-sonnet' },
                unified: { provider: 'openai', model: 'gpt-4', baseURL: undefined }
            }),
            getPerformanceConfig: () => ({
                debounceDelay: 2000,
                enableCache: true,
                cacheTTL: 3600000,
                cacheMaxSize: 104857600
            })
        };

        mockSecretManager = {
            getOpenAIKey: async () => 'test-openai-key',
            getClaudeKey: async () => 'test-claude-key'
        };
    });

    describe('initializeAIProvider()', () => {
        it('should initialize OpenAI provider when configured', async () => {
            mockConfigManager.getConfig = () => ({
                provider: 'openai',
                openai: { model: 'gpt-4', baseURL: undefined },
                claude: { model: 'claude-3-sonnet' },
                unified: { provider: 'openai', model: 'gpt-4', baseURL: undefined }
            });

            const provider = await initializeAIProvider(mockConfigManager, mockSecretManager);

            expect(provider).to.not.be.null;
            expect(provider).to.have.property('analyzeDiff');
            expect(provider).to.have.property('reviewText');
        });

        it('should initialize Claude provider when configured', async () => {
            mockConfigManager.getConfig = () => ({
                provider: 'claude',
                openai: { model: 'gpt-4', baseURL: undefined },
                claude: { model: 'claude-3-sonnet' },
                unified: { provider: 'openai', model: 'gpt-4', baseURL: undefined }
            });

            const provider = await initializeAIProvider(mockConfigManager, mockSecretManager);

            expect(provider).to.not.be.null;
            expect(provider).to.have.property('analyzeDiff');
            expect(provider).to.have.property('reviewText');
        });

        it('should initialize Unified provider with OpenAI when configured', async () => {
            mockConfigManager.getConfig = () => ({
                provider: 'unified',
                openai: { model: 'gpt-4', baseURL: undefined },
                claude: { model: 'claude-3-sonnet' },
                unified: { provider: 'openai', model: 'gpt-4', baseURL: undefined }
            });

            const provider = await initializeAIProvider(mockConfigManager, mockSecretManager);

            expect(provider).to.not.be.null;
            expect(provider).to.have.property('analyzeDiff');
            expect(provider).to.have.property('reviewText');
        });

        it('should initialize Unified provider with Anthropic when configured', async () => {
            mockConfigManager.getConfig = () => ({
                provider: 'unified',
                openai: { model: 'gpt-4', baseURL: undefined },
                claude: { model: 'claude-3-sonnet' },
                unified: { provider: 'anthropic', model: 'claude-3-sonnet', baseURL: undefined }
            });

            const provider = await initializeAIProvider(mockConfigManager, mockSecretManager);

            expect(provider).to.not.be.null;
            expect(provider).to.have.property('analyzeDiff');
            expect(provider).to.have.property('reviewText');
        });

        it('should return null when OpenAI API key is missing', async () => {
            mockConfigManager.getConfig = () => ({
                provider: 'openai',
                openai: { model: 'gpt-4', baseURL: undefined },
                claude: { model: 'claude-3-sonnet' },
                unified: { provider: 'openai', model: 'gpt-4', baseURL: undefined }
            });

            mockSecretManager.getOpenAIKey = async () => undefined;

            const provider = await initializeAIProvider(mockConfigManager, mockSecretManager);

            expect(provider).to.be.null;
        });

        it('should return null when Claude API key is missing', async () => {
            mockConfigManager.getConfig = () => ({
                provider: 'claude',
                openai: { model: 'gpt-4', baseURL: undefined },
                claude: { model: 'claude-3-sonnet' },
                unified: { provider: 'openai', model: 'gpt-4', baseURL: undefined }
            });

            mockSecretManager.getClaudeKey = async () => undefined;

            const provider = await initializeAIProvider(mockConfigManager, mockSecretManager);

            expect(provider).to.be.null;
        });

        it('should return null when Unified OpenAI API key is missing', async () => {
            mockConfigManager.getConfig = () => ({
                provider: 'unified',
                openai: { model: 'gpt-4', baseURL: undefined },
                claude: { model: 'claude-3-sonnet' },
                unified: { provider: 'openai', model: 'gpt-4', baseURL: undefined }
            });

            mockSecretManager.getOpenAIKey = async () => undefined;

            const provider = await initializeAIProvider(mockConfigManager, mockSecretManager);

            expect(provider).to.be.null;
        });

        it('should return null when Unified Anthropic API key is missing', async () => {
            mockConfigManager.getConfig = () => ({
                provider: 'unified',
                openai: { model: 'gpt-4', baseURL: undefined },
                claude: { model: 'claude-3-sonnet' },
                unified: { provider: 'anthropic', model: 'claude-3-sonnet', baseURL: undefined }
            });

            mockSecretManager.getClaudeKey = async () => undefined;

            const provider = await initializeAIProvider(mockConfigManager, mockSecretManager);

            expect(provider).to.be.null;
        });

        it('should pass baseURL to OpenAI provider when configured', async () => {
            mockConfigManager.getConfig = () => ({
                provider: 'openai',
                openai: { model: 'gpt-4', baseURL: 'https://api.custom.com' },
                claude: { model: 'claude-3-sonnet' },
                unified: { provider: 'openai', model: 'gpt-4', baseURL: undefined }
            });

            const provider = await initializeAIProvider(mockConfigManager, mockSecretManager);

            expect(provider).to.not.be.null;
        });

        it('should pass baseURL to Unified provider when configured', async () => {
            mockConfigManager.getConfig = () => ({
                provider: 'unified',
                openai: { model: 'gpt-4', baseURL: undefined },
                claude: { model: 'claude-3-sonnet' },
                unified: { provider: 'openai', model: 'gpt-4', baseURL: 'https://api.deepseek.com' }
            });

            const provider = await initializeAIProvider(mockConfigManager, mockSecretManager);

            expect(provider).to.not.be.null;
        });

        it('should return null for unknown provider type', async () => {
            mockConfigManager.getConfig = () => ({
                provider: 'unknown' as any,
                openai: { model: 'gpt-4', baseURL: undefined },
                claude: { model: 'claude-3-sonnet' },
                unified: { provider: 'openai', model: 'gpt-4', baseURL: undefined }
            });

            const provider = await initializeAIProvider(mockConfigManager, mockSecretManager);

            expect(provider).to.be.null;
        });
    });
});

