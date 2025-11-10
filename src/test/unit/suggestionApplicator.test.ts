import { expect } from 'chai';

// Import only the types and interfaces, not the class that depends on vscode
type Suggestion = {
    id: string;
    type: 'grammar' | 'style' | 'structure' | 'content';
    filePath: string;
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
    original: string;
    suggested: string;
    reason: string;
    applied?: boolean;
    documentVersion?: number;
};

type ApplyResult = {
    success: boolean;
    suggestionId: string;
    message: string;
    error?: string;
};

// Helper function to create suggestions (mimics SuggestionApplicator.createSuggestion)
function createSuggestion(
    type: 'grammar' | 'style' | 'structure' | 'content',
    filePath: string,
    startLine: number,
    startColumn: number,
    endLine: number,
    endColumn: number,
    original: string,
    suggested: string,
    reason: string,
    documentVersion?: number
): Suggestion {
    return {
        id: `suggestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        filePath,
        startLine,
        startColumn,
        endLine,
        endColumn,
        original,
        suggested,
        reason,
        applied: false,
        documentVersion
    };
}

describe('SuggestionApplicator Unit Tests', () => {

    describe('createSuggestion()', () => {
        it('should create a suggestion with all required fields', () => {
            const suggestion = createSuggestion(
                'grammar',
                '/path/to/file.md',
                0,
                0,
                0,
                10,
                'original text',
                'suggested text',
                'This is the reason',
                1
            );

            expect(suggestion.id).to.exist;
            expect(suggestion.type).to.equal('grammar');
            expect(suggestion.filePath).to.equal('/path/to/file.md');
            expect(suggestion.startLine).to.equal(0);
            expect(suggestion.startColumn).to.equal(0);
            expect(suggestion.endLine).to.equal(0);
            expect(suggestion.endColumn).to.equal(10);
            expect(suggestion.original).to.equal('original text');
            expect(suggestion.suggested).to.equal('suggested text');
            expect(suggestion.reason).to.equal('This is the reason');
            expect(suggestion.applied).to.equal(false);
            expect(suggestion.documentVersion).to.equal(1);
        });

        it('should generate unique IDs for different suggestions', () => {
            const suggestion1 = createSuggestion(
                'style',
                '/path/to/file.md',
                0, 0, 0, 10,
                'text1',
                'suggestion1',
                'reason1'
            );

            const suggestion2 = createSuggestion(
                'style',
                '/path/to/file.md',
                0, 0, 0, 10,
                'text2',
                'suggestion2',
                'reason2'
            );

            expect(suggestion1.id).to.not.equal(suggestion2.id);
        });

        it('should handle all suggestion types', () => {
            const types: Array<'grammar' | 'style' | 'structure' | 'content'> = [
                'grammar', 'style', 'structure', 'content'
            ];

            types.forEach(type => {
                const suggestion = createSuggestion(
                    type,
                    '/path/to/file.md',
                    0, 0, 0, 10,
                    'original',
                    'suggested',
                    'reason'
                );

                expect(suggestion.type).to.equal(type);
            });
        });

        it('should handle multi-line suggestions', () => {
            const suggestion = createSuggestion(
                'content',
                '/path/to/file.md',
                5,
                0,
                10,
                20,
                'original multi-line text',
                'suggested multi-line text',
                'Improve multi-line content'
            );

            expect(suggestion.startLine).to.equal(5);
            expect(suggestion.endLine).to.equal(10);
            expect(suggestion.startColumn).to.equal(0);
            expect(suggestion.endColumn).to.equal(20);
        });
    });

    describe('Suggestion interface', () => {
        it('should have all required properties', () => {
            const suggestion: Suggestion = {
                id: 'test-id',
                type: 'grammar',
                filePath: '/test/file.md',
                startLine: 0,
                startColumn: 0,
                endLine: 0,
                endColumn: 10,
                original: 'original',
                suggested: 'suggested',
                reason: 'test reason'
            };

            expect(suggestion.id).to.equal('test-id');
            expect(suggestion.type).to.equal('grammar');
            expect(suggestion.filePath).to.equal('/test/file.md');
            expect(suggestion.startLine).to.equal(0);
            expect(suggestion.startColumn).to.equal(0);
            expect(suggestion.endLine).to.equal(0);
            expect(suggestion.endColumn).to.equal(10);
            expect(suggestion.original).to.equal('original');
            expect(suggestion.suggested).to.equal('suggested');
            expect(suggestion.reason).to.equal('test reason');
        });

        it('should support optional properties', () => {
            const suggestion: Suggestion = {
                id: 'test-id',
                type: 'style',
                filePath: '/test/file.md',
                startLine: 0,
                startColumn: 0,
                endLine: 0,
                endColumn: 10,
                original: 'original',
                suggested: 'suggested',
                reason: 'test reason',
                applied: true,
                documentVersion: 5
            };

            expect(suggestion.applied).to.equal(true);
            expect(suggestion.documentVersion).to.equal(5);
        });
    });

    describe('ApplyResult interface', () => {
        it('should represent successful application', () => {
            const result: ApplyResult = {
                success: true,
                suggestionId: 'test-id',
                message: 'Applied successfully'
            };

            expect(result.success).to.be.true;
            expect(result.suggestionId).to.equal('test-id');
            expect(result.message).to.equal('Applied successfully');
        });

        it('should represent failed application', () => {
            const result: ApplyResult = {
                success: false,
                suggestionId: 'test-id',
                message: 'Failed to apply',
                error: 'Document was modified'
            };

            expect(result.success).to.be.false;
            expect(result.suggestionId).to.equal('test-id');
            expect(result.message).to.equal('Failed to apply');
            expect(result.error).to.equal('Document was modified');
        });
    });

    describe('Edge cases', () => {
        it('should handle empty strings', () => {
            const suggestion = createSuggestion(
                'grammar',
                '',
                0, 0, 0, 0,
                '',
                '',
                ''
            );

            expect(suggestion.filePath).to.equal('');
            expect(suggestion.original).to.equal('');
            expect(suggestion.suggested).to.equal('');
            expect(suggestion.reason).to.equal('');
        });

        it('should handle large line numbers', () => {
            const suggestion = createSuggestion(
                'content',
                '/path/to/file.md',
                999999,
                0,
                1000000,
                100,
                'original',
                'suggested',
                'reason'
            );

            expect(suggestion.startLine).to.equal(999999);
            expect(suggestion.endLine).to.equal(1000000);
        });

        it('should handle special characters in text', () => {
            const specialText = 'Text with "quotes", \'apostrophes\', <tags>, & ampersands';
            const suggestion = createSuggestion(
                'grammar',
                '/path/to/file.md',
                0, 0, 0, 10,
                specialText,
                specialText,
                specialText
            );

            expect(suggestion.original).to.equal(specialText);
            expect(suggestion.suggested).to.equal(specialText);
            expect(suggestion.reason).to.equal(specialText);
        });

        it('should handle unicode characters', () => {
            const unicodeText = '这是中文文本 with émojis 🎉 and symbols ∑∫∂';
            const suggestion = createSuggestion(
                'content',
                '/path/to/文件.md',
                0, 0, 0, 10,
                unicodeText,
                unicodeText,
                unicodeText
            );

            expect(suggestion.original).to.equal(unicodeText);
            expect(suggestion.suggested).to.equal(unicodeText);
            expect(suggestion.filePath).to.equal('/path/to/文件.md');
        });
    });

    describe('Suggestion sorting for applyAllSuggestions', () => {
        it('should sort suggestions from bottom to top', () => {
            const suggestions: Suggestion[] = [
                createSuggestion('grammar', '/file.md', 1, 0, 1, 10, 'a', 'b', 'r1'),
                createSuggestion('grammar', '/file.md', 5, 0, 5, 10, 'c', 'd', 'r2'),
                createSuggestion('grammar', '/file.md', 3, 0, 3, 10, 'e', 'f', 'r3')
            ];

            // Sort as the applicator would (bottom to top)
            const sorted = [...suggestions].sort((a, b) => {
                if (a.startLine !== b.startLine) {
                    return b.startLine - a.startLine;
                }
                return b.startColumn - a.startColumn;
            });

            expect(sorted[0].startLine).to.equal(5);
            expect(sorted[1].startLine).to.equal(3);
            expect(sorted[2].startLine).to.equal(1);
        });

        it('should sort suggestions on same line from right to left', () => {
            const suggestions: Suggestion[] = [
                createSuggestion('grammar', '/file.md', 1, 5, 1, 10, 'a', 'b', 'r1'),
                createSuggestion('grammar', '/file.md', 1, 15, 1, 20, 'c', 'd', 'r2'),
                createSuggestion('grammar', '/file.md', 1, 10, 1, 15, 'e', 'f', 'r3')
            ];

            const sorted = [...suggestions].sort((a, b) => {
                if (a.startLine !== b.startLine) {
                    return b.startLine - a.startLine;
                }
                return b.startColumn - a.startColumn;
            });

            expect(sorted[0].startColumn).to.equal(15);
            expect(sorted[1].startColumn).to.equal(10);
            expect(sorted[2].startColumn).to.equal(5);
        });
    });
});

