import { expect } from 'chai';
import { ClaudeProvider } from '../../ai/providers/claudeProvider';
import { AIProviderError } from '../../ai/providers/aiProvider';

// Mock Anthropic client
class MockAnthropic {
    public messages: any;
    private shouldFail: boolean = false;
    private failureType: string = '';
    private failureCount: number = 0;
    private currentAttempt: number = 0;

    constructor() {
        this.messages = {
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
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
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
                    }],
                    usage: {
                        input_tokens: 100,
                        output_tokens: 50
                    }
                };
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

describe('ClaudeProvider Unit Tests', () => {
    let mockClient: MockAnthropic;
    let provider: any; // Using any to access private methods for testing

    beforeEach(() => {
        mockClient = new MockAnthropic();
        
        // Create provider with mock client
        provider = new ClaudeProvider({
            apiKey: 'sk-ant-test-key',
            model: 'claude-3-sonnet',
            maxRetries: 3
        });

        // Replace the real client with mock
        (provider as any).client = mockClient;
    });

    describe('Constructor', () => {
        it('should throw error if API key is empty', () => {
            expect(() => new ClaudeProvider({ apiKey: '', model: 'claude-3-sonnet' }))
                .to.throw(AIProviderError, 'Claude API key is required');
        });

        it('should initialize with valid config', () => {
            const p = new ClaudeProvider({ apiKey: 'sk-ant-test', model: 'claude-3-sonnet' });
            expect(p).to.be.instanceOf(ClaudeProvider);
        });

        it('should map simplified model names to full IDs', () => {
            const p1 = new ClaudeProvider({ apiKey: 'sk-ant-test', model: 'claude-3-opus' });
            expect((p1 as any).model).to.equal('claude-3-opus-20240229');

            const p2 = new ClaudeProvider({ apiKey: 'sk-ant-test', model: 'claude-3-sonnet' });
            expect((p2 as any).model).to.equal('claude-3-sonnet-20240229');

            const p3 = new ClaudeProvider({ apiKey: 'sk-ant-test', model: 'claude-3-haiku' });
            expect((p3 as any).model).to.equal('claude-3-haiku-20240307');
        });

        it('should use full model ID if provided', () => {
            const p = new ClaudeProvider({ apiKey: 'sk-ant-test', model: 'claude-3-opus-20240229' });
            expect((p as any).model).to.equal('claude-3-opus-20240229');
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
            expect(result.model).to.equal('claude-3-sonnet-20240229');
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
                documentType: 'markdown'
            };

            const result = await provider.analyzeDiff(testDiff, context);
            expect(result.data).to.exist;
        });
    });

    describe('reviewText()', () => {
        const testText = '# Test Document\n\nThis is a test document with some content.';

        it('should review text successfully', async () => {
            // Mock response for text review
            mockClient.messages.create = async () => ({
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        overall: '整体质量良好',
                        strengths: ['清晰的结构'],
                        improvements: ['可以添加更多细节'],
                        rating: 8,
                        suggestions: [],
                        issues: []
                    })
                }],
                usage: {
                    input_tokens: 80,
                    output_tokens: 40
                }
            });

            const result = await provider.reviewText(testText);

            expect(result.data).to.exist;
            expect(result.data.overall).to.equal('整体质量良好');
            expect(result.data.rating).to.equal(8);
            expect(result.tokenUsage).to.exist;
        });

        it('should include context in review', async () => {
            const context = {
                writingStyle: 'academic' as const,
                targetAudience: 'researchers'
            };

            const result = await provider.reviewText(testText, context);
            expect(result.data).to.exist;
        });
    });

    describe('generateSuggestions()', () => {
        const testText = 'This is a test.';
        const testIssues = [
            { type: 'grammar' as const, line: 1, description: 'Test issue', severity: 'medium' as const }
        ];

        it('should generate suggestions successfully', async () => {
            // Mock response for suggestions
            mockClient.messages.create = async () => ({
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        suggestions: [
                            {
                                id: 'sug-1',
                                type: 'grammar',
                                line: 1,
                                startLine: 1,
                                startColumn: 0,
                                endLine: 1,
                                endColumn: 15,
                                original: 'This is a test.',
                                suggested: 'This is a test!',
                                reason: '建议使用感叹号',
                                confidence: 0.8
                            }
                        ]
                    })
                }],
                usage: {
                    input_tokens: 60,
                    output_tokens: 30
                }
            });

            const result = await provider.generateSuggestions(testText, testIssues);

            expect(result.data).to.exist;
            expect(result.data).to.be.an('array');
            expect(result.data.length).to.equal(1);
            expect(result.data[0].id).to.equal('sug-1');
        });
    });

    describe('Token Usage and Cost Estimation', () => {
        it('should track token usage correctly', async () => {
            const testDiff = '+Added line';
            const result = await provider.analyzeDiff(testDiff);

            expect(result.tokenUsage).to.exist;
            expect(result.tokenUsage?.promptTokens).to.equal(100);
            expect(result.tokenUsage?.completionTokens).to.equal(50);
            expect(result.tokenUsage?.totalTokens).to.equal(150);
        });

        it('should estimate cost for claude-3-opus', async () => {
            const opusProvider = new ClaudeProvider({
                apiKey: 'sk-ant-test',
                model: 'claude-3-opus'
            });
            (opusProvider as any).client = mockClient;

            const result = await opusProvider.analyzeDiff('+test');

            // Opus: $15 input, $75 output per 1M tokens
            // 100 input tokens = 100 * 0.000015 = 0.0015
            // 50 output tokens = 50 * 0.000075 = 0.00375
            // Total = 0.00525
            expect(result.tokenUsage?.estimatedCost).to.be.closeTo(0.00525, 0.00001);
        });

        it('should estimate cost for claude-3-sonnet', async () => {
            const result = await provider.analyzeDiff('+test');

            // Sonnet: $3 input, $15 output per 1M tokens
            // 100 input tokens = 100 * 0.000003 = 0.0003
            // 50 output tokens = 50 * 0.000015 = 0.00075
            // Total = 0.00105
            expect(result.tokenUsage?.estimatedCost).to.be.closeTo(0.00105, 0.00001);
        });

        it('should estimate cost for claude-3-haiku', async () => {
            const haikuProvider = new ClaudeProvider({
                apiKey: 'sk-ant-test',
                model: 'claude-3-haiku'
            });
            (haikuProvider as any).client = mockClient;

            const result = await haikuProvider.analyzeDiff('+test');

            // Haiku: $0.25 input, $1.25 output per 1M tokens
            // 100 input tokens = 100 * 0.00000025 = 0.000025
            // 50 output tokens = 50 * 0.00000125 = 0.0000625
            // Total = 0.0000875
            expect(result.tokenUsage?.estimatedCost).to.be.closeTo(0.0000875, 0.0000001);
        });
    });

    describe('Error Handling', () => {
        it('should handle network errors', async () => {
            mockClient.setFailure('network', 10);

            let errorThrown = false;
            try {
                await provider.analyzeDiff('+test');
            } catch (error: any) {
                errorThrown = true;
                expect(error).to.be.instanceOf(AIProviderError);
                expect(error.code).to.equal('MAX_RETRIES_EXCEEDED');
            }
            expect(errorThrown).to.be.true;
        });

        it('should handle invalid JSON response', async () => {
            mockClient.messages.create = async () => ({
                content: [{
                    type: 'text',
                    text: 'Invalid JSON'
                }],
                usage: {
                    input_tokens: 10,
                    output_tokens: 5
                }
            });

            let errorThrown = false;
            try {
                await provider.analyzeDiff('+test');
            } catch (error: any) {
                errorThrown = true;
                expect(error).to.be.instanceOf(AIProviderError);
                expect(error.code).to.equal('PARSE_ERROR');
            }
            expect(errorThrown).to.be.true;
        });

        it('should handle empty response gracefully', async () => {
            mockClient.messages.create = async () => ({
                content: [],
                usage: {
                    input_tokens: 10,
                    output_tokens: 0
                }
            });

            // Empty content array defaults to '{}', which parses to default values
            const result = await provider.analyzeDiff('+test');
            expect(result.data).to.exist;
            expect(result.data.summary).to.equal('无明显变化');
        });
    });
});

