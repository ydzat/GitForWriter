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
    private detectionPromise: Promise<void> | null = null;

    // Static language mapping for code block syntax highlighting
    private static readonly LANGUAGE_MAP: { [key: string]: string } = {
        'js': 'JavaScript',
        'javascript': 'JavaScript',
        'ts': 'JavaScript',  // TypeScript uses JavaScript highlighting
        'typescript': 'JavaScript',
        'py': 'Python',
        'python': 'Python',
        'java': 'Java',
        'cpp': 'C++',
        'c++': 'C++',
        'c': 'C',
        'cs': '[Sharp]C',
        'csharp': '[Sharp]C',
        'c#': '[Sharp]C',
        'f#': 'ML',  // F# uses ML highlighting
        'fsharp': 'ML',
        'rb': 'Ruby',
        'ruby': 'Ruby',
        // NOTE: 'Go' and 'Rust' are not natively supported by LaTeX listings package.
        // If you use these languages, you must provide custom language definitions in the template preamble.
        'go': 'Go',
        'rust': 'Rust',
        'php': 'PHP',
        'sql': 'SQL',
        'bash': 'bash',
        'sh': 'bash',
        'html': 'HTML',
        'xml': 'XML',
        'json': 'JavaScript',  // JSON uses JavaScript highlighting
        'yaml': 'Python',  // YAML uses Python-like highlighting
        'yml': 'Python',
        'objective-c': 'Objective-C',
        'objc': 'Objective-C',
        'x86-64': 'Assembler',
        'assembly': 'Assembler'
    };

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
     * Process backslash first to avoid double-escaping
     */
    private escapeLatex(text: string): string {
        return text
            .replace(/\\/g, '\\textbackslash{}')  // Process backslash first
            .replace(/&/g, '\\&')
            .replace(/%/g, '\\%')
            .replace(/\$/g, '\\$')
            .replace(/#/g, '\\#')
            .replace(/_/g, '\\_')
            .replace(/{/g, '\\{')
            .replace(/}/g, '\\}')
            .replace(/~/g, '\\textasciitilde{}')
            .replace(/\^/g, '\\textasciicircum{}');
    }

    /**
     * Escape special LaTeX characters in URLs
     * Only escapes characters that break LaTeX, preserves URL structure
     * Does not escape : / ? = . which are part of URL syntax
     */
    private escapeUrl(url: string): string {
        return url
            .replace(/#/g, '\\#')
            .replace(/%/g, '\\%')
            .replace(/&/g, '\\&')
            .replace(/_/g, '\\_');
    }

    /**
     * Apply a LaTeX template to content
     */
    private applyTemplate(content: string, outputPath: string, templateType: TemplateType): string {
        const rawTitle = path.basename(outputPath, '.tex').replace(/_/g, ' ');
        const title = this.escapeLatex(rawTitle);
        const rawDate = new Date().toLocaleDateString();
        const date = this.escapeLatex(rawDate);

        // Get author from configuration, default to 'Author' if not set
        const config = vscode.workspace.getConfiguration('gitforwriter');
        const rawAuthor = config.get<string>('latex.author', '') || 'Author';
        const author = this.escapeLatex(rawAuthor);

        if (templateType === 'default') {
            return `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{hyperref}
\\usepackage{graphicx}
\\usepackage{amsmath}
\\usepackage{listings}
\\usepackage{xcolor}
\\usepackage{array}
\\usepackage{longtable}

% Listings configuration for code syntax highlighting
\\lstset{
    basicstyle=\\ttfamily\\small,
    breaklines=true,
    frame=single,
    numbers=left,
    numberstyle=\\tiny\\color{gray},
    keywordstyle=\\color{blue},
    commentstyle=\\color{green!60!black},
    stringstyle=\\color{red},
    showstringspaces=false,
    tabsize=4
}

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
        // Note: 'default' template is hardcoded above, so this recursion is safe
        // and will always terminate after one level
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

        // Validate compiler name
        const allowedCompilers = ['pdflatex', 'xelatex', 'lualatex'] as const;
        const compilerNameRaw = config.get<string>('latex.compiler', 'pdflatex');
        let compilerName: 'pdflatex' | 'xelatex' | 'lualatex';
        if (allowedCompilers.includes(compilerNameRaw as any)) {
            compilerName = compilerNameRaw as 'pdflatex' | 'xelatex' | 'lualatex';
        } else {
            vscode.window.showWarningMessage(
                `Invalid LaTeX compiler "${compilerNameRaw}" in settings. Falling back to "pdflatex".`
            );
            compilerName = 'pdflatex';
        }

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

        // Step 1: Protect raw LaTeX blocks (process first to avoid interference)
        const latexBlocks: string[] = [];
        latex = latex.replace(/\\begin\{(\w+)\}([\s\S]*?)\\end\{\1\}/g, (match) => {
            const placeholder = `__LATEX_BLOCK_${latexBlocks.length}__`;
            latexBlocks.push(match);
            return placeholder;
        });

        // Step 2: Convert math equations (before escaping special chars)
        // Display math: $$...$$
        latex = latex.replace(/\$\$([\s\S]+?)\$\$/g, (_, equation) => {
            return `\\[\n${equation.trim()}\n\\]`;
        });

        // Inline math: $...$
        latex = latex.replace(/\$(.+?)\$/g, (_, equation) => {
            return `$${equation}$`;  // Keep as-is for LaTeX
        });

        // Step 3: Convert footnotes
        // Collect footnote definitions (supports multi-line footnotes with indentation)
        // Supports alphanumeric IDs with hyphens and underscores (e.g., [^my-note], [^note_1])
        const footnotes: Map<string, string> = new Map();
        latex = latex.replace(/^\[\^([a-zA-Z0-9\-_]+)\]:\s*(.+(?:\n(?:    |\t).+)*)$/gm, (_, id, text) => {
            // Remove indentation from multi-line footnotes
            const cleanedText = text.replace(/\n(?:    |\t)/g, ' ');
            footnotes.set(id, this.escapeLatex(cleanedText));
            return '';  // Remove definition from main text
        });

        // Convert footnote references
        latex = latex.replace(/\[\^([a-zA-Z0-9\-_]+)\]/g, (_, id) => {
            const text = footnotes.get(id) || '';
            return `\\footnote{${text}}`;
        });

        // Step 4: Convert tables
        latex = this.convertTables(latex);

        // Step 5: Convert images
        // ![alt](url "caption") or ![alt](url)
        latex = latex.replace(/!\[([^\]]*)\]\(([^)"]+)(?:\s+"([^"]+)")?\)/g, (_, alt, url, caption) => {
            // Clean label: remove non-alphanumeric chars (except hyphens/underscores), collapse multiple hyphens
            const label = alt.toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-');
            // Escape caption and URL for LaTeX special characters
            const escapedCaption = caption ? this.escapeLatex(caption) : '';
            const escapedUrl = this.escapeUrl(url);
            if (caption) {
                return `\\begin{figure}[h]\n\\centering\n\\includegraphics[width=0.8\\textwidth]{${escapedUrl}}\n\\caption{${escapedCaption}}\n\\label{fig:${label}}\n\\end{figure}`;
            } else {
                return `\\begin{figure}[h]\n\\centering\n\\includegraphics[width=0.8\\textwidth]{${escapedUrl}}\n\\end{figure}`;
            }
        });

        // Step 6: Convert citations [@ref] or [@ref1; @ref2]
        // Flexible handling of whitespace around semicolons
        latex = latex.replace(/\[@([^\]]+)\]/g, (_, refs) => {
            const refList = refs.split(/\s*;\s*/).map((r: string) => r.trim().replace(/^@/, ''));
            return `\\cite{${refList.join(',')}}`;
        });

        // Step 7: Convert headings (with special character escaping)
        latex = latex.replace(/^# (.+)$/gm, (_, heading) => `\\section{${this.escapeLatex(heading)}}`);
        latex = latex.replace(/^## (.+)$/gm, (_, heading) => `\\subsection{${this.escapeLatex(heading)}}`);
        latex = latex.replace(/^### (.+)$/gm, (_, heading) => `\\subsubsection{${this.escapeLatex(heading)}}`);
        latex = latex.replace(/^#### (.+)$/gm, (_, heading) => `\\paragraph{${this.escapeLatex(heading)}}`);

        // Step 8: Convert blockquotes (use placeholder to track state)
        latex = this.convertBlockquotes(latex);

        // Step 9: Convert horizontal rules (before bold/italic to avoid *** being treated as formatting)
        // Supports ---, ***, ___, and variants with spaces (e.g., * * *, - - -)
        latex = latex.replace(/^\s*(?:[-*_]\s*){3,}$/gm, '\\hrule');

        // Step 10: Convert bold and italic (with escaping, avoid conflicts with math)
        latex = latex.replace(/\*\*(.+?)\*\*/g, (_, text) => `\\textbf{${this.escapeLatex(text)}}`);
        latex = latex.replace(/\*(.+?)\*/g, (_, text) => `\\textit{${this.escapeLatex(text)}}`);
        latex = latex.replace(/__(.+?)__/g, (_, text) => `\\textbf{${this.escapeLatex(text)}}`);
        latex = latex.replace(/_(.+?)_/g, (_, text) => `\\textit{${this.escapeLatex(text)}}`);

        // Step 11: Convert code blocks with syntax highlighting
        latex = this.convertCodeBlocks(latex);

        // Step 12: Convert inline code (escape special chars in code)
        latex = latex.replace(/`(.+?)`/g, (_, code) => `\\texttt{${this.escapeLatex(code)}}`);

        // Step 13: Convert links (escape link text and URL, avoid nested brackets)
        latex = latex.replace(/\[([^\[\]]+)\]\(([^)]+)\)/g, (_, text, url) => `\\href{${this.escapeUrl(url)}}{${this.escapeLatex(text)}}`);


        // Step 14: Convert lists (both unordered and ordered)
        latex = this.convertLists(latex);

        // Step 15: Restore raw LaTeX blocks
        latexBlocks.forEach((block, index) => {
            latex = latex.replace(`__LATEX_BLOCK_${index}__`, block);
        });

        return latex;
    }

    /**
     * Convert Markdown tables to LaTeX tabular
     */
    private convertTables(markdown: string): string {
        const lines = markdown.split('\n');
        const result: string[] = [];
        let i = 0;

        while (i < lines.length) {
            const line = lines[i];

            // Check if this line looks like a table header
            if (line.includes('|') && i + 1 < lines.length && lines[i + 1].includes('|')) {
                const headerLine = line;
                const separatorLine = lines[i + 1];

                // Verify it's a table by checking separator line (supports single-column tables)
                if (separatorLine.match(/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/)) {
                    // Validate column count matches between header and separator
                    const headerCols = headerLine.split('|').map(col => col.trim()).filter(col => col.length > 0);
                    const separatorCols = separatorLine.split('|').map(col => col.trim()).filter(col => col.length > 0);

                    if (headerCols.length !== separatorCols.length) {
                        // Malformed table: skip conversion, push original lines
                        result.push(headerLine);
                        result.push(separatorLine);
                        i += 2;
                        continue;
                    }

                    // Parse table
                    const tableLines: string[] = [headerLine];
                    let j = i + 2;

                    // Collect all table rows, validate column count
                    while (j < lines.length && lines[j].includes('|')) {
                        const rowCols = lines[j].split('|').slice(1, -1);
                        // Only include rows with correct column count
                        if (rowCols.length === headerCols.length) {
                            tableLines.push(lines[j]);
                        }
                        j++;
                    }

                    // Convert to LaTeX
                    const latexTable = this.convertTableToLatex(tableLines, separatorLine);
                    result.push(latexTable);

                    i = j;
                    continue;
                }
            }

            result.push(line);
            i++;
        }

        return result.join('\n');
    }

    /**
     * Convert a single Markdown table to LaTeX tabular
     */
    private convertTableToLatex(tableLines: string[], separatorLine: string): string {
        // Parse header (with escaping, preserve empty cells)
        // Use slice(1, -1) to remove leading/trailing empty elements from pipes
        const header = tableLines[0].split('|').map(cell => this.escapeLatex(cell.trim())).slice(1, -1);

        // Parse alignment from separator line
        const alignments = separatorLine.split('|').map(cell => cell.trim()).slice(1, -1).map(sep => {
            if (sep.startsWith(':') && sep.endsWith(':')) return 'c';
            if (sep.endsWith(':')) return 'r';
            return 'l';
        });

        // Parse data rows (with escaping, preserve empty cells)
        const dataRows = tableLines.slice(1).map(line =>
            line.split('|').map(cell => this.escapeLatex(cell.trim())).slice(1, -1)
        );

        // Build LaTeX table
        const colSpec = alignments.join('|');
        let latex = `\\begin{table}[h]\n\\centering\n\\begin{tabular}{|${colSpec}|}\n\\hline\n`;

        // Add header
        latex += header.join(' & ') + ' \\\\\n\\hline\n';

        // Add data rows
        dataRows.forEach(row => {
            latex += row.join(' & ') + ' \\\\\n';
        });

        latex += '\\hline\n\\end{tabular}\n\\end{table}';

        return latex;
    }

    /**
     * Convert code blocks with language-specific syntax highlighting
     * Supports language identifiers with hyphens, plus signs, and hash symbols
     * (e.g., objective-c, c++, c#, f#, x86-64)
     */
    private convertCodeBlocks(markdown: string): string {
        // Strict pattern: requires newlines after opening and before closing backticks
        // Supports alphanumeric, hyphens, plus, hash in language identifier
        return markdown.replace(/```([a-zA-Z0-9_+\-#]+)?\n([\s\S]+?)\n```/g, (_, lang, code) => {
            if (lang) {
                // Use listings package for syntax highlighting
                return `\\begin{lstlisting}[language=${this.mapLanguage(lang)}]\n${code}\\end{lstlisting}`;
            } else {
                // Use verbatim for code without language
                return `\\begin{verbatim}\n${code}\\end{verbatim}`;
            }
        });
    }

    /**
     * Map common language names to listings package names
     * Uses static LANGUAGE_MAP to avoid recreating the map on every call
     */
    private mapLanguage(lang: string): string {
        return ExportManager.LANGUAGE_MAP[lang.toLowerCase()] || lang;
    }

    /**
     * Convert blockquotes to LaTeX quote environment
     * This method tracks blockquote state during conversion to avoid the issue
     * of checking for '>' after it's already been replaced
     *
     * Note: Uses standard LaTeX quote environment without itemize, treating
     * blockquote lines as regular paragraph text (semantically correct)
     */
    private convertBlockquotes(markdown: string): string {
        const lines = markdown.split('\n');
        const result: string[] = [];
        let inQuote = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            const isQuoteLine = trimmedLine.startsWith('>');

            if (isQuoteLine && !inQuote) {
                // Start of blockquote
                result.push('\\begin{quote}');
                inQuote = true;
                // Convert the quote line (remove '>' and escape remaining special chars)
                // Note: Blockquotes are processed in Step 8, before bold/italic/code/links
                // Those steps only escape content within their own constructs, not the whole line
                result.push(this.escapeLatex(trimmedLine.substring(1).trim()));
            } else if (isQuoteLine && inQuote) {
                // Continuation of blockquote (escape remaining special chars)
                result.push(this.escapeLatex(trimmedLine.substring(1).trim()));
            } else if (!isQuoteLine && inQuote && trimmedLine !== '') {
                // End of blockquote (non-empty, non-quote line)
                result.push('\\end{quote}');
                inQuote = false;
                result.push(line);
            } else if (trimmedLine === '' && inQuote) {
                // Empty line within blockquote - preserve for paragraph break
                result.push('');
            } else {
                // Regular line
                result.push(line);
            }
        }

        // Close any unclosed blockquote
        if (inQuote) {
            result.push('\\end{quote}');
        }

        return result.join('\n');
    }

    /**
     * Convert both ordered and unordered lists
     * Handles switching between list types (unordered to ordered or vice versa)
     */
    private convertLists(markdown: string): string {
        const lines = markdown.split('\n');
        const result: string[] = [];
        let inList = false;
        let listType: 'itemize' | 'enumerate' | null = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            // Check if this is a list item (supports empty list items)
            const isUnorderedItem = /^[\*\-]\s+(.*)$/.test(trimmedLine);
            const isOrderedItem = /^\d+\.\s+(.*)$/.test(trimmedLine);
            const isListItem = isUnorderedItem || isOrderedItem;
            const isEmptyLine = trimmedLine === '';

            // Determine the current item's list type
            const currentItemType = isOrderedItem ? 'enumerate' : (isUnorderedItem ? 'itemize' : null);

            if (isListItem && !inList) {
                // Starting a new list
                listType = currentItemType;
                result.push(`\\begin{${listType}}`);
                inList = true;

                // Convert the list item (escape remaining special chars)
                // Note: Lists are processed in Step 14, after bold/italic/code/links
                // However, those steps only escape content within their own constructs
                // We still need to escape special chars in the remaining text
                if (isUnorderedItem) {
                    const content = trimmedLine.replace(/^([\*\-])\s+(.*)$/, '$2');
                    result.push(`\\item ${this.escapeLatex(content)}`);
                } else {
                    const content = trimmedLine.replace(/^\d+\.\s+(.*)$/, '$1');
                    result.push(`\\item ${this.escapeLatex(content)}`);
                }
            } else if (isListItem && inList) {
                // Check if list type is changing
                if (currentItemType !== listType) {
                    // Close current list and start new one
                    result.push(`\\end{${listType}}`);
                    listType = currentItemType;
                    result.push(`\\begin{${listType}}`);
                }

                // Convert the list item (escape remaining special chars)
                if (isUnorderedItem) {
                    const content = trimmedLine.replace(/^([\*\-])\s+(.*)$/, '$2');
                    result.push(`\\item ${this.escapeLatex(content)}`);
                } else {
                    const content = trimmedLine.replace(/^\d+\.\s+(.*)$/, '$1');
                    result.push(`\\item ${this.escapeLatex(content)}`);
                }
            } else if (!isListItem && !isEmptyLine && inList) {
                // Ending the list
                result.push(`\\end{${listType}}`);
                inList = false;
                listType = null;
                result.push(line);
            } else {
                // Regular line or empty line
                result.push(line);
            }
        }

        // Close any unclosed list
        if (inList && listType) {
            result.push(`\\end{${listType}}`);
        }

        return result.join('\n');
    }

    /**
     * Detect available LaTeX compilers in system PATH
     * Only runs once, subsequent calls return immediately
     * Uses Promise-based approach to prevent race conditions
     */
    private async detectLaTeXCompilers(): Promise<void> {
        // If detection is already in progress, wait for it to complete
        if (this.detectionPromise) {
            return this.detectionPromise;
        }

        // Skip if already detected
        if (this.compilersDetected) {
            return;
        }

        // Start detection and store the promise
        this.detectionPromise = (async () => {
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
                    // Verify that stdout contains expected version information
                    if (
                        stdout &&
                        (
                            (compiler.name === 'pdflatex' && /pdfTeX|pdflatex/i.test(stdout)) ||
                            (compiler.name === 'xelatex' && /XeTeX|xelatex/i.test(stdout)) ||
                            (compiler.name === 'lualatex' && /LuaTeX|lualatex/i.test(stdout))
                        )
                    ) {
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
        })();

        return this.detectionPromise;
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
                        doneIncrement = options.cleanAuxFiles ? 10 : 25;  // Adjust based on cleanAuxFiles
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
                        await fs.promises.copyFile(generatedPdfPath, pdfPath);
                        try {
                            await fs.promises.unlink(generatedPdfPath);
                        } catch (unlinkErr) {
                            vscode.window.showWarningMessage(
                                `PDF was copied to ${pdfPath}, but failed to remove temporary file: ${generatedPdfPath}. You may need to delete it manually.`
                            );
                        }
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

        // Validate filename to prevent potential issues with special characters and path traversal
        if (!texFileName.endsWith('.tex') || texFileName.includes('..') || /[<>:"|?*\\/]/.test(texFileName)) {
            throw new ExportError(
                'Invalid filename for LaTeX compilation',
                'INVALID_FILENAME'
            );
        }

        // Set up AbortController for cancellation support
        const controller = new AbortController();
        const cancellationListener = token?.onCancellationRequested(() => {
            controller.abort();
        });

        try {
            // Run compiler with options:
            // -interaction=nonstopmode: don't stop on errors, continue to get full error log
            // -file-line-error: show file and line number in errors
            const args = ['-interaction=nonstopmode', '-file-line-error', texFileName];

            // Get timeout from configuration
            const config = vscode.workspace.getConfiguration('gitforwriter');
            const timeout = config.get<number>('latex.timeout', 60000);

            const { stderr } = await execFileAsync(compiler, args, {
                cwd: workDir,
                timeout: timeout,
                signal: controller.signal
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
            // Check if the error is due to cancellation
            if (error.code === 'ABORT_ERR' || error.name === 'AbortError') {
                throw new ExportError('Compilation cancelled', 'COMPILATION_CANCELLED');
            }

            // Parse LaTeX error messages
            const errorMessage = this.parseLatexError(error.message || error.toString());
            throw new ExportError(
                `LaTeX compilation failed: ${errorMessage}`,
                'COMPILATION_ERROR',
                error,
                { compiler, texFileName }
            );
        } finally {
            // Clean up cancellation listener
            cancellationListener?.dispose();
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
            try {
                await fs.promises.unlink(filePath);
            } catch (error) {
                // Ignore errors when cleaning auxiliary files (e.g., file does not exist)
            }
        }
    }
}
