import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { ExportManager } from '../../ai/export/exportManager';

suite('ExportManager Test Suite', () => {
    let exportManager: ExportManager;
    let testWorkspace: string;
    let testDocument: vscode.TextDocument;

    setup(async () => {
        exportManager = new ExportManager();
        
        // Create a temporary workspace
        testWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'gitforwriter-export-test-'));
        
        // Create a test markdown file
        const testFilePath = path.join(testWorkspace, 'test.md');
        const testContent = `# Test Document

This is a test paragraph with **bold** and *italic* text.

## Section 1

- Item 1
- Item 2
- Item 3

## Section 2

Some more content here.`;
        
        fs.writeFileSync(testFilePath, testContent);
        
        // Open the document in VSCode
        testDocument = await vscode.workspace.openTextDocument(testFilePath);
    });

    teardown(() => {
        // Clean up test workspace
        if (fs.existsSync(testWorkspace)) {
            fs.rmSync(testWorkspace, { recursive: true, force: true });
        }
    });

    test('should export to markdown format', async () => {
        const outputPath = await exportManager.export(testDocument, 'markdown');
        
        assert.ok(fs.existsSync(outputPath), 'Output file should exist');
        assert.ok(outputPath.endsWith('.md'), 'Output should be .md file');
        
        const content = fs.readFileSync(outputPath, 'utf-8');
        assert.ok(content.includes('# Test Document'), 'Should contain original content');
        assert.ok(content.includes('exported:'), 'Should contain export metadata');
        assert.ok(content.includes('GitForWriter'), 'Should mention GitForWriter');
    });

    test('should export to latex format from markdown', async () => {
        const outputPath = await exportManager.export(testDocument, 'latex');
        
        assert.ok(fs.existsSync(outputPath), 'Output file should exist');
        assert.ok(outputPath.endsWith('.tex'), 'Output should be .tex file');
        
        const content = fs.readFileSync(outputPath, 'utf-8');
        assert.ok(content.includes('\\documentclass'), 'Should have document class');
        assert.ok(content.includes('\\section'), 'Should convert headings to sections');
        assert.ok(content.includes('\\begin{document}'), 'Should have document begin');
        assert.ok(content.includes('\\end{document}'), 'Should have document end');
    });

    test('should create exports directory if not exists', async () => {
        const exportsDir = path.join(testWorkspace, 'exports');
        
        // Ensure it doesn't exist
        if (fs.existsSync(exportsDir)) {
            fs.rmSync(exportsDir, { recursive: true });
        }
        
        await exportManager.export(testDocument, 'markdown');
        
        assert.ok(fs.existsSync(exportsDir), 'Exports directory should be created');
    });

    test('should include timestamp in filename', async () => {
        const outputPath = await exportManager.export(testDocument, 'markdown');
        const filename = path.basename(outputPath);
        
        // Should contain date in format YYYY-MM-DD
        assert.ok(/\d{4}-\d{2}-\d{2}/.test(filename), 'Filename should contain timestamp');
    });

    test('should convert markdown bold to latex textbf', async () => {
        const outputPath = await exportManager.export(testDocument, 'latex');
        const content = fs.readFileSync(outputPath, 'utf-8');
        
        assert.ok(content.includes('\\textbf{bold}'), 'Should convert **bold** to \\textbf{bold}');
    });

    test('should convert markdown italic to latex textit', async () => {
        const outputPath = await exportManager.export(testDocument, 'latex');
        const content = fs.readFileSync(outputPath, 'utf-8');
        
        assert.ok(content.includes('\\textit{italic}'), 'Should convert *italic* to \\textit{italic}');
    });

    test('should convert markdown lists to latex itemize', async () => {
        const outputPath = await exportManager.export(testDocument, 'latex');
        const content = fs.readFileSync(outputPath, 'utf-8');
        
        assert.ok(content.includes('\\begin{itemize}'), 'Should have itemize begin');
        assert.ok(content.includes('\\end{itemize}'), 'Should have itemize end');
        assert.ok(content.includes('\\item'), 'Should have item commands');
    });

    test('should handle multiple heading levels', async () => {
        const testFilePath = path.join(testWorkspace, 'headings.md');
        const content = `# Level 1\n## Level 2\n### Level 3`;
        fs.writeFileSync(testFilePath, content);
        
        const doc = await vscode.workspace.openTextDocument(testFilePath);
        const outputPath = await exportManager.export(doc, 'latex');
        const latexContent = fs.readFileSync(outputPath, 'utf-8');
        
        assert.ok(latexContent.includes('\\section{Level 1}'), 'Should convert # to section');
        assert.ok(latexContent.includes('\\subsection{Level 2}'), 'Should convert ## to subsection');
        assert.ok(latexContent.includes('\\subsubsection{Level 3}'), 'Should convert ### to subsubsection');
    });

    test('should preserve latex content when exporting latex file', async () => {
        const testFilePath = path.join(testWorkspace, 'test.tex');
        const latexContent = `\\documentclass{article}
\\begin{document}
Test content
\\end{document}`;
        fs.writeFileSync(testFilePath, latexContent);
        
        const doc = await vscode.workspace.openTextDocument(testFilePath);
        const outputPath = await exportManager.export(doc, 'latex');
        const exportedContent = fs.readFileSync(outputPath, 'utf-8');
        
        assert.ok(exportedContent.includes('Test content'), 'Should preserve original latex content');
    });

    test('should wrap latex content if no documentclass', async () => {
        const testFilePath = path.join(testWorkspace, 'partial.tex');
        const partialLatex = 'Just some text without document structure';
        fs.writeFileSync(testFilePath, partialLatex);
        
        const doc = await vscode.workspace.openTextDocument(testFilePath);
        const outputPath = await exportManager.export(doc, 'latex');
        const exportedContent = fs.readFileSync(outputPath, 'utf-8');
        
        assert.ok(exportedContent.includes('\\documentclass'), 'Should add document class');
        assert.ok(exportedContent.includes('\\begin{document}'), 'Should add document begin');
        assert.ok(exportedContent.includes('\\end{document}'), 'Should add document end');
    });

    test('should throw error for unsupported format', async () => {
        await assert.rejects(
            async () => {
                await exportManager.export(testDocument, 'unsupported');
            },
            /Unsupported format/,
            'Should throw error for unsupported format'
        );
    });

    test('should handle empty document', async () => {
        const testFilePath = path.join(testWorkspace, 'empty.md');
        fs.writeFileSync(testFilePath, '');
        
        const doc = await vscode.workspace.openTextDocument(testFilePath);
        const outputPath = await exportManager.export(doc, 'markdown');
        
        assert.ok(fs.existsSync(outputPath), 'Should create output file even for empty document');
    });

    test('should convert markdown links to latex href', async () => {
        const testFilePath = path.join(testWorkspace, 'links.md');
        const content = '[Link Text](https://example.com)';
        fs.writeFileSync(testFilePath, content);
        
        const doc = await vscode.workspace.openTextDocument(testFilePath);
        const outputPath = await exportManager.export(doc, 'latex');
        const latexContent = fs.readFileSync(outputPath, 'utf-8');
        
        assert.ok(latexContent.includes('\\href{https://example.com}{Link Text}'), 'Should convert links to href');
    });

    test('should convert markdown code blocks to latex verbatim', async () => {
        const testFilePath = path.join(testWorkspace, 'code.md');
        const content = '```javascript\nconst x = 1;\n```';
        fs.writeFileSync(testFilePath, content);
        
        const doc = await vscode.workspace.openTextDocument(testFilePath);
        const outputPath = await exportManager.export(doc, 'latex');
        const latexContent = fs.readFileSync(outputPath, 'utf-8');
        
        assert.ok(latexContent.includes('\\begin{verbatim}'), 'Should use verbatim for code blocks');
        assert.ok(latexContent.includes('\\end{verbatim}'), 'Should close verbatim');
    });

    test('should convert inline code to latex texttt', async () => {
        const testFilePath = path.join(testWorkspace, 'inline-code.md');
        const content = 'This is `inline code` in text.';
        fs.writeFileSync(testFilePath, content);
        
        const doc = await vscode.workspace.openTextDocument(testFilePath);
        const outputPath = await exportManager.export(doc, 'latex');
        const latexContent = fs.readFileSync(outputPath, 'utf-8');
        
        assert.ok(latexContent.includes('\\texttt{inline code}'), 'Should convert inline code to texttt');
    });

    test('should handle pdf export attempt', async () => {
        // PDF export should throw an error but create a .tex file
        await assert.rejects(
            async () => {
                await exportManager.export(testDocument, 'pdf');
            },
            /PDF export requires|LaTeX/,
            'Should indicate PDF requires LaTeX or external tools'
        );

        // Check that a .tex file was created
        const exportsDir = path.join(testWorkspace, 'exports');
        const files = fs.readdirSync(exportsDir);
        const texFiles = files.filter(f => f.endsWith('.tex'));

        assert.ok(texFiles.length > 0, 'Should create .tex file when PDF export is attempted');
    });

    test('should use academic template when configured', async () => {
        // Set template configuration
        const config = vscode.workspace.getConfiguration('gitforwriter');
        await config.update('latex.template', 'academic', vscode.ConfigurationTarget.Global);

        const outputPath = await exportManager.export(testDocument, 'latex');
        const content = fs.readFileSync(outputPath, 'utf-8');

        // Academic template should have specific packages
        assert.ok(content.includes('\\usepackage{amsmath'), 'Should include amsmath package');
        assert.ok(content.includes('\\usepackage{cite}'), 'Should include cite package');
        assert.ok(content.includes('\\begin{abstract}'), 'Should have abstract environment');

        // Reset configuration
        await config.update('latex.template', 'default', vscode.ConfigurationTarget.Global);
    });

    test('should use book template when configured', async () => {
        const config = vscode.workspace.getConfiguration('gitforwriter');
        await config.update('latex.template', 'book', vscode.ConfigurationTarget.Global);

        const outputPath = await exportManager.export(testDocument, 'latex');
        const content = fs.readFileSync(outputPath, 'utf-8');

        // Book template should use book document class
        assert.ok(content.includes('\\documentclass'), 'Should have document class');
        assert.ok(content.includes('book'), 'Should use book class');
        assert.ok(content.includes('\\frontmatter') || content.includes('\\mainmatter'), 'Should have book structure');

        await config.update('latex.template', 'default', vscode.ConfigurationTarget.Global);
    });

    test('should use article template when configured', async () => {
        const config = vscode.workspace.getConfiguration('gitforwriter');
        await config.update('latex.template', 'article', vscode.ConfigurationTarget.Global);

        const outputPath = await exportManager.export(testDocument, 'latex');
        const content = fs.readFileSync(outputPath, 'utf-8');

        // Article template should be simpler
        assert.ok(content.includes('\\documentclass'), 'Should have document class');
        assert.ok(content.includes('article'), 'Should use article class');

        await config.update('latex.template', 'default', vscode.ConfigurationTarget.Global);
    });

    test('should fallback to default template if template file not found', async () => {
        const config = vscode.workspace.getConfiguration('gitforwriter');
        // Use a non-existent template name (will be handled by fallback)
        await config.update('latex.template', 'default', vscode.ConfigurationTarget.Global);

        const outputPath = await exportManager.export(testDocument, 'latex');
        const content = fs.readFileSync(outputPath, 'utf-8');

        // Should still generate valid LaTeX
        assert.ok(content.includes('\\documentclass'), 'Should have document class');
        assert.ok(content.includes('\\begin{document}'), 'Should have document begin');
        assert.ok(content.includes('\\end{document}'), 'Should have document end');
    });
});

