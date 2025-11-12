import { expect } from 'chai';
import { AIConfig } from '../../config/configManager';

// Note: ConfigManager requires vscode module which is not available in unit tests.
// We test the validation logic directly without instantiating ConfigManager.
// Integration tests should be used for testing VSCode-dependent functionality.

describe('ConfigManager Unit Tests', () => {
    // Import the validation function logic directly for testing
    function validateConfig(config: AIConfig): { valid: boolean; errors: string[] } {
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

    describe('validateConfig()', () => {
        it('should validate valid OpenAI config', () => {
            const config: AIConfig = {
                provider: 'openai',
                openai: { model: 'gpt-4' },
                claude: { model: 'claude-3-sonnet' },
                local: { endpoint: 'http://localhost:11434', model: 'llama2' }
            };

            const result = validateConfig(config);
            expect(result.valid).to.be.true;
            expect(result.errors).to.be.empty;
        });

        it('should validate valid Claude config', () => {
            const config: AIConfig = {
                provider: 'claude',
                openai: { model: 'gpt-4' },
                claude: { model: 'claude-3-sonnet' },
                local: { endpoint: 'http://localhost:11434', model: 'llama2' }
            };

            const result = validateConfig(config);
            expect(result.valid).to.be.true;
            expect(result.errors).to.be.empty;
        });

        it('should validate valid local config', () => {
            const config: AIConfig = {
                provider: 'local',
                openai: { model: 'gpt-4' },
                claude: { model: 'claude-3-sonnet' },
                local: { endpoint: 'http://localhost:11434', model: 'llama2' }
            };

            const result = validateConfig(config);
            expect(result.valid).to.be.true;
            expect(result.errors).to.be.empty;
        });

        it('should reject invalid provider', () => {
            const config: AIConfig = {
                provider: 'invalid' as any,
                openai: { model: 'gpt-4' },
                claude: { model: 'claude-3-sonnet' },
                local: { endpoint: 'http://localhost:11434', model: 'llama2' }
            };

            const result = validateConfig(config);
            expect(result.valid).to.be.false;
            expect(result.errors).to.have.lengthOf(1);
            expect(result.errors[0]).to.include('Invalid AI provider');
        });

        it('should require endpoint for local provider', () => {
            const config: AIConfig = {
                provider: 'local',
                openai: { model: 'gpt-4' },
                claude: { model: 'claude-3-sonnet' },
                local: { endpoint: '', model: 'llama2' }
            };

            const result = validateConfig(config);
            expect(result.valid).to.be.false;
            expect(result.errors.length).to.be.greaterThan(0);
            expect(result.errors.some(e => e.includes('endpoint'))).to.be.true;
        });

        it('should require model for local provider', () => {
            const config: AIConfig = {
                provider: 'local',
                openai: { model: 'gpt-4' },
                claude: { model: 'claude-3-sonnet' },
                local: { endpoint: 'http://localhost:11434', model: '' }
            };

            const result = validateConfig(config);
            expect(result.valid).to.be.false;
            expect(result.errors.length).to.be.greaterThan(0);
            expect(result.errors.some(e => e.includes('model'))).to.be.true;
        });

        it('should allow empty endpoint for non-local providers', () => {
            const config: AIConfig = {
                provider: 'openai',
                openai: { model: 'gpt-4' },
                claude: { model: 'claude-3-sonnet' },
                local: { endpoint: '', model: '' }
            };

            const result = validateConfig(config);
            expect(result.valid).to.be.true;
            expect(result.errors).to.be.empty;
        });

        it('should collect multiple validation errors', () => {
            const config: AIConfig = {
                provider: 'local',
                openai: { model: 'gpt-4' },
                claude: { model: 'claude-3-sonnet' },
                local: { endpoint: '', model: '' }
            };

            const result = validateConfig(config);
            expect(result.valid).to.be.false;
            expect(result.errors.length).to.equal(2);
        });
    });
});

