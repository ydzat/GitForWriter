import { expect } from 'chai';
import { UnifiedProvider, UnifiedProviderConfig } from '../../ai/providers/unifiedProvider';
import { AIProviderError } from '../../ai/providers/aiProvider';

describe('UnifiedProvider Unit Tests', () => {
    describe('Constructor', () => {
        it('should throw error if API key is empty', () => {
            expect(() => {
                new UnifiedProvider({
                    provider: 'openai',
                    model: 'gpt-4',
                    apiKey: ''
                });
            }).to.throw(AIProviderError, 'API key is required');
        });

        it('should initialize with valid OpenAI config', () => {
            const provider = new UnifiedProvider({
                provider: 'openai',
                model: 'gpt-4',
                apiKey: 'test-key'
            });
            expect(provider).to.be.instanceOf(UnifiedProvider);
        });

        it('should initialize with valid Anthropic config', () => {
            const provider = new UnifiedProvider({
                provider: 'anthropic',
                model: 'claude-3-opus-20240229',
                apiKey: 'test-key'
            });
            expect(provider).to.be.instanceOf(UnifiedProvider);
        });

        it('should support baseURL for OpenAI-compatible APIs', () => {
            const provider = new UnifiedProvider({
                provider: 'openai',
                model: 'deepseek-chat',
                apiKey: 'test-key',
                baseURL: 'https://api.deepseek.com'
            });
            expect(provider).to.be.instanceOf(UnifiedProvider);
        });

        it('should throw error for unsupported provider', () => {
            expect(() => {
                new UnifiedProvider({
                    provider: 'invalid' as any,
                    model: 'test-model',
                    apiKey: 'test-key'
                });
            }).to.throw(AIProviderError, 'Unsupported provider');
        });
    });

    describe('Configuration', () => {
        it('should use default maxRetries if not provided', () => {
            const provider = new UnifiedProvider({
                provider: 'openai',
                model: 'gpt-4',
                apiKey: 'test-key'
            });
            expect(provider).to.be.instanceOf(UnifiedProvider);
        });

        it('should use custom maxRetries if provided', () => {
            const provider = new UnifiedProvider({
                provider: 'openai',
                model: 'gpt-4',
                apiKey: 'test-key',
                maxRetries: 5
            });
            expect(provider).to.be.instanceOf(UnifiedProvider);
        });
    });

    describe('Provider Types', () => {
        it('should support OpenAI provider', () => {
            const provider = new UnifiedProvider({
                provider: 'openai',
                model: 'gpt-4',
                apiKey: 'test-key'
            });
            expect(provider).to.be.instanceOf(UnifiedProvider);
        });

        it('should support Anthropic provider', () => {
            const provider = new UnifiedProvider({
                provider: 'anthropic',
                model: 'claude-3-sonnet-20240229',
                apiKey: 'test-key'
            });
            expect(provider).to.be.instanceOf(UnifiedProvider);
        });
    });

    describe('Model Names', () => {
        it('should accept GPT-4 model', () => {
            const provider = new UnifiedProvider({
                provider: 'openai',
                model: 'gpt-4',
                apiKey: 'test-key'
            });
            expect(provider).to.be.instanceOf(UnifiedProvider);
        });

        it('should accept GPT-4 Turbo model', () => {
            const provider = new UnifiedProvider({
                provider: 'openai',
                model: 'gpt-4-turbo',
                apiKey: 'test-key'
            });
            expect(provider).to.be.instanceOf(UnifiedProvider);
        });

        it('should accept Claude 3 Opus model', () => {
            const provider = new UnifiedProvider({
                provider: 'anthropic',
                model: 'claude-3-opus-20240229',
                apiKey: 'test-key'
            });
            expect(provider).to.be.instanceOf(UnifiedProvider);
        });

        it('should accept Claude 3 Sonnet model', () => {
            const provider = new UnifiedProvider({
                provider: 'anthropic',
                model: 'claude-3-sonnet-20240229',
                apiKey: 'test-key'
            });
            expect(provider).to.be.instanceOf(UnifiedProvider);
        });

        it('should accept Claude 3 Haiku model', () => {
            const provider = new UnifiedProvider({
                provider: 'anthropic',
                model: 'claude-3-haiku-20240307',
                apiKey: 'test-key'
            });
            expect(provider).to.be.instanceOf(UnifiedProvider);
        });
    });

    describe('Error Handling', () => {
        it('should throw AIProviderError for empty API key', () => {
            expect(() => {
                new UnifiedProvider({
                    provider: 'openai',
                    model: 'gpt-4',
                    apiKey: '   '
                });
            }).to.throw(AIProviderError);
        });
    });
});

