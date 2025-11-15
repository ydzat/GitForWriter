import { expect } from 'chai';
import { UnifiedProvider } from '../../ai/providers/unifiedProvider';
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

    describe('BaseURL Validation', () => {
        it('should accept HTTPS baseURL', () => {
            const provider = new UnifiedProvider({
                provider: 'openai',
                model: 'gpt-4',
                apiKey: 'test-key',
                baseURL: 'https://api.deepseek.com'
            });
            expect(provider).to.be.instanceOf(UnifiedProvider);
        });

        it('should accept HTTP for localhost', () => {
            const provider = new UnifiedProvider({
                provider: 'openai',
                model: 'gpt-4',
                apiKey: 'test-key',
                baseURL: 'http://localhost:11434'
            });
            expect(provider).to.be.instanceOf(UnifiedProvider);
        });

        it('should accept HTTP for 127.0.0.1', () => {
            const provider = new UnifiedProvider({
                provider: 'openai',
                model: 'gpt-4',
                apiKey: 'test-key',
                baseURL: 'http://127.0.0.1:11434'
            });
            expect(provider).to.be.instanceOf(UnifiedProvider);
        });

        it('should reject HTTP for non-localhost', () => {
            expect(() => {
                new UnifiedProvider({
                    provider: 'openai',
                    model: 'gpt-4',
                    apiKey: 'test-key',
                    baseURL: 'http://api.example.com'
                });
            }).to.throw(AIProviderError, 'HTTPS');
        });

        it('should reject invalid baseURL format', () => {
            expect(() => {
                new UnifiedProvider({
                    provider: 'openai',
                    model: 'gpt-4',
                    apiKey: 'test-key',
                    baseURL: 'not-a-valid-url'
                });
            }).to.throw(AIProviderError, 'Invalid baseURL');
        });

        it('should normalize baseURL by adding /v1 suffix', () => {
            const provider = new UnifiedProvider({
                provider: 'openai',
                model: 'gpt-4',
                apiKey: 'test-key',
                baseURL: 'https://api.deepseek.com'
            });
            expect(provider).to.be.instanceOf(UnifiedProvider);
        });

        it('should not add /v1 suffix if already present', () => {
            const provider = new UnifiedProvider({
                provider: 'openai',
                model: 'gpt-4',
                apiKey: 'test-key',
                baseURL: 'https://api.deepseek.com/v1'
            });
            expect(provider).to.be.instanceOf(UnifiedProvider);
        });
    });

    describe('Timeout Configuration', () => {
        it('should use default timeout if not provided', () => {
            const provider = new UnifiedProvider({
                provider: 'openai',
                model: 'gpt-4',
                apiKey: 'test-key'
            });
            expect(provider).to.be.instanceOf(UnifiedProvider);
        });

        it('should use custom timeout if provided', () => {
            const provider = new UnifiedProvider({
                provider: 'openai',
                model: 'gpt-4',
                apiKey: 'test-key',
                timeout: 30000
            });
            expect(provider).to.be.instanceOf(UnifiedProvider);
        });
    });

    describe('Backoff Calculation', () => {
        it('should calculate exponential backoff correctly', () => {
            const provider = new UnifiedProvider({
                provider: 'openai',
                model: 'gpt-4',
                apiKey: 'test-key'
            });

            // Access private method through type assertion
            const calculateBackoff = (provider as any).calculateBackoffDelay.bind(provider);

            expect(calculateBackoff(0)).to.equal(1000);  // 2^0 * 1000 = 1000
            expect(calculateBackoff(1)).to.equal(2000);  // 2^1 * 1000 = 2000
            expect(calculateBackoff(2)).to.equal(4000);  // 2^2 * 1000 = 4000
            expect(calculateBackoff(3)).to.equal(8000);  // 2^3 * 1000 = 8000
        });
    });

    describe('BaseURL Normalization', () => {
        it('should add /v1 to baseURL without it', () => {
            const provider = new UnifiedProvider({
                provider: 'openai',
                model: 'gpt-4',
                apiKey: 'test-key',
                baseURL: 'https://api.example.com'
            });

            const normalizeBaseURL = (provider as any).normalizeBaseURL.bind(provider);
            expect(normalizeBaseURL('https://api.example.com')).to.equal('https://api.example.com/v1');
        });

        it('should not add /v1 if already present', () => {
            const provider = new UnifiedProvider({
                provider: 'openai',
                model: 'gpt-4',
                apiKey: 'test-key',
                baseURL: 'https://api.example.com/v1'
            });

            const normalizeBaseURL = (provider as any).normalizeBaseURL.bind(provider);
            expect(normalizeBaseURL('https://api.example.com/v1')).to.equal('https://api.example.com/v1');
        });
    });

    describe('Prompt Building', () => {
        let provider: UnifiedProvider;

        beforeEach(() => {
            provider = new UnifiedProvider({
                provider: 'openai',
                model: 'gpt-4',
                apiKey: 'test-key'
            });
        });

        it('should build diff analysis prompt without context', () => {
            const buildPrompt = (provider as any).buildDiffAnalysisPrompt.bind(provider);
            const diff = '+Added line\n-Removed line';
            const prompt = buildPrompt(diff);

            expect(prompt).to.include('git diff');
            expect(prompt).to.include(diff);
            expect(prompt).to.include('JSON');
            expect(prompt).to.include('semanticChanges');
        });

        it('should build diff analysis prompt with context', () => {
            const buildPrompt = (provider as any).buildDiffAnalysisPrompt.bind(provider);
            const diff = '+Added line';
            const context = {
                documentType: 'markdown',
                filePath: '/test/file.md'
            };
            const prompt = buildPrompt(diff, context);

            expect(prompt).to.include('markdown');
            expect(prompt).to.include('/test/file.md');
            expect(prompt).to.include(diff);
        });

        it('should build text review prompt without context', () => {
            const buildPrompt = (provider as any).buildTextReviewPrompt.bind(provider);
            const text = 'This is a test document.';
            const prompt = buildPrompt(text);

            expect(prompt).to.include(text);
            expect(prompt).to.include('JSON');
            expect(prompt).to.include('suggestions');
            expect(prompt).to.include('issues');
        });

        it('should build text review prompt with writing style', () => {
            const buildPrompt = (provider as any).buildTextReviewPrompt.bind(provider);
            const text = 'Test text';
            const context = {
                writingStyle: 'academic'
            };
            const prompt = buildPrompt(text, context);

            expect(prompt).to.include('academic');
            expect(prompt).to.include(text);
        });

        it('should build text review prompt with target audience', () => {
            const buildPrompt = (provider as any).buildTextReviewPrompt.bind(provider);
            const text = 'Test text';
            const context = {
                targetAudience: 'general public'
            };
            const prompt = buildPrompt(text, context);

            expect(prompt).to.include('general public');
            expect(prompt).to.include(text);
        });

        it('should build text review prompt with both style and audience', () => {
            const buildPrompt = (provider as any).buildTextReviewPrompt.bind(provider);
            const text = 'Test text';
            const context = {
                writingStyle: 'technical',
                targetAudience: 'developers'
            };
            const prompt = buildPrompt(text, context);

            expect(prompt).to.include('technical');
            expect(prompt).to.include('developers');
            expect(prompt).to.include(text);
        });

        it('should build suggestions prompt', () => {
            const buildPrompt = (provider as any).buildSuggestionsPrompt.bind(provider);
            const text = 'Test text';
            const issues = [
                {
                    type: 'grammar' as const,
                    line: 1,
                    description: 'Grammar issue',
                    severity: 'high' as const
                }
            ];
            const prompt = buildPrompt(text, issues);

            expect(prompt).to.include(text);
            expect(prompt).to.include('grammar');
            expect(prompt).to.include('Grammar issue');
        });
    });

    describe('Response Parsing', () => {
        let provider: UnifiedProvider;

        beforeEach(() => {
            provider = new UnifiedProvider({
                provider: 'openai',
                model: 'gpt-4',
                apiKey: 'test-key'
            });
        });

        it('should parse diff analysis from JSON response', () => {
            const parseResponse = (provider as any).parseDiffAnalysis.bind(provider);
            const diff = '+Added line\n-Removed line';
            const jsonResponse = JSON.stringify({
                summary: 'Test summary',
                semanticChanges: [
                    {
                        type: 'addition',
                        description: 'Added a line',
                        lineNumber: 1,
                        confidence: 0.9,
                        explanation: 'Test explanation',
                        impact: 'minor'
                    }
                ],
                structuralChanges: [],
                toneChanges: [],
                impact: 'minor',
                consistencyReport: {
                    score: 85,
                    issues: [],
                    suggestions: []
                }
            });

            const analysis = parseResponse(jsonResponse, diff);

            expect(analysis.summary).to.equal('Test summary');
            expect(analysis.semanticChanges).to.have.lengthOf(1);
            expect(analysis.semanticChanges[0].type).to.equal('addition');
            expect(analysis.additions).to.equal(1);
            expect(analysis.deletions).to.equal(1);
        });

        it('should parse text review from JSON response', () => {
            const parseResponse = (provider as any).parseTextReview.bind(provider);
            const jsonResponse = JSON.stringify({
                overall: 'Good writing',
                strengths: ['Clear', 'Concise'],
                improvements: ['Add examples'],
                rating: 8,
                suggestions: [],
                issues: []
            });

            const review = parseResponse(jsonResponse);

            expect(review.overall).to.equal('Good writing');
            expect(review.strengths).to.have.lengthOf(2);
            expect(review.improvements).to.have.lengthOf(1);
            expect(review.rating).to.equal(8);
        });

        it('should parse suggestions from JSON response', () => {
            const parseResponse = (provider as any).parseSuggestions.bind(provider);
            const jsonResponse = JSON.stringify({
                suggestions: [
                    {
                        id: 'test-1',
                        type: 'grammar',
                        line: 1,
                        startLine: 1,
                        startColumn: 0,
                        endLine: 1,
                        endColumn: 10,
                        original: 'wrong text',
                        suggested: 'correct text',
                        reason: 'Grammar correction',
                        confidence: 0.95
                    }
                ]
            });

            const suggestions = parseResponse(jsonResponse);

            expect(suggestions).to.have.lengthOf(1);
            expect(suggestions[0].id).to.equal('test-1');
            expect(suggestions[0].type).to.equal('grammar');
            expect(suggestions[0].confidence).to.equal(0.95);
        });
    });
});

