import * as assert from 'assert';
import { DiffAnalyzer } from '../../ai/diff/diffAnalyzer';

suite('DiffAnalyzer Test Suite', () => {
    let diffAnalyzer: DiffAnalyzer;

    setup(() => {
        diffAnalyzer = new DiffAnalyzer();
    });

    test('should analyze simple addition', async () => {
        const diff = `@@ -1,0 +1,1 @@
+This is a new line`;
        const content = 'This is a new line';

        const analysis = await diffAnalyzer.analyze(diff, content);

        assert.strictEqual(analysis.additions, 1, 'Should detect 1 addition');
        assert.strictEqual(analysis.deletions, 0, 'Should detect 0 deletions');
        assert.ok(analysis.summary.includes('添加'), 'Summary should mention addition');
    });

    test('should analyze simple deletion', async () => {
        const diff = `@@ -1,1 +1,0 @@
-This line was removed`;
        const content = '';

        const analysis = await diffAnalyzer.analyze(diff, content);

        assert.strictEqual(analysis.additions, 0, 'Should detect 0 additions');
        assert.strictEqual(analysis.deletions, 1, 'Should detect 1 deletion');
        assert.ok(analysis.summary.includes('删除'), 'Summary should mention deletion');
    });

    test('should analyze modifications', async () => {
        const diff = `@@ -1,2 +1,2 @@
-Old line 1
-Old line 2
+New line 1
+New line 2`;
        const content = 'New line 1\nNew line 2';

        const analysis = await diffAnalyzer.analyze(diff, content);

        assert.strictEqual(analysis.additions, 2, 'Should detect 2 additions');
        assert.strictEqual(analysis.deletions, 2, 'Should detect 2 deletions');
        assert.strictEqual(analysis.modifications, 2, 'Should detect 2 modifications');
    });

    test('should detect heading changes', async () => {
        const diff = `@@ -1,0 +1,1 @@
+# New Heading`;
        const content = '# New Heading';

        const analysis = await diffAnalyzer.analyze(diff, content);

        assert.ok(
            analysis.semanticChanges.some(c => c.description.includes('Heading')),
            'Should detect heading change'
        );
    });

    test('should detect list item changes', async () => {
        const diff = `@@ -1,0 +1,2 @@
+- Item 1
+- Item 2`;
        const content = '- Item 1\n- Item 2';

        const analysis = await diffAnalyzer.analyze(diff, content);

        const listChanges = analysis.semanticChanges.filter(c => 
            c.description.includes('Bullet') || c.description.includes('List')
        );
        assert.ok(listChanges.length > 0, 'Should detect list item changes');
    });

    test('should generate consistency report', async () => {
        const diff = `@@ -1,0 +1,3 @@
+# Introduction
+This is a paragraph with some content.
+Another paragraph here.`;
        const content = '# Introduction\nThis is a paragraph with some content.\nAnother paragraph here.';

        const analysis = await diffAnalyzer.analyze(diff, content);

        assert.ok(analysis.consistencyReport, 'Should have consistency report');
        assert.ok(typeof analysis.consistencyReport.score === 'number', 'Score should be a number');
        assert.ok(analysis.consistencyReport.score >= 0, 'Score should be >= 0');
        assert.ok(analysis.consistencyReport.score <= 100, 'Score should be <= 100');
        assert.ok(Array.isArray(analysis.consistencyReport.issues), 'Issues should be an array');
        assert.ok(Array.isArray(analysis.consistencyReport.suggestions), 'Suggestions should be an array');
    });

    test('should perform quick analysis', async () => {
        const diff = `@@ -1,2 +1,3 @@
-Old line
+New line 1
+New line 2`;

        const result = await diffAnalyzer.quickAnalyze(diff);

        assert.ok(result.summary, 'Should have summary');
        assert.ok(result.summary.includes('+2'), 'Should show 2 additions');
        assert.ok(result.summary.includes('-1'), 'Should show 1 deletion');
        assert.strictEqual(result.lineCount, 3, 'Line count should be 3');
    });

    test('should handle empty diff', async () => {
        const diff = '';
        const content = 'Some content';

        const analysis = await diffAnalyzer.analyze(diff, content);

        assert.strictEqual(analysis.additions, 0, 'Should have 0 additions');
        assert.strictEqual(analysis.deletions, 0, 'Should have 0 deletions');
        assert.ok(analysis.summary, 'Should have a summary');
    });

    test('should detect semantic changes with confidence', async () => {
        const diff = `@@ -1,0 +1,1 @@
+This is a new paragraph with meaningful content.`;
        const content = 'This is a new paragraph with meaningful content.';

        const analysis = await diffAnalyzer.analyze(diff, content);

        assert.ok(analysis.semanticChanges.length > 0, 'Should have semantic changes');
        analysis.semanticChanges.forEach(change => {
            assert.ok(change.confidence >= 0, 'Confidence should be >= 0');
            assert.ok(change.confidence <= 1, 'Confidence should be <= 1');
            assert.ok(change.type, 'Should have type');
            assert.ok(change.description, 'Should have description');
        });
    });

    test('should handle complex diff with multiple sections', async () => {
        const diff = `@@ -1,3 +1,2 @@
 # Title
-Old paragraph
+New paragraph
 
@@ -10,2 +9,3 @@
 Some text
+Added line 1
+Added line 2`;
        const content = '# Title\nNew paragraph\n\nSome text\nAdded line 1\nAdded line 2';

        const analysis = await diffAnalyzer.analyze(diff, content);

        assert.ok(analysis.additions > 0, 'Should detect additions');
        assert.ok(analysis.deletions > 0, 'Should detect deletions');
        assert.ok(analysis.semanticChanges.length > 0, 'Should have semantic changes');
    });

    test('should detect long sentences in consistency report', async () => {
        const longSentence = 'This is a very long sentence that contains more than thirty words and should be detected by the consistency checker as a potential issue that might affect readability and comprehension of the text.';
        const diff = `@@ -1,0 +1,1 @@
+${longSentence}`;
        const content = longSentence.repeat(5); // Multiple long sentences

        const analysis = await diffAnalyzer.analyze(diff, content);

        // The consistency report might flag long sentences
        assert.ok(analysis.consistencyReport, 'Should have consistency report');
    });

    test('should provide suggestions in consistency report', async () => {
        const diff = `@@ -1,0 +1,5 @@
+# Heading
+Short.
+Text.
+More.
+End.`;
        const content = '# Heading\nShort.\nText.\nMore.\nEnd.';

        const analysis = await diffAnalyzer.analyze(diff, content);

        assert.ok(Array.isArray(analysis.consistencyReport.suggestions), 'Should have suggestions array');
    });

    test('should track line numbers correctly', async () => {
        const diff = `@@ -1,0 +1,3 @@
+Line 1
+Line 2
+Line 3`;
        const content = 'Line 1\nLine 2\nLine 3';

        const analysis = await diffAnalyzer.analyze(diff, content);

        analysis.semanticChanges.forEach(change => {
            assert.ok(typeof change.lineNumber === 'number', 'Line number should be a number');
        });
    });
});

