import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ExportError } from '../../utils/errorHandler';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface LaTeXCompiler {
    name: string;
    command: string;
    available: boolean;
}

export interface CompilationOptions {
    compiler?: 'pdflatex' | 'xelatex' | 'lualatex';
    multiPass?: boolean;
    cleanAuxFiles?: boolean;
    openAfterCompile?: boolean;
}

export type TemplateType = 'default' | 'academic' | 'book' | 'article';

export class ExportManager {
    private availableCompilers: LaTeXCompiler[] = [];
    private compilersDetected: boolean = false;

    constructor() {
        // Compiler detection will be done lazily on first use
    }

    async export(document: vscode.TextDocument, format: string): Promise<string> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new ExportError('No workspace folder open', 'NO_WORKSPACE');
        }

        const outputDir = path.join(workspaceFolder.uri.fsPath, 'exports');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const fileName = path.basename(document.fileName, path.extname(document.fileName));
        const timestamp = new Date().toISOString().split('T')[0];

        let outputPath: string;
        const content = document.getText();

        switch (format) {
            case 'markdown':
                outputPath = path.join(outputDir, `${fileName}_${timestamp}.md`);
                await this.exportMarkdown(content, outputPath);
                break;

            case 'latex':
                outputPath = path.join(outputDir, `${fileName}_${timestamp}.tex`);
                await this.exportLatex(content, outputPath, document.languageId);
                break;

            case 'pdf':
                outputPath = path.join(outputDir, `${fileName}_${timestamp}.pdf`);
                await this.exportPdf(content, outputPath, document.languageId);
                break;

            default:
                throw new ExportError(
                    `Unsupported export format: ${format}`,
                    'UNSUPPORTED_FORMAT',
                    undefined,
                    { format }
                );
        }

        return outputPath;
    }

    private async exportMarkdown(content: string, outputPath: string): Promise<void> {
        // Add export metadata
        const metadata = `---
exported: ${new Date().toISOString()}
generator: GitForWriter
---

`;
        fs.writeFileSync(outputPath, metadata + content);
    }

    private async exportLatex(content: string, outputPath: string, languageId: string): Promise<void> {
        let latexContent: string;

        if (languageId === 'latex') {
            // Already LaTeX, just copy
            latexContent = content;
        } else {
            // Convert Markdown to LaTeX
            latexContent = this.convertMarkdownToLatex(content);
        }

        // Wrap in document if not already wrapped
        if (!latexContent.includes('\\documentclass')) {
            // Get template preference from configuration
            const config = vscode.workspace.getConfiguration('gitforwriter');
            const templateType = config.get<TemplateType>('latex.template', 'default');

            latexContent = this.applyTemplate(latexContent, outputPath, templateType);
        }

        fs.writeFileSync(outputPath, latexContent);
    }

    /**
     * Escape LaTeX special characters
     */
    private escapeLatex(text: string): string {
        return text
            .replace(/\\/g, '\\textbackslash{}')
            .replace(/[&%$#_{}]/g, '\\$&')
            .replace(/~/g, '\\textasciitilde{}')
            .replace(/\^/g, '\\textasciicircum{}');
    }

    /**
     * Apply a LaTeX template to content
     */
    private applyTemplate(content: string, outputPath: string, templateType: TemplateType): string {
        const rawTitle = path.basename(outputPath, '.tex').replace(/_/g, ' ');
        const title = this.escapeLatex(rawTitle);
        const date = new Date().toLocaleDateString();

        // Get author from configuration, default to 'Author' if not set
        const config = vscode.workspace.getConfiguration('gitforwriter');
        const rawAuthor = config.get<string>('latex.author', '') || 'Author';
        const author = this.escapeLatex(rawAuthor);

        if (templateType === 'default') {
            return `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{hyperref}

\\title{${title}}
\\author{${author}}
\\date{${date}}

\\begin{document}

\\maketitle

${content}

\\end{document}`;
        }

        // Try to load template from file
        const templatePath = path.join(__dirname, 'templates', `${templateType}.tex`);
        if (fs.existsSync(templatePath)) {
            let template = fs.readFileSync(templatePath, 'utf-8');

            // Replace placeholders
            template = template.replace(/\{\{TITLE\}\}/g, title);
            template = template.replace(/\{\{AUTHOR\}\}/g, author);
            template = template.replace(/\{\{DATE\}\}/g, date);
            template = template.replace(/\{\{CONTENT\}\}/g, content);

            return template;
        }

        // Fallback to default template
        return this.applyTemplate(content, outputPath, 'default');
    }

    private async exportPdf(content: string, outputPath: string, languageId: string): Promise<void> {
        // Generate LaTeX file first
        const texPath = outputPath.replace('.pdf', '.tex');
        await this.exportLatex(content, texPath, languageId);

        // Detect available compilers (lazy initialization)
        await this.detectLaTeXCompilers();

        // Check if LaTeX compiler is available
        if (this.availableCompilers.length === 0) {
            // No compiler found, show helpful message
            const selection = await vscode.window.showWarningMessage(
                'LaTeX not found. Install LaTeX to enable PDF export.',
                'Open LaTeX File',
                'Learn More'
            );

            // Handle user selection and wait for all UI operations to complete
            if (selection === 'Open LaTeX File') {
                const doc = await vscode.workspace.openTextDocument(texPath);
                await vscode.window.showTextDocument(doc);
            } else if (selection === 'Learn More') {
                // openExternal is fire-and-forget, but we can await it for consistency
                await vscode.env.openExternal(vscode.Uri.parse('https://www.latex-project.org/get/'));
            }

            // All UI operations complete, now throw the error
            throw new ExportError(
                'PDF export requires LaTeX installation. LaTeX file generated instead.',
                'LATEX_NOT_FOUND',
                undefined,
                { outputPath: texPath }
            );
        }

        // Get compilation options from configuration
        const config = vscode.workspace.getConfiguration('gitforwriter');
        const compilerName = config.get<string>('latex.compiler', 'pdflatex') as 'pdflatex' | 'xelatex' | 'lualatex';
        const multiPass = config.get<boolean>('latex.multiPass', true);
        const cleanAuxFiles = config.get<boolean>('latex.cleanAuxFiles', true);
        const openAfterCompile = config.get<boolean>('latex.openAfterCompile', true);

        const options: CompilationOptions = {
            compiler: compilerName,
            multiPass,
            cleanAuxFiles,
            openAfterCompile
        };

        // Compile PDF
        await this.compilePdf(texPath, outputPath, options);
    }

    private convertMarkdownToLatex(markdown: string): string {
        let latex = markdown;

        // Convert headings
        latex = latex.replace(/^# (.+)$/gm, '\\section{$1}');
        latex = latex.replace(/^## (.+)$/gm, '\\subsection{$1}');
        latex = latex.replace(/^### (.+)$/gm, '\\subsubsection{$1}');

        // Convert bold and italic
        latex = latex.replace(/\*\*(.+?)\*\*/g, '\\textbf{$1}');
        latex = latex.replace(/\*(.+?)\*/g, '\\textit{$1}');
        latex = latex.replace(/__(.+?)__/g, '\\textbf{$1}');
        latex = latex.replace(/_(.+?)_/g, '\\textit{$1}');

        // Convert code blocks
        latex = latex.replace(/```(\w+)?\n([\s\S]+?)```/g, (_, lang, code) => {
            return `\\begin{verbatim}\n${code}\\end{verbatim}`;
        });

        // Convert inline code
        latex = latex.replace(/`(.+?)`/g, '\\texttt{$1}');

        // Convert links
        latex = latex.replace(/\[(.+?)\]\((.+?)\)/g, '\\href{$2}{$1}');

        // Convert lists
        latex = latex.replace(/^\* (.+)$/gm, '\\item $1');
        latex = latex.replace(/^- (.+)$/gm, '\\item $1');
        
        // Wrap itemize blocks
        const lines = latex.split('\n');
        const result: string[] = [];
        let inList = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            const isListItem = trimmedLine.startsWith('\\item');
            const isEmptyLine = trimmedLine === '';

            if (isListItem && !inList) {
                // Starting a new list
                result.push('\\begin{itemize}');
                inList = true;
                result.push(line);
            } else if (!isListItem && !isEmptyLine && inList) {
                // Ending the list before adding non-list, non-empty line
                result.push('\\end{itemize}');
                inList = false;
                result.push(line);
            } else {
                // Continue in current state (including empty lines within lists)
                result.push(line);
            }
        }

        // Close any unclosed list at the end
        if (inList) {
            result.push('\\end{itemize}');
        }

        return result.join('\n');
    }

    /**
     * Detect available LaTeX compilers in system PATH
     * Only runs once, subsequent calls return immediately
     */
    private async detectLaTeXCompilers(): Promise<void> {
        // Skip if already detected
        if (this.compilersDetected) {
            return;
        }

        const compilers = [
            { name: 'pdflatex', command: 'pdflatex' },
            { name: 'xelatex', command: 'xelatex' },
            { name: 'lualatex', command: 'lualatex' }
        ];

        this.availableCompilers = [];

        for (const compiler of compilers) {
            try {
                // Check if compiler is available by running --version
                const { stdout } = await execFileAsync(compiler.command, ['--version']);
                if (stdout) {
                    this.availableCompilers.push({
                        name: compiler.name,
                        command: compiler.command,
                        available: true
                    });
                }
            } catch (error) {
                // Compiler not found, skip
            }
        }

        this.compilersDetected = true;
    }

    /**
     * Get the preferred compiler or the first available one
     */
    private getCompiler(preferredCompiler?: string): LaTeXCompiler | null {
        if (preferredCompiler) {
            const compiler = this.availableCompilers.find(c => c.name === preferredCompiler);
            if (compiler) {
                return compiler;
            }
            // Preferred compiler not found, warn user if falling back
            if (this.availableCompilers.length > 0) {
                vscode.window.showWarningMessage(
                    `Preferred LaTeX compiler '${preferredCompiler}' not found. Using '${this.availableCompilers[0].name}' instead.`
                );
            }
        }
        return this.availableCompilers[0] || null;
    }

    /**
     * Compile LaTeX file to PDF
     */
    private async compilePdf(texPath: string, pdfPath: string, options: CompilationOptions): Promise<void> {
        const compiler = this.getCompiler(options.compiler);
        if (!compiler) {
            throw new ExportError(
                `LaTeX compiler '${options.compiler}' not found`,
                'COMPILER_NOT_FOUND',
                undefined,
                { compiler: options.compiler }
            );
        }

        const workDir = path.dirname(texPath);
        const texFileName = path.basename(texPath);

        // Show progress
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Compiling PDF',
                cancellable: true
            },
            async (progress, token) => {
                try {
                    // Calculate progress increments to always total 100%
                    let firstPassIncrement, secondPassIncrement, finalPassIncrement, cleanIncrement, doneIncrement;

                    if (options.multiPass) {
                        // Three compilation passes
                        firstPassIncrement = 25;
                        secondPassIncrement = 25;
                        finalPassIncrement = 25;
                        cleanIncrement = options.cleanAuxFiles ? 15 : 0;
                        doneIncrement = 10;
                    } else {
                        // Single compilation pass
                        firstPassIncrement = options.cleanAuxFiles ? 70 : 85;
                        secondPassIncrement = 0;
                        finalPassIncrement = 0;
                        cleanIncrement = options.cleanAuxFiles ? 15 : 0;
                        doneIncrement = 15;
                    }

                    // First pass
                    progress.report({ message: 'Running first pass...', increment: firstPassIncrement });
                    await this.runLatexCompiler(compiler.command, texFileName, workDir, token);

                    // Multi-pass compilation for references
                    if (options.multiPass) {
                        progress.report({ message: 'Running second pass...', increment: secondPassIncrement });
                        await this.runLatexCompiler(compiler.command, texFileName, workDir, token);

                        progress.report({ message: 'Running final pass...', increment: finalPassIncrement });
                        await this.runLatexCompiler(compiler.command, texFileName, workDir, token);
                    }

                    // Clean auxiliary files
                    if (options.cleanAuxFiles) {
                        progress.report({ message: 'Cleaning auxiliary files...', increment: cleanIncrement });
                        await this.cleanAuxiliaryFiles(workDir, path.basename(texPath, '.tex'));
                    }

                    progress.report({ message: 'Done!', increment: doneIncrement });

                    // Check if PDF was created
                    const generatedPdfPath = path.join(workDir, path.basename(texPath, '.tex') + '.pdf');
                    if (!fs.existsSync(generatedPdfPath)) {
                        throw new ExportError(
                            'PDF file was not generated. Check LaTeX compilation errors.',
                            'PDF_NOT_GENERATED'
                        );
                    }

                    // Move PDF to desired location if different
                    if (generatedPdfPath !== pdfPath) {
                        // Use copy + unlink instead of rename for better cross-platform compatibility
                        fs.copyFileSync(generatedPdfPath, pdfPath);
                        fs.unlinkSync(generatedPdfPath);
                    }

                    // Open PDF after compilation
                    if (options.openAfterCompile) {
                        await vscode.env.openExternal(vscode.Uri.file(pdfPath));
                    }

                    vscode.window.showInformationMessage(`✅ PDF exported successfully: ${pdfPath}`);
                } catch (error) {
                    if (token.isCancellationRequested) {
                        throw new ExportError('PDF compilation cancelled by user', 'COMPILATION_CANCELLED');
                    }
                    throw error;
                }
            }
        );
    }

    /**
     * Run LaTeX compiler on a file
     */
    private async runLatexCompiler(
        compiler: string,
        texFileName: string,
        workDir: string,
        token?: vscode.CancellationToken
    ): Promise<void> {
        if (token?.isCancellationRequested) {
            throw new ExportError('Compilation cancelled', 'COMPILATION_CANCELLED');
        }

        try {
            // Run compiler with options:
            // -interaction=nonstopmode: don't stop on errors, continue to get full error log
            // -file-line-error: show file and line number in errors
            const args = ['-interaction=nonstopmode', '-file-line-error', texFileName];

            const { stderr } = await execFileAsync(compiler, args, {
                cwd: workDir,
                timeout: 60000 // 60 second timeout
            });

            // Check for errors in output (case-insensitive, and LaTeX error indicators)
            if (stderr) {
                const errorLines = stderr.split('\n');
                const hasLatexError = errorLines.some(line =>
                    line.trim().startsWith('!') ||
                    /error/i.test(line)
                );
                if (hasLatexError) {
                    throw new Error(stderr);
                }
            }
        } catch (error: any) {
            // Parse LaTeX error messages
            const errorMessage = this.parseLatexError(error.message || error.toString());
            throw new ExportError(
                `LaTeX compilation failed: ${errorMessage}`,
                'COMPILATION_ERROR',
                error,
                { compiler, texFileName }
            );
        }
    }

    /**
     * Parse LaTeX error messages to make them more user-friendly
     */
    private parseLatexError(errorOutput: string): string {
        // Extract the most relevant error message
        const lines = errorOutput.split('\n');

        // Look for common error patterns
        for (const line of lines) {
            if (line.includes('! LaTeX Error:')) {
                return line.replace('! LaTeX Error:', '').trim();
            }
            if (line.includes('! Undefined control sequence')) {
                return 'Undefined LaTeX command. Check your LaTeX syntax.';
            }
            if (line.includes('! Missing') || line.includes('! Extra')) {
                return line.replace('!', '').trim();
            }
        }

        // If no specific error found, return first non-empty line
        for (const line of lines) {
            if (line.trim() && !line.startsWith('This is')) {
                return line.trim();
            }
        }

        return 'Unknown LaTeX error. Check the .log file for details.';
    }

    /**
     * Clean auxiliary files generated by LaTeX compilation
     */
    private async cleanAuxiliaryFiles(workDir: string, baseName: string): Promise<void> {
        const extensions = ['.aux', '.log', '.out', '.toc', '.lof', '.lot', '.fls', '.fdb_latexmk', '.synctex.gz'];

        for (const ext of extensions) {
            const filePath = path.join(workDir, baseName + ext);
            if (fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                } catch (error) {
                    // Ignore errors when cleaning auxiliary files
                }
            }
        }
    }
}
