import { expect } from 'chai';
import { AIConfig, validateAIConfig } from '../../config/validation';

// Note: We test the validation logic using the pure function from validation.ts
// which doesn't depend on vscode module.
// Integration tests should be used for testing VSCode-dependent functionality.

describe('ConfigManager Unit Tests', () => {
    describe('validateAIConfig()', () => {
        it('should validate valid unified config', () => {
            const config: AIConfig = {
                provider: 'unified',
                unified: { provider: 'openai', model: 'gpt-4' },
                openai: { model: 'gpt-4' },
                claude: { model: 'claude-3-sonnet' },
                local: { endpoint: 'http://localhost:11434', model: 'llama2' }
            };

            const result = validateAIConfig(config);
            expect(result.valid).to.be.true;
            expect(result.errors).to.be.empty;
        });

        it('should validate valid OpenAI config', () => {
            const config: AIConfig = {
                provider: 'openai',
                unified: { provider: 'openai', model: 'gpt-4' },
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
                unified: { provider: 'openai', model: 'gpt-4' },
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
                unified: { provider: 'openai', model: 'gpt-4' },
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
                unified: { provider: 'openai', model: 'gpt-4' },
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
                unified: { provider: 'openai', model: 'gpt-4' },
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
                unified: { provider: 'openai', model: 'gpt-4' },
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
                unified: { provider: 'openai', model: 'gpt-4' },
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
                unified: { provider: 'openai', model: 'gpt-4' },
                openai: { model: 'gpt-4' },
                claude: { model: 'claude-3-sonnet' },
                local: { endpoint: '', model: '' }
            };

            const result = validateAIConfig(config);
            expect(result.valid).to.be.false;
            expect(result.errors.length).to.be.greaterThan(1);
            expect(result.errors.some(e => e.includes('endpoint'))).to.be.true;
            expect(result.errors.some(e => e.includes('model'))).to.be.true;
        });

        it('should require underlying provider for unified provider', () => {
            const config: AIConfig = {
                provider: 'unified',
                unified: { provider: '' as any, model: 'gpt-4' },
                openai: { model: 'gpt-4' },
                claude: { model: 'claude-3-sonnet' },
                local: { endpoint: 'http://localhost:11434', model: 'llama2' }
            };

            const result = validateAIConfig(config);
            expect(result.valid).to.be.false;
            expect(result.errors.some(e => e.includes('underlying provider'))).to.be.true;
        });

        it('should reject invalid underlying provider for unified', () => {
            const config: AIConfig = {
                provider: 'unified',
                unified: { provider: 'invalid' as any, model: 'gpt-4' },
                openai: { model: 'gpt-4' },
                claude: { model: 'claude-3-sonnet' },
                local: { endpoint: 'http://localhost:11434', model: 'llama2' }
            };

            const result = validateAIConfig(config);
            expect(result.valid).to.be.false;
            expect(result.errors.some(e => e.includes('underlying provider'))).to.be.true;
        });

        it('should require model for unified provider', () => {
            const config: AIConfig = {
                provider: 'unified',
                unified: { provider: 'openai', model: '' },
                openai: { model: 'gpt-4' },
                claude: { model: 'claude-3-sonnet' },
                local: { endpoint: 'http://localhost:11434', model: 'llama2' }
            };

            const result = validateAIConfig(config);
            expect(result.valid).to.be.false;
            expect(result.errors.some(e => e.includes('model name is required'))).to.be.true;
        });

        it('should accept anthropic as underlying provider for unified', () => {
            const config: AIConfig = {
                provider: 'unified',
                unified: { provider: 'anthropic', model: 'claude-3-opus' },
                openai: { model: 'gpt-4' },
                claude: { model: 'claude-3-sonnet' },
                local: { endpoint: 'http://localhost:11434', model: 'llama2' }
            };

            const result = validateAIConfig(config);
            expect(result.valid).to.be.true;
            expect(result.errors).to.be.empty;
        });

        it('should accept baseURL for unified provider', () => {
            const config: AIConfig = {
                provider: 'unified',
                unified: { provider: 'openai', model: 'gpt-4', baseURL: 'https://api.deepseek.com' },
                openai: { model: 'gpt-4' },
                claude: { model: 'claude-3-sonnet' },
                local: { endpoint: 'http://localhost:11434', model: 'llama2' }
            };

            const result = validateAIConfig(config);
            expect(result.valid).to.be.true;
            expect(result.errors).to.be.empty;
        });

        it('should accept baseURL for openai provider', () => {
            const config: AIConfig = {
                provider: 'openai',
                unified: { provider: 'openai', model: 'gpt-4' },
                openai: { model: 'gpt-4', baseURL: 'https://api.custom.com' },
                claude: { model: 'claude-3-sonnet' },
                local: { endpoint: 'http://localhost:11434', model: 'llama2' }
            };

            const result = validateAIConfig(config);
            expect(result.valid).to.be.true;
            expect(result.errors).to.be.empty;
        });

        it('should handle whitespace-only model name for unified', () => {
            const config: AIConfig = {
                provider: 'unified',
                unified: { provider: 'openai', model: '   ' },
                openai: { model: 'gpt-4' },
                claude: { model: 'claude-3-sonnet' },
                local: { endpoint: 'http://localhost:11434', model: 'llama2' }
            };

            const result = validateAIConfig(config);
            expect(result.valid).to.be.false;
            expect(result.errors.some(e => e.includes('model name is required'))).to.be.true;
        });

        it('should handle whitespace-only endpoint for local', () => {
            const config: AIConfig = {
                provider: 'local',
                unified: { provider: 'openai', model: 'gpt-4' },
                openai: { model: 'gpt-4' },
                claude: { model: 'claude-3-sonnet' },
                local: { endpoint: '   ', model: 'llama2' }
            };

            const result = validateAIConfig(config);
            expect(result.valid).to.be.false;
            expect(result.errors.some(e => e.includes('endpoint'))).to.be.true;
        });

        it('should handle whitespace-only model for local', () => {
            const config: AIConfig = {
                provider: 'local',
                unified: { provider: 'openai', model: 'gpt-4' },
                openai: { model: 'gpt-4' },
                claude: { model: 'claude-3-sonnet' },
                local: { endpoint: 'http://localhost:11434', model: '   ' }
            };

            const result = validateAIConfig(config);
            expect(result.valid).to.be.false;
            expect(result.errors.some(e => e.includes('model name is required'))).to.be.true;
        });
    });
});

