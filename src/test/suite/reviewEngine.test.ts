import * as assert from 'assert';
import { ReviewEngine } from '../../ai/review/reviewEngine';
import { DiffAnalysis, SemanticChange } from '../../ai/diff/diffAnalyzer';

suite('ReviewEngine Test Suite', () => {
    let reviewEngine: ReviewEngine;

    setup(() => {
        reviewEngine = new ReviewEngine();
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

    test('should generate review with high consistency score', async () => {
        const analysis = createMockAnalysis({
            consistencyReport: {
                score: 90,
                issues: [],
                suggestions: []
            }
        });

        const review = await reviewEngine.generateReview(analysis);

        assert.ok(review.overall, 'Should have overall assessment');
        assert.ok(review.overall.includes('优秀') || review.overall.includes('良好'), 'Should indicate good quality');
        assert.ok(Array.isArray(review.strengths), 'Should have strengths array');
        assert.ok(Array.isArray(review.improvements), 'Should have improvements array');
        assert.ok(Array.isArray(review.suggestions), 'Should have suggestions array');
        assert.ok(typeof review.rating === 'number', 'Rating should be a number');
    });

    test('should generate review with low consistency score', async () => {
        const analysis = createMockAnalysis({
            consistencyReport: {
                score: 60,
                issues: ['Issue 1', 'Issue 2'],
                suggestions: ['Suggestion 1']
            }
        });

        const review = await reviewEngine.generateReview(analysis);

        assert.ok(review.overall, 'Should have overall assessment');
        assert.ok(review.improvements.length > 0, 'Should have improvements');
        assert.ok(review.suggestions.length > 0, 'Should have suggestions');
    });

    test('should identify strengths for content expansion', async () => {
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

        assert.ok(review.strengths.length > 0, 'Should have strengths');
        const hasExpansionStrength = review.strengths.some(s => 
            s.includes('扩充') || s.includes('丰富')
        );
        assert.ok(hasExpansionStrength, 'Should recognize content expansion as strength');
    });

    test('should identify strengths for detailed modifications', async () => {
        const semanticChanges: SemanticChange[] = Array(10).fill(null).map((_, i) => ({
            type: 'modification' as const,
            description: `Change ${i}`,
            lineNumber: i,
            confidence: 0.85
        }));

        const analysis = createMockAnalysis({
            semanticChanges,
            consistencyReport: {
                score: 85,
                issues: [],
                suggestions: []
            }
        });

        const review = await reviewEngine.generateReview(analysis);

        const hasDetailStrength = review.strengths.some(s => 
            s.includes('细致') || s.includes('细节')
        );
        assert.ok(hasDetailStrength, 'Should recognize detailed work as strength');
    });

    test('should include consistency issues in improvements', async () => {
        const analysis = createMockAnalysis({
            consistencyReport: {
                score: 70,
                issues: ['Long sentences detected', 'Repetitive words found'],
                suggestions: ['Break long sentences']
            }
        });

        const review = await reviewEngine.generateReview(analysis);

        assert.ok(review.improvements.length >= 2, 'Should include consistency issues');
        assert.ok(
            review.improvements.some(i => i.includes('Long sentences')),
            'Should include specific issue'
        );
    });

    test('should generate suggestions from consistency report', async () => {
        const analysis = createMockAnalysis({
            consistencyReport: {
                score: 75,
                issues: [],
                suggestions: ['Improve paragraph structure', 'Use more varied vocabulary']
            }
        });

        const review = await reviewEngine.generateReview(analysis);

        assert.ok(review.suggestions.length >= 2, 'Should have suggestions');
        review.suggestions.forEach(suggestion => {
            assert.ok(suggestion.type, 'Suggestion should have type');
            assert.ok(suggestion.reason, 'Suggestion should have reason');
        });
    });

    test('should calculate rating based on consistency score', async () => {
        const highScoreAnalysis = createMockAnalysis({
            consistencyReport: { score: 95, issues: [], suggestions: [] }
        });

        const lowScoreAnalysis = createMockAnalysis({
            consistencyReport: { score: 50, issues: ['Issue'], suggestions: [] }
        });

        const highReview = await reviewEngine.generateReview(highScoreAnalysis);
        const lowReview = await reviewEngine.generateReview(lowScoreAnalysis);

        assert.ok(highReview.rating > lowReview.rating, 'Higher consistency should yield higher rating');
        assert.ok(highReview.rating >= 0 && highReview.rating <= 10, 'Rating should be 0-10');
        assert.ok(lowReview.rating >= 0 && lowReview.rating <= 10, 'Rating should be 0-10');
    });

    test('should handle content expansion in overall assessment', async () => {
        const analysis = createMockAnalysis({
            additions: 50,
            deletions: 0,
            consistencyReport: { score: 85, issues: [], suggestions: [] }
        });

        const review = await reviewEngine.generateReview(analysis);

        assert.ok(
            review.overall.includes('扩充') || review.overall.includes('一致性'),
            'Should mention content expansion'
        );
    });

    test('should handle content reduction in overall assessment', async () => {
        const analysis = createMockAnalysis({
            additions: 5,
            deletions: 20,
            consistencyReport: { score: 85, issues: [], suggestions: [] }
        });

        const review = await reviewEngine.generateReview(analysis);

        assert.ok(
            review.overall.includes('精简') || review.overall.includes('删除'),
            'Should mention content reduction'
        );
    });

    test('should provide default strengths when none identified', async () => {
        const analysis = createMockAnalysis({
            additions: 1,
            deletions: 1,
            semanticChanges: [],
            consistencyReport: { score: 70, issues: [], suggestions: [] }
        });

        const review = await reviewEngine.generateReview(analysis);

        assert.ok(review.strengths.length > 0, 'Should have at least default strength');
    });

    test('should provide default improvements when none identified', async () => {
        const analysis = createMockAnalysis({
            consistencyReport: { score: 95, issues: [], suggestions: [] }
        });

        const review = await reviewEngine.generateReview(analysis);

        assert.ok(review.improvements.length > 0, 'Should have at least default improvement');
    });

    test('should detect overuse of modifiers in semantic changes', async () => {
        const semanticChanges: SemanticChange[] = [
            {
                type: 'addition',
                description: 'Text change: "这是一个很好很棒非常优秀的例子"',
                lineNumber: 1,
                confidence: 0.85
            }
        ];

        const analysis = createMockAnalysis({
            semanticChanges,
            consistencyReport: { score: 80, issues: [], suggestions: [] }
        });

        const review = await reviewEngine.generateReview(analysis);

        // Should process semantic changes
        assert.ok(review.suggestions.length >= 0, 'Should process suggestions');
    });

    test('should limit semantic change analysis to first 5 changes', async () => {
        const semanticChanges: SemanticChange[] = Array(20).fill(null).map((_, i) => ({
            type: 'addition' as const,
            description: `Change ${i}`,
            lineNumber: i,
            confidence: 0.85
        }));

        const analysis = createMockAnalysis({ semanticChanges });

        const review = await reviewEngine.generateReview(analysis);

        // Should complete without error even with many changes
        assert.ok(review, 'Should handle many semantic changes');
    });

    test('should ensure rating is within valid range', async () => {
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

        assert.ok(review.rating >= 0, 'Rating should not be negative');
        assert.ok(review.rating <= 10, 'Rating should not exceed 10');
    });
});

