import { expect } from 'chai';
import { AIConfig, validateAIConfig } from '../../config/validation';

// Note: We test the validation logic using the pure function from validation.ts
// which doesn't depend on vscode module.
// Integration tests should be used for testing VSCode-dependent functionality.

describe('ConfigManager Unit Tests', () => {
    describe('validateAIConfig()', () => {
        it('should validate valid OpenAI config', () => {
            const config: AIConfig = {
                provider: 'openai',
                openai: { model: 'gpt-4' },
                claude: { model: 'claude-3-sonnet' },
                local: { endpoint: 'http://localhost:11434', model: 'llama2' }
            };

            const result = validateAIConfig(config);
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

            const result = validateAIConfig(config);
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

            const result = validateAIConfig(config);
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

            const result = validateAIConfig(config);
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

            const result = validateAIConfig(config);
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

            const result = validateAIConfig(config);
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

            const result = validateAIConfig(config);
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

            const result = validateAIConfig(config);
            expect(result.valid).to.be.false;
            expect(result.errors.length).to.equal(2);
        });
    });
});

