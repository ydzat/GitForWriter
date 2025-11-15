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
        const config = vscode.workspace.getConfiguration('gitforwriter');
        try {
            await config.update('latex.template', 'academic', vscode.ConfigurationTarget.WorkspaceFolder);

            const outputPath = await exportManager.export(testDocument, 'latex');
            const content = fs.readFileSync(outputPath, 'utf-8');

            // Academic template should have specific packages
            assert.ok(content.includes('\\usepackage{amsmath,amssymb,amsthm}'), 'Should include amsmath, amssymb, and amsthm packages');
            assert.ok(content.includes('\\usepackage{cite}'), 'Should include cite package');
            assert.ok(content.includes('\\usepackage{graphicx}'), 'Should include graphicx package');
            // Note: abstract is now commented out by default
        } finally {
            // Always reset, even if test fails
            await config.update('latex.template', 'default', vscode.ConfigurationTarget.WorkspaceFolder);
        }
    });

    test('should use book template when configured', async () => {
        const config = vscode.workspace.getConfiguration('gitforwriter');
        try {
            await config.update('latex.template', 'book', vscode.ConfigurationTarget.WorkspaceFolder);

            const outputPath = await exportManager.export(testDocument, 'latex');
            const content = fs.readFileSync(outputPath, 'utf-8');

            // Book template should use book document class
            assert.ok(content.includes('\\documentclass'), 'Should have document class');
            assert.ok(content.includes('book'), 'Should use book class');
            assert.ok(content.includes('\\frontmatter') || content.includes('\\mainmatter'), 'Should have book structure');
        } finally {
            await config.update('latex.template', 'default', vscode.ConfigurationTarget.WorkspaceFolder);
        }
    });

    test('should use article template when configured', async () => {
        const config = vscode.workspace.getConfiguration('gitforwriter');
        try {
            await config.update('latex.template', 'article', vscode.ConfigurationTarget.WorkspaceFolder);

            const outputPath = await exportManager.export(testDocument, 'latex');
            const content = fs.readFileSync(outputPath, 'utf-8');

            // Article template should be simpler
            assert.ok(content.includes('\\documentclass'), 'Should have document class');
            assert.ok(content.includes('article'), 'Should use article class');
        } finally {
            await config.update('latex.template', 'default', vscode.ConfigurationTarget.WorkspaceFolder);
        }
    });

    test('should fallback to default template if template file not found', async () => {
        const config = vscode.workspace.getConfiguration('gitforwriter');
        try {
            // Use a non-existent template name to test fallback behavior.
            // Type assertion is intentional to bypass enum restriction for this test.
            await config.update('latex.template', 'nonexistent_template_xyz' as any, vscode.ConfigurationTarget.WorkspaceFolder);

            const outputPath = await exportManager.export(testDocument, 'latex');
            const content = fs.readFileSync(outputPath, 'utf-8');

            // Should fallback to default template and still generate valid LaTeX
            assert.ok(content.includes('\\documentclass'), 'Should have document class');
            assert.ok(content.includes('\\begin{document}'), 'Should have document begin');
            assert.ok(content.includes('\\end{document}'), 'Should have document end');
        } finally {
            // Always reset to default
            await config.update('latex.template', 'default', vscode.ConfigurationTarget.WorkspaceFolder);
        }
    });

    // Enhanced LaTeX Conversion Tests (Issue #15)
    suite('Enhanced Markdown to LaTeX Conversion', () => {
        test('should convert markdown tables to latex tabular', async () => {
            const testFilePath = path.join(testWorkspace, 'table.md');
            const content = `# Document with Table

| Name | Age | City |
|------|-----|------|
| Alice | 30 | New York |
| Bob | 25 | London |`;
            fs.writeFileSync(testFilePath, content);

            const doc = await vscode.workspace.openTextDocument(testFilePath);
            const outputPath = await exportManager.export(doc, 'latex');
            const latexContent = fs.readFileSync(outputPath, 'utf-8');

            assert.ok(latexContent.includes('\\begin{table}'), 'Should have table environment');
            assert.ok(latexContent.includes('\\begin{tabular}'), 'Should have tabular environment');
            assert.ok(latexContent.includes('\\hline'), 'Should have horizontal lines');
            assert.ok(latexContent.includes('Name & Age & City'), 'Should convert table header');
            assert.ok(latexContent.includes('Alice & 30 & New York'), 'Should convert table data');
        });

        test('should convert code blocks with syntax highlighting', async () => {
            const testFilePath = path.join(testWorkspace, 'code.md');
            const content = `# Code Example

\`\`\`javascript
function hello() {
    console.log("Hello");
}
\`\`\``;
            fs.writeFileSync(testFilePath, content);

            const doc = await vscode.workspace.openTextDocument(testFilePath);
            const outputPath = await exportManager.export(doc, 'latex');
            const latexContent = fs.readFileSync(outputPath, 'utf-8');

            assert.ok(latexContent.includes('\\begin{lstlisting}'), 'Should use lstlisting for code');
            assert.ok(latexContent.includes('[language=JavaScript]'), 'Should specify language');
        });

        test('should convert images to includegraphics', async () => {
            const testFilePath = path.join(testWorkspace, 'images.md');
            const content = `# Document with Images

![Sample Image](./images/sample.png)

![Image with Caption](./image.jpg "This is a caption")`;
            fs.writeFileSync(testFilePath, content);

            const doc = await vscode.workspace.openTextDocument(testFilePath);
            const outputPath = await exportManager.export(doc, 'latex');
            const latexContent = fs.readFileSync(outputPath, 'utf-8');

            assert.ok(latexContent.includes('\\begin{figure}'), 'Should have figure environment');
            assert.ok(latexContent.includes('\\includegraphics'), 'Should use includegraphics');
            assert.ok(latexContent.includes('\\caption{This is a caption}'), 'Should include caption');
        });

        test('should convert footnotes', async () => {
            const testFilePath = path.join(testWorkspace, 'footnotes.md');
            const content = `# Document with Footnotes

This is a sentence with a footnote[^1].

[^1]: This is the footnote text.`;
            fs.writeFileSync(testFilePath, content);

            const doc = await vscode.workspace.openTextDocument(testFilePath);
            const outputPath = await exportManager.export(doc, 'latex');
            const latexContent = fs.readFileSync(outputPath, 'utf-8');

            assert.ok(latexContent.includes('\\footnote{This is the footnote text.}'), 'Should convert footnote');
        });

        test('should convert inline math equations', async () => {
            const testFilePath = path.join(testWorkspace, 'math-inline.md');
            const content = `# Math Document

The equation is $E = mc^2$.`;
            fs.writeFileSync(testFilePath, content);

            const doc = await vscode.workspace.openTextDocument(testFilePath);
            const outputPath = await exportManager.export(doc, 'latex');
            const latexContent = fs.readFileSync(outputPath, 'utf-8');

            assert.ok(latexContent.includes('$E = mc^2$'), 'Should preserve inline math');
        });

        test('should convert display math equations', async () => {
            const testFilePath = path.join(testWorkspace, 'math-display.md');
            const content = `# Math Document

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$`;
            fs.writeFileSync(testFilePath, content);

            const doc = await vscode.workspace.openTextDocument(testFilePath);
            const outputPath = await exportManager.export(doc, 'latex');
            const latexContent = fs.readFileSync(outputPath, 'utf-8');

            assert.ok(latexContent.includes('\\['), 'Should use display math environment');
            assert.ok(latexContent.includes('\\int_{-\\infty}^{\\infty}'), 'Should preserve math content');
        });

        test('should convert citations', async () => {
            const testFilePath = path.join(testWorkspace, 'citations.md');
            const content = `# Research Paper

According to Smith [@smith2020], this is important.

Multiple sources [@jones2019; @brown2021] agree.`;
            fs.writeFileSync(testFilePath, content);

            const doc = await vscode.workspace.openTextDocument(testFilePath);
            const outputPath = await exportManager.export(doc, 'latex');
            const latexContent = fs.readFileSync(outputPath, 'utf-8');

            assert.ok(latexContent.includes('\\cite{smith2020}'), 'Should convert single citation');
            assert.ok(latexContent.includes('\\cite{jones2019,brown2021}'), 'Should convert multiple citations');
        });

        test('should preserve raw LaTeX blocks', async () => {
            const testFilePath = path.join(testWorkspace, 'raw-latex.md');
            const content = `# Document with Raw LaTeX

\\begin{theorem}
This is a theorem.
\\end{theorem}

Regular text here.`;
            fs.writeFileSync(testFilePath, content);

            const doc = await vscode.workspace.openTextDocument(testFilePath);
            const outputPath = await exportManager.export(doc, 'latex');
            const latexContent = fs.readFileSync(outputPath, 'utf-8');

            assert.ok(latexContent.includes('\\begin{theorem}'), 'Should preserve LaTeX environment');
            assert.ok(latexContent.includes('\\end{theorem}'), 'Should preserve LaTeX end');
        });

        test('should convert blockquotes', async () => {
            const testFilePath = path.join(testWorkspace, 'blockquotes.md');
            const content = `# Document with Quotes

> This is a quote.
> It spans multiple lines.`;
            fs.writeFileSync(testFilePath, content);

            const doc = await vscode.workspace.openTextDocument(testFilePath);
            const outputPath = await exportManager.export(doc, 'latex');
            const latexContent = fs.readFileSync(outputPath, 'utf-8');

            assert.ok(latexContent.includes('\\begin{quote}'), 'Should convert blockquotes to quote environment');
        });

        test('should convert horizontal rules', async () => {
            const testFilePath = path.join(testWorkspace, 'hrules.md');
            const content = `# Document

Section 1

---

Section 2`;
            fs.writeFileSync(testFilePath, content);

            const doc = await vscode.workspace.openTextDocument(testFilePath);
            const outputPath = await exportManager.export(doc, 'latex');
            const latexContent = fs.readFileSync(outputPath, 'utf-8');

            assert.ok(latexContent.includes('\\hrule'), 'Should convert horizontal rules');
        });

        test('should handle complex documents with mixed content', async () => {
            const testFilePath = path.join(testWorkspace, 'complex.md');
            const content = `# Complex Document

## Introduction

This document has **bold** and *italic* text, plus \`inline code\`.

### Table

| Feature | Status |
|---------|--------|
| Tables | ✓ |
| Code | ✓ |

### Code Example

\`\`\`python
def hello():
    print("Hello")
\`\`\`

### Math

The formula is $E = mc^2$.

### Footnote

This has a note[^1].

[^1]: The note text.`;
            fs.writeFileSync(testFilePath, content);

            const doc = await vscode.workspace.openTextDocument(testFilePath);
            const outputPath = await exportManager.export(doc, 'latex');
            const latexContent = fs.readFileSync(outputPath, 'utf-8');

            // Verify all features are present
            assert.ok(latexContent.includes('\\section{Complex Document}'), 'Should have sections');
            assert.ok(latexContent.includes('\\textbf{bold}'), 'Should have bold');
            assert.ok(latexContent.includes('\\textit{italic}'), 'Should have italic');
            assert.ok(latexContent.includes('\\texttt{inline code}'), 'Should have inline code');
            assert.ok(latexContent.includes('\\begin{table}'), 'Should have tables');
            assert.ok(latexContent.includes('\\begin{lstlisting}'), 'Should have code blocks');
            assert.ok(latexContent.includes('$E = mc^2$'), 'Should have math');
            assert.ok(latexContent.includes('\\footnote'), 'Should have footnotes');
        });
    });

    suite('Special Character Escaping', () => {
        test('should escape special characters in headings', async () => {
            const testFilePath = path.join(testWorkspace, 'special-heading.md');
            const content = '# Cost & Analysis: $100 #1';
            fs.writeFileSync(testFilePath, content);

            const doc = await vscode.workspace.openTextDocument(testFilePath);
            const outputPath = await exportManager.export(doc, 'latex');
            const latexContent = fs.readFileSync(outputPath, 'utf-8');

            assert.ok(latexContent.includes('Cost \\& Analysis: \\$100 \\#1'), 'Should escape special chars in heading');
        });

        test('should escape special characters in table cells', async () => {
            const testFilePath = path.join(testWorkspace, 'special-table.md');
            const content = `| Name | Cost |
|------|------|
| Item #1 | $50 & tax |`;
            fs.writeFileSync(testFilePath, content);

            const doc = await vscode.workspace.openTextDocument(testFilePath);
            const outputPath = await exportManager.export(doc, 'latex');
            const latexContent = fs.readFileSync(outputPath, 'utf-8');

            assert.ok(latexContent.includes('Item \\#1'), 'Should escape # in table');
            assert.ok(latexContent.includes('\\$50 \\& tax'), 'Should escape $ and & in table');
        });

        test('should escape special characters in footnotes', async () => {
            const testFilePath = path.join(testWorkspace, 'special-footnote.md');
            const content = `Text with footnote[^1]

[^1]: Cost is $100 & includes 20% tax`;
            fs.writeFileSync(testFilePath, content);

            const doc = await vscode.workspace.openTextDocument(testFilePath);
            const outputPath = await exportManager.export(doc, 'latex');
            const latexContent = fs.readFileSync(outputPath, 'utf-8');

            assert.ok(latexContent.includes('\\footnote{Cost is \\$100 \\& includes 20\\% tax}'), 'Should escape special chars in footnote');
        });

        test('should escape special characters in image captions', async () => {
            const testFilePath = path.join(testWorkspace, 'special-image.md');
            const content = '![Graph](image.png "Cost & Revenue: $1000")';
            fs.writeFileSync(testFilePath, content);

            const doc = await vscode.workspace.openTextDocument(testFilePath);
            const outputPath = await exportManager.export(doc, 'latex');
            const latexContent = fs.readFileSync(outputPath, 'utf-8');

            assert.ok(latexContent.includes('\\caption{Cost \\& Revenue: \\$1000}'), 'Should escape special chars in caption');
        });

        test('should escape special characters in bold and italic text', async () => {
            const testFilePath = path.join(testWorkspace, 'special-format.md');
            const content = '**Cost: $100** and *20% discount*';
            fs.writeFileSync(testFilePath, content);

            const doc = await vscode.workspace.openTextDocument(testFilePath);
            const outputPath = await exportManager.export(doc, 'latex');
            const latexContent = fs.readFileSync(outputPath, 'utf-8');

            assert.ok(latexContent.includes('\\textbf{Cost: \\$100}'), 'Should escape special chars in bold');
            assert.ok(latexContent.includes('\\textit{20\\% discount}'), 'Should escape special chars in italic');
        });

        test('should escape special characters in inline code', async () => {
            const testFilePath = path.join(testWorkspace, 'special-code.md');
            const content = 'Use `$variable` and `100%` in code';
            fs.writeFileSync(testFilePath, content);

            const doc = await vscode.workspace.openTextDocument(testFilePath);
            const outputPath = await exportManager.export(doc, 'latex');
            const latexContent = fs.readFileSync(outputPath, 'utf-8');

            assert.ok(latexContent.includes('\\texttt{\\$variable}'), 'Should escape $ in code');
            assert.ok(latexContent.includes('\\texttt{100\\%}'), 'Should escape % in code');
        });

        test('should escape special characters in link text', async () => {
            const testFilePath = path.join(testWorkspace, 'special-link.md');
            const content = '[Cost & Analysis](http://example.com)';
            fs.writeFileSync(testFilePath, content);

            const doc = await vscode.workspace.openTextDocument(testFilePath);
            const outputPath = await exportManager.export(doc, 'latex');
            const latexContent = fs.readFileSync(outputPath, 'utf-8');

            assert.ok(latexContent.includes('\\href{http://example.com}{Cost \\& Analysis}'), 'Should escape special chars in link text');
        });

        test('should handle backslash escaping correctly', async () => {
            const testFilePath = path.join(testWorkspace, 'special-backslash.md');
            const content = '# Path: C:\\\\Users\\\\Documents';
            fs.writeFileSync(testFilePath, content);

            const doc = await vscode.workspace.openTextDocument(testFilePath);
            const outputPath = await exportManager.export(doc, 'latex');
            const latexContent = fs.readFileSync(outputPath, 'utf-8');

            assert.ok(latexContent.includes('\\textbackslash{}'), 'Should escape backslashes');
        });

        test('should support footnotes with hyphens and underscores in IDs', async () => {
            const testFilePath = path.join(testWorkspace, 'footnote-ids.md');
            const content = `Text with footnote[^my-note] and another[^note_1].\n\n[^my-note]: First footnote\n[^note_1]: Second footnote`;
            fs.writeFileSync(testFilePath, content);

            const doc = await vscode.workspace.openTextDocument(testFilePath);
            const outputPath = await exportManager.export(doc, 'latex');
            const latexContent = fs.readFileSync(outputPath, 'utf-8');

            assert.ok(latexContent.includes('\\footnote{First footnote}'), 'Should convert footnote with hyphen');
            assert.ok(latexContent.includes('\\footnote{Second footnote}'), 'Should convert footnote with underscore');
        });

        test('should handle switching between list types', async () => {
            const testFilePath = path.join(testWorkspace, 'mixed-lists.md');
            const content = `- Unordered item 1\n- Unordered item 2\n1. Ordered item 1\n2. Ordered item 2`;
            fs.writeFileSync(testFilePath, content);

            const doc = await vscode.workspace.openTextDocument(testFilePath);
            const outputPath = await exportManager.export(doc, 'latex');
            const latexContent = fs.readFileSync(outputPath, 'utf-8');

            // Should have both itemize and enumerate environments
            assert.ok(latexContent.includes('\\begin{itemize}'), 'Should have itemize environment');
            assert.ok(latexContent.includes('\\end{itemize}'), 'Should close itemize environment');
            assert.ok(latexContent.includes('\\begin{enumerate}'), 'Should have enumerate environment');
            assert.ok(latexContent.includes('\\end{enumerate}'), 'Should close enumerate environment');

            // Verify order: itemize should come before enumerate
            const itemizeStart = latexContent.indexOf('\\begin{itemize}');
            const itemizeEnd = latexContent.indexOf('\\end{itemize}');
            const enumerateStart = latexContent.indexOf('\\begin{enumerate}');
            assert.ok(itemizeStart < itemizeEnd, 'itemize should be properly closed');
            assert.ok(itemizeEnd < enumerateStart, 'enumerate should start after itemize ends');
        });
    });
});

