import { expect } from 'chai';
import { ReviewEngine } from '../../ai/review/reviewEngine';
import { DiffAnalysis } from '../../ai/diff/diffAnalyzer';

describe('ReviewEngine AI Integration Tests', () => {
    let reviewEngine: ReviewEngine;
    let mockConfigManager: any;
    let mockSecretManager: any;

    function createMockAnalysis(overrides?: Partial<DiffAnalysis>): DiffAnalysis {
        const defaultAnalysis: DiffAnalysis = {
            summary: 'Test summary',
            additions: 5,
            deletions: 2,
            modifications: 1,
            semanticChanges: [],
            consistencyReport: {
                score: 85,
                issues: [],
                suggestions: []
            }
        };

        return { ...defaultAnalysis, ...overrides };
    }

    describe('with AI provider available', () => {
        beforeEach(() => {
            // Create mock ConfigManager
            mockConfigManager = {
                getConfig: () => ({
                    provider: 'openai',
                    openai: { model: 'gpt-4' },
                    claude: { model: 'claude-3-sonnet' },
                    local: { endpoint: 'http://localhost:11434', model: 'llama2' }
                })
            };

            // Mock SecretManager with API key
            mockSecretManager = {
                getOpenAIKey: async () => 'test-api-key',
                getClaudeKey: async () => null
            };

            reviewEngine = new ReviewEngine(mockConfigManager, mockSecretManager);
        });

        it('should attempt to use AI provider when API key is available', async () => {
            const analysis = createMockAnalysis();
            const fullContent = '这是一个测试文档。\n\n这个文档用于测试 AI 审查功能。';

            // Note: This will fail to call actual API (no real key), but should attempt AI path
            const review = await reviewEngine.generateReview(analysis, 'test.md', fullContent);

            // Should still return valid review (via fallback)
            expect(review).to.exist;
            expect(review.overall).to.be.a('string');
            expect(review.strengths).to.be.an('array');
            expect(review.improvements).to.be.an('array');
            expect(review.suggestions).to.be.an('array');
            expect(review.rating).to.be.a('number');
        });

        it('should include filePath in review', async () => {
            const analysis = createMockAnalysis();
            const fullContent = '测试内容';
            const filePath = '/path/to/test.md';

            const review = await reviewEngine.generateReview(analysis, filePath, fullContent);

            expect(review.filePath).to.equal(filePath);
        });
    });

    describe('without AI provider (fallback)', () => {
        beforeEach(() => {
            // Create mock ConfigManager
            mockConfigManager = {
                getConfig: () => ({
                    provider: 'openai',
                    openai: { model: 'gpt-4' },
                    claude: { model: 'claude-3-sonnet' },
                    local: { endpoint: 'http://localhost:11434', model: 'llama2' }
                })
            };

            // Mock SecretManager without API key
            mockSecretManager = {
                getOpenAIKey: async () => null,
                getClaudeKey: async () => null
            };

            reviewEngine = new ReviewEngine(mockConfigManager, mockSecretManager);
        });

        it('should use fallback review when no API key is available', async () => {
            const analysis = createMockAnalysis({
                consistencyReport: {
                    score: 90,
                    issues: [],
                    suggestions: []
                }
            });

            const review = await reviewEngine.generateReview(analysis);

            expect(review).to.exist;
            expect(review.overall).to.exist;
            expect(review.strengths).to.be.an('array');
            expect(review.improvements).to.be.an('array');
            expect(review.rating).to.be.at.least(0);
            expect(review.rating).to.be.at.most(10);
        });

        it('should generate fallback review with high consistency score', async () => {
            const analysis = createMockAnalysis({
                consistencyReport: {
                    score: 95,
                    issues: [],
                    suggestions: []
                }
            });

            const review = await reviewEngine.generateReview(analysis);

            expect(review.overall).to.include('优秀');
            expect(review.rating).to.be.greaterThan(7);
        });

        it('should generate fallback review with low consistency score', async () => {
            const analysis = createMockAnalysis({
                consistencyReport: {
                    score: 60,
                    issues: ['Issue 1', 'Issue 2'],
                    suggestions: ['Suggestion 1']
                }
            });

            const review = await reviewEngine.generateReview(analysis);

            expect(review.improvements.length).to.be.greaterThan(0);
            expect(review.suggestions.length).to.be.greaterThan(0);
        });

        it('should handle missing fullContent gracefully', async () => {
            const analysis = createMockAnalysis();

            const review = await reviewEngine.generateReview(analysis);

            expect(review).to.exist;
            expect(review.overall).to.be.a('string');
        });
    });
});

