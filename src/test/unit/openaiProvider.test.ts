import { expect } from 'chai';
import { OpenAIProvider } from '../../ai/providers/openaiProvider';
import { AIProviderError } from '../../ai/providers/aiProvider';

// Mock OpenAI client
class MockOpenAI {
    public chat: any;
    public models: any;
    private shouldFail: boolean = false;
    private failureType: string = '';
    private failureCount: number = 0;
    private currentAttempt: number = 0;

    constructor() {
        this.chat = {
            completions: {
                create: async (params: any) => {
                    this.currentAttempt++;
                    
                    if (this.shouldFail && this.currentAttempt <= this.failureCount) {
                        if (this.failureType === 'rate_limit') {
                            const error: any = new Error('Rate limit exceeded');
                            error.status = 429;
                            throw error;
                        } else if (this.failureType === 'auth') {
                            const error: any = new Error('Invalid API key');
                            error.status = 401;
                            throw error;
                        } else if (this.failureType === 'network') {
                            const error: any = new Error('Network error');
                            error.code = 'ENOTFOUND';
                            throw error;
                        }
                    }

                    // Return mock successful response
                    return {
                        choices: [{
                            message: {
                                content: JSON.stringify({
                                    summary: '测试摘要',
                                    semanticChanges: [],
                                    structuralChanges: [],
                                    toneChanges: [],
                                    impact: 'minor',
                                    consistencyReport: {
                                        score: 85,
                                        issues: [],
                                        suggestions: []
                                    }
                                })
                            }
                        }],
                        usage: {
                            prompt_tokens: 100,
                            completion_tokens: 50,
                            total_tokens: 150
                        }
                    };
                }
            }
        };

        this.models = {
            retrieve: async (model: string) => {
                if (this.shouldFail && this.failureType === 'auth') {
                    const error: any = new Error('Invalid API key');
                    error.status = 401;
                    throw error;
                }
                return { id: model };
            }
        };
    }

    setFailure(type: string, count: number = 1) {
        this.shouldFail = true;
        this.failureType = type;
        this.failureCount = count;
        this.currentAttempt = 0;
    }

    clearFailure() {
        this.shouldFail = false;
        this.failureType = '';
        this.failureCount = 0;
        this.currentAttempt = 0;
    }
}

describe('OpenAIProvider Unit Tests', () => {
    let mockClient: MockOpenAI;
    let provider: any; // Using any to access private methods for testing

    beforeEach(() => {
        mockClient = new MockOpenAI();
        
        // Create provider with mock client
        provider = new OpenAIProvider({
            apiKey: 'sk-test-key',
            model: 'gpt-4',
            maxRetries: 3
        });

        // Replace the real client with mock
        (provider as any).client = mockClient;
    });

    describe('Constructor', () => {
        it('should throw error if API key is empty', () => {
            expect(() => new OpenAIProvider({ apiKey: '', model: 'gpt-4' }))
                .to.throw(AIProviderError, 'OpenAI API key is required');
        });

        it('should initialize with valid config', () => {
            const p = new OpenAIProvider({ apiKey: 'sk-test', model: 'gpt-4' });
            expect(p).to.be.instanceOf(OpenAIProvider);
        });

        it('should use provided model', () => {
            const p = new OpenAIProvider({ apiKey: 'sk-test', model: 'gpt-3.5-turbo' });
            expect((p as any).model).to.equal('gpt-3.5-turbo');
        });
    });

    describe('validate()', () => {
        it('should return true for valid API key', async () => {
            const result = await provider.validate();
            expect(result).to.be.true;
        });

        it('should throw error for invalid API key', async () => {
            mockClient.setFailure('auth');
            
            try {
                await provider.validate();
                expect.fail('Should have thrown error');
            } catch (error: any) {
                expect(error).to.be.instanceOf(AIProviderError);
                expect(error.code).to.equal('INVALID_API_KEY');
                expect(error.statusCode).to.equal(401);
            }
        });
    });

    describe('analyzeDiff()', () => {
        const testDiff = `diff --git a/test.md b/test.md
index 1234567..abcdefg 100644
--- a/test.md
+++ b/test.md
@@ -1,3 +1,4 @@
 # Test Document
 
 This is a test.
+This is a new line.`;

        it('should analyze diff successfully', async () => {
            const result = await provider.analyzeDiff(testDiff);

            expect(result.data).to.exist;
            expect(result.data.summary).to.equal('测试摘要');
            expect(result.data.additions).to.equal(1);
            expect(result.data.deletions).to.equal(0);
            expect(result.tokenUsage).to.exist;
            expect(result.tokenUsage?.totalTokens).to.equal(150);
            expect(result.model).to.equal('gpt-4');
        });

        it('should handle rate limit with retry', async () => {
            // Fail twice, then succeed
            mockClient.setFailure('rate_limit', 2);

            const result = await provider.analyzeDiff(testDiff);
            expect(result.data).to.exist;
        });

        it('should throw error after max retries', async () => {
            // Fail all attempts
            mockClient.setFailure('rate_limit', 10);

            try {
                await provider.analyzeDiff(testDiff);
                expect.fail('Should have thrown error');
            } catch (error: any) {
                expect(error).to.be.instanceOf(AIProviderError);
                expect(error.code).to.equal('MAX_RETRIES_EXCEEDED');
            }
        });

        it('should not retry on auth errors', async () => {
            mockClient.setFailure('auth');

            try {
                await provider.analyzeDiff(testDiff);
                expect.fail('Should have thrown error');
            } catch (error: any) {
                expect(error).to.be.instanceOf(AIProviderError);
                expect(error.code).to.equal('INVALID_API_KEY');
            }
        });

        it('should include context in analysis', async () => {
            const context = {
                filePath: 'test.md',
                documentType: 'markdown',
                fullContent: 'Full content here'
            };

            const result = await provider.analyzeDiff(testDiff, context);
            expect(result.data).to.exist;
        });
    });

    describe('reviewText()', () => {
        const testText = '这是一个测试文档。它包含一些文本。';

        it('should review text successfully', async () => {
            // Mock review response
            mockClient.chat.completions.create = async () => ({
                choices: [{
                    message: {
                        content: JSON.stringify({
                            overall: '整体质量良好',
                            strengths: ['清晰简洁'],
                            improvements: ['可以扩展内容'],
                            rating: 8,
                            suggestions: [],
                            issues: []
                        })
                    }
                }],
                usage: {
                    prompt_tokens: 50,
                    completion_tokens: 30,
                    total_tokens: 80
                }
            });

            const result = await provider.reviewText(testText);

            expect(result.data).to.exist;
            expect(result.data.overall).to.equal('整体质量良好');
            expect(result.data.rating).to.equal(8);
            expect(result.data.strengths).to.have.lengthOf(1);
            expect(result.tokenUsage).to.exist;
        });

        it('should include context in review', async () => {
            const context = {
                writingStyle: 'formal' as const,
                targetAudience: 'academics',
                documentType: 'research paper'
            };

            mockClient.chat.completions.create = async () => ({
                choices: [{
                    message: {
                        content: JSON.stringify({
                            overall: '学术风格良好',
                            strengths: [],
                            improvements: [],
                            rating: 9,
                            suggestions: [],
                            issues: []
                        })
                    }
                }],
                usage: { prompt_tokens: 60, completion_tokens: 40, total_tokens: 100 }
            });

            const result = await provider.reviewText(testText, context);
            expect(result.data.overall).to.equal('学术风格良好');
        });
    });

    describe('generateSuggestions()', () => {
        const testText = '这是测试文本。';
        const testIssues = [
            { type: 'grammar' as const, line: 1, description: '语法问题', severity: 'medium' as const }
        ];

        it('should generate suggestions successfully', async () => {
            mockClient.chat.completions.create = async () => ({
                choices: [{
                    message: {
                        content: JSON.stringify({
                            suggestions: [
                                {
                                    id: 'test-1',
                                    type: 'grammar',
                                    line: 1,
                                    startLine: 0,
                                    startColumn: 0,
                                    endLine: 0,
                                    endColumn: 10,
                                    original: '这是测试',
                                    suggested: '这是一个测试',
                                    reason: '添加量词',
                                    confidence: 0.9
                                }
                            ]
                        })
                    }
                }],
                usage: { prompt_tokens: 40, completion_tokens: 60, total_tokens: 100 }
            });

            const result = await provider.generateSuggestions(testText, testIssues);

            expect(result.data).to.have.lengthOf(1);
            expect(result.data[0].id).to.equal('test-1');
            expect(result.data[0].confidence).to.equal(0.9);
        });
    });

    describe('Token Usage and Cost Estimation', () => {
        it('should track token usage', async () => {
            const result = await provider.analyzeDiff('+ test');

            expect(result.tokenUsage).to.exist;
            expect(result.tokenUsage?.promptTokens).to.equal(100);
            expect(result.tokenUsage?.completionTokens).to.equal(50);
            expect(result.tokenUsage?.totalTokens).to.equal(150);
        });

        it('should estimate cost for gpt-4', async () => {
            const result = await provider.analyzeDiff('+ test');

            expect(result.tokenUsage?.estimatedCost).to.exist;
            // 100 prompt tokens * 0.00003 + 50 completion tokens * 0.00006 = 0.003 + 0.003 = 0.006
            expect(result.tokenUsage?.estimatedCost).to.be.closeTo(0.006, 0.0001);
        });

        it('should estimate cost for gpt-3.5-turbo', async () => {
            const p = new OpenAIProvider({ apiKey: 'sk-test', model: 'gpt-3.5-turbo' });
            (p as any).client = mockClient;

            const result = await p.analyzeDiff('+ test');

            // 100 prompt tokens * 0.0000015 + 50 completion tokens * 0.000002 = 0.00015 + 0.0001 = 0.00025
            expect(result.tokenUsage?.estimatedCost).to.be.closeTo(0.00025, 0.00001);
        });
    });

    describe('Error Handling', () => {
        it('should handle network errors', async () => {
            mockClient.setFailure('network', 10);

            try {
                await provider.analyzeDiff('+ test');
                expect.fail('Should have thrown error');
            } catch (error: any) {
                expect(error).to.be.instanceOf(AIProviderError);
                expect(error.code).to.equal('MAX_RETRIES_EXCEEDED');
            }
        });

        it('should handle parse errors', async () => {
            mockClient.chat.completions.create = async () => ({
                choices: [{
                    message: { content: 'invalid json' }
                }],
                usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 }
            });

            try {
                await provider.analyzeDiff('+ test');
                expect.fail('Should have thrown error');
            } catch (error: any) {
                expect(error).to.be.instanceOf(AIProviderError);
                expect(error.code).to.equal('PARSE_ERROR');
            }
        });
    });
});


