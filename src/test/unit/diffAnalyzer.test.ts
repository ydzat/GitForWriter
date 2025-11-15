import { expect } from 'chai';
import { DiffAnalyzer } from '../../ai/diff/diffAnalyzer';
import { ConfigManager } from '../../config/configManager';
import { SecretManager } from '../../config/secretManager';

describe('DiffAnalyzer Unit Tests', () => {
    let diffAnalyzer: DiffAnalyzer;
    let mockConfigManager: ConfigManager;
    let mockSecretManager: SecretManager;

    beforeEach(() => {
        // Create mock ConfigManager
        mockConfigManager = {
            getConfig: () => ({
                provider: 'openai',
                openai: { model: 'gpt-4' },
                claude: { model: 'claude-3-sonnet' },
                local: { endpoint: 'http://localhost:11434', model: 'llama2' }
            }),
            getPerformanceConfig: () => ({
                debounceDelay: 2000,
                enableCache: true,
                cacheTTL: 3600000,
                cacheMaxSize: 104857600
            })
        } as any;

        // Create mock SecretManager that returns no API keys (forces fallback)
        mockSecretManager = {
            getOpenAIKey: async () => undefined,
            getClaudeKey: async () => undefined
        } as any;

        diffAnalyzer = new DiffAnalyzer(mockConfigManager, mockSecretManager);
    });

    describe('analyze()', () => {
        it('should analyze simple addition', async () => {
            const diff = `@@ -1,0 +1,1 @@
+This is a new line`;
            const content = 'This is a new line';

            const analysis = await diffAnalyzer.analyze(diff, content);

            expect(analysis.additions).to.equal(1);
            expect(analysis.deletions).to.equal(0);
            expect(analysis.summary).to.include('添加');
        });

        it('should analyze simple deletion', async () => {
            const diff = `@@ -1,1 +1,0 @@
-This line was removed`;
            const content = '';

            const analysis = await diffAnalyzer.analyze(diff, content);

            expect(analysis.additions).to.equal(0);
            expect(analysis.deletions).to.equal(1);
            expect(analysis.summary).to.include('删除');
        });

        it('should analyze modifications', async () => {
            const diff = `@@ -1,2 +1,2 @@
-Old line 1
-Old line 2
+New line 1
+New line 2`;
            const content = 'New line 1\nNew line 2';

            const analysis = await diffAnalyzer.analyze(diff, content);

            expect(analysis.additions).to.equal(2);
            expect(analysis.deletions).to.equal(2);
            expect(analysis.modifications).to.equal(2);
        });

        it('should detect heading changes', async () => {
            const diff = `@@ -1,0 +1,1 @@
+# New Heading`;
            const content = '# New Heading';

            const analysis = await diffAnalyzer.analyze(diff, content);

            const hasHeadingChange = analysis.semanticChanges.some(c => 
                c.description.includes('Heading')
            );
            expect(hasHeadingChange).to.be.true;
        });

        it('should generate consistency report', async () => {
            const diff = `@@ -1,0 +1,3 @@
+# Introduction
+This is a paragraph with some content.
+Another paragraph here.`;
            const content = '# Introduction\nThis is a paragraph with some content.\nAnother paragraph here.';

            const analysis = await diffAnalyzer.analyze(diff, content);

            expect(analysis.consistencyReport).to.exist;
            expect(analysis.consistencyReport.score).to.be.a('number');
            expect(analysis.consistencyReport.score).to.be.at.least(0);
            expect(analysis.consistencyReport.score).to.be.at.most(100);
            expect(analysis.consistencyReport.issues).to.be.an('array');
            expect(analysis.consistencyReport.suggestions).to.be.an('array');
        });

        it('should handle empty diff', async () => {
            const diff = '';
            const content = 'Some content';

            const analysis = await diffAnalyzer.analyze(diff, content);

            expect(analysis.additions).to.equal(0);
            expect(analysis.deletions).to.equal(0);
            expect(analysis.summary).to.exist;
        });
    });

    describe('quickAnalyze()', () => {
        it('should perform quick analysis', async () => {
            const diff = `@@ -1,2 +1,3 @@
-Old line
+New line 1
+New line 2`;

            const result = await diffAnalyzer.quickAnalyze(diff);

            expect(result.summary).to.exist;
            expect(result.summary).to.include('+2');
            expect(result.summary).to.include('-1');
            expect(result.lineCount).to.equal(3);
        });

        it('should handle empty diff in quick analysis', async () => {
            const diff = '';

            const result = await diffAnalyzer.quickAnalyze(diff);

            expect(result.summary).to.include('+0');
            expect(result.summary).to.include('-0');
            expect(result.lineCount).to.equal(0);
        });
    });

    describe('semantic change detection', () => {
        it('should detect list items', async () => {
            const diff = `@@ -1,0 +1,2 @@
+- Item 1
+- Item 2`;
            const content = '- Item 1\n- Item 2';

            const analysis = await diffAnalyzer.analyze(diff, content);

            const listChanges = analysis.semanticChanges.filter(c => 
                c.description.includes('Bullet') || c.description.includes('List')
            );
            expect(listChanges.length).to.be.greaterThan(0);
        });

        it('should assign confidence scores', async () => {
            const diff = `@@ -1,0 +1,1 @@
+This is a new paragraph.`;
            const content = 'This is a new paragraph.';

            const analysis = await diffAnalyzer.analyze(diff, content);

            expect(analysis.semanticChanges.length).to.be.greaterThan(0);
            analysis.semanticChanges.forEach(change => {
                expect(change.confidence).to.be.at.least(0);
                expect(change.confidence).to.be.at.most(1);
            });
        });
    });

    describe('consistency report', () => {
        it('should detect long sentences', async () => {
            const longSentence = 'This is a very long sentence that contains more than thirty words and should be detected by the consistency checker as a potential issue that might affect readability and comprehension of the text.';
            const diff = `@@ -1,0 +1,1 @@
+${longSentence}`;
            const content = longSentence.repeat(5);

            const analysis = await diffAnalyzer.analyze(diff, content);

            expect(analysis.consistencyReport).to.exist;
            expect(analysis.consistencyReport.score).to.be.a('number');
        });

        it('should provide suggestions', async () => {
            const diff = `@@ -1,0 +1,5 @@
+# Heading
+Short.
+Text.
+More.
+End.`;
            const content = '# Heading\nShort.\nText.\nMore.\nEnd.';

            const analysis = await diffAnalyzer.analyze(diff, content);

            expect(analysis.consistencyReport.suggestions).to.be.an('array');
        });
    });
});

