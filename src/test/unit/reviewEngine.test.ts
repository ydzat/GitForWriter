import { expect } from 'chai';
import { ReviewEngine } from '../../ai/review/reviewEngine';
import { DiffAnalysis, SemanticChange } from '../../ai/diff/diffAnalyzer';

describe('ReviewEngine Unit Tests', () => {
    let reviewEngine: ReviewEngine;
    let mockConfigManager: any;
    let mockSecretManager: any;

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

        // Create mock SecretManager
        mockSecretManager = {
            getOpenAIKey: async () => null, // No API key - will use fallback
            getClaudeKey: async () => null
        };

        reviewEngine = new ReviewEngine(mockConfigManager, mockSecretManager);
    });

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

    describe('generateReview()', () => {
        it('should generate review with high consistency score', async () => {
            const analysis = createMockAnalysis({
                consistencyReport: {
                    score: 90,
                    issues: [],
                    suggestions: []
                }
            });

            const review = await reviewEngine.generateReview(analysis);

            expect(review.overall).to.exist;
            expect(review.strengths).to.be.an('array');
            expect(review.improvements).to.be.an('array');
            expect(review.suggestions).to.be.an('array');
            expect(review.rating).to.be.a('number');
        });

        it('should generate review with low consistency score', async () => {
            const analysis = createMockAnalysis({
                consistencyReport: {
                    score: 60,
                    issues: ['Issue 1', 'Issue 2'],
                    suggestions: ['Suggestion 1']
                }
            });

            const review = await reviewEngine.generateReview(analysis);

            expect(review.overall).to.exist;
            expect(review.improvements.length).to.be.greaterThan(0);
            expect(review.suggestions.length).to.be.greaterThan(0);
        });

        it('should identify strengths for content expansion', async () => {
            const analysis = createMockAnalysis({
                additions: 20,
                deletions: 5,
                consistencyReport: {
                    score: 85,
                    issues: [],
                    suggestions: []
                }
            });

            const review = await reviewEngine.generateReview(analysis);

            expect(review.strengths.length).to.be.greaterThan(0);
            const hasExpansionStrength = review.strengths.some(s => 
                s.includes('扩充') || s.includes('丰富')
            );
            expect(hasExpansionStrength).to.be.true;
        });

        it('should calculate rating within valid range', async () => {
            const highScoreAnalysis = createMockAnalysis({
                consistencyReport: { score: 95, issues: [], suggestions: [] }
            });

            const lowScoreAnalysis = createMockAnalysis({
                consistencyReport: { score: 50, issues: ['Issue'], suggestions: [] }
            });

            const highReview = await reviewEngine.generateReview(highScoreAnalysis);
            const lowReview = await reviewEngine.generateReview(lowScoreAnalysis);

            expect(highReview.rating).to.be.greaterThan(lowReview.rating);
            expect(highReview.rating).to.be.at.least(0);
            expect(highReview.rating).to.be.at.most(10);
            expect(lowReview.rating).to.be.at.least(0);
            expect(lowReview.rating).to.be.at.most(10);
        });

        it('should include consistency issues in improvements', async () => {
            const analysis = createMockAnalysis({
                consistencyReport: {
                    score: 70,
                    issues: ['Long sentences detected', 'Repetitive words found'],
                    suggestions: ['Break long sentences']
                }
            });

            const review = await reviewEngine.generateReview(analysis);

            expect(review.improvements.length).to.be.at.least(2);
            const hasSpecificIssue = review.improvements.some(i => 
                i.includes('Long sentences')
            );
            expect(hasSpecificIssue).to.be.true;
        });

        it('should provide default strengths when none identified', async () => {
            const analysis = createMockAnalysis({
                additions: 1,
                deletions: 1,
                semanticChanges: [],
                consistencyReport: { score: 70, issues: [], suggestions: [] }
            });

            const review = await reviewEngine.generateReview(analysis);

            expect(review.strengths.length).to.be.greaterThan(0);
        });

        it('should provide default improvements when none identified', async () => {
            const analysis = createMockAnalysis({
                consistencyReport: { score: 95, issues: [], suggestions: [] }
            });

            const review = await reviewEngine.generateReview(analysis);

            expect(review.improvements.length).to.be.greaterThan(0);
        });
    });

    describe('overall assessment', () => {
        it('should mention content expansion', async () => {
            const analysis = createMockAnalysis({
                additions: 50,
                deletions: 0,
                consistencyReport: { score: 85, issues: [], suggestions: [] }
            });

            const review = await reviewEngine.generateReview(analysis);

            const mentionsExpansion = review.overall.includes('扩充') || 
                                     review.overall.includes('一致性');
            expect(mentionsExpansion).to.be.true;
        });

        it('should mention content reduction', async () => {
            const analysis = createMockAnalysis({
                additions: 5,
                deletions: 20,
                consistencyReport: { score: 85, issues: [], suggestions: [] }
            });

            const review = await reviewEngine.generateReview(analysis);

            const mentionsReduction = review.overall.includes('精简') || 
                                     review.overall.includes('删除');
            expect(mentionsReduction).to.be.true;
        });
    });

    describe('suggestions generation', () => {
        it('should generate suggestions from consistency report', async () => {
            const analysis = createMockAnalysis({
                consistencyReport: {
                    score: 75,
                    issues: [],
                    suggestions: ['Improve paragraph structure', 'Use more varied vocabulary']
                }
            });

            const review = await reviewEngine.generateReview(analysis);

            expect(review.suggestions.length).to.be.at.least(2);
            review.suggestions.forEach(suggestion => {
                expect(suggestion.type).to.exist;
                expect(suggestion.reason).to.exist;
            });
        });

        it('should handle many semantic changes', async () => {
            const semanticChanges: SemanticChange[] = Array(100).fill(null).map((_, i) => ({
                type: 'addition' as const,
                description: `Change ${i}`,
                lineNumber: i,
                confidence: 0.85
            }));

            const analysis = createMockAnalysis({ semanticChanges });

            const review = await reviewEngine.generateReview(analysis);

            expect(review).to.exist;
        });
    });

    describe('rating calculation', () => {
        it('should ensure rating is within valid range for extreme values', async () => {
            const extremeAnalysis = createMockAnalysis({
                additions: 1000,
                deletions: 0,
                semanticChanges: Array(100).fill(null).map((_, i) => ({
                    type: 'addition' as const,
                    description: `Change ${i}`,
                    lineNumber: i,
                    confidence: 0.85
                })),
                consistencyReport: { score: 100, issues: [], suggestions: [] }
            });

            const review = await reviewEngine.generateReview(extremeAnalysis);

            expect(review.rating).to.be.at.least(0);
            expect(review.rating).to.be.at.most(10);
        });
    });
});

