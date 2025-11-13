import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ExportError } from '../../utils/errorHandler';

export class ExportManager {
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
            latexContent = `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{hyperref}

\\title{${path.basename(outputPath, '.tex').replace(/_/g, ' ')}}
\\date{${new Date().toLocaleDateString()}}

\\begin{document}

\\maketitle

${latexContent}

\\end{document}`;
        }

        fs.writeFileSync(outputPath, latexContent);
    }

    private async exportPdf(content: string, outputPath: string, languageId: string): Promise<void> {
        // Note: This is a simplified implementation
        // In a real scenario, you would use a tool like pandoc or pdflatex
        
        const texPath = outputPath.replace('.pdf', '.tex');
        await this.exportLatex(content, texPath, languageId);

        // Create a placeholder PDF message
        const message = `PDF export requires external tools (pandoc or pdflatex).
        
LaTeX file has been generated at: ${texPath}

To generate PDF, run one of these commands:
1. pandoc ${texPath} -o ${outputPath}
2. pdflatex ${texPath}`;

        vscode.window.showInformationMessage(message, 'Open LaTeX File').then(selection => {
            if (selection === 'Open LaTeX File') {
                vscode.workspace.openTextDocument(texPath).then(doc => {
                    vscode.window.showTextDocument(doc);
                });
            }
        });

        throw new ExportError(
            'PDF export requires LaTeX installation. LaTeX file generated instead.',
            'LATEX_NOT_FOUND',
            undefined,
            { outputPath: texPath }
        );
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
            const isListItem = line.trim().startsWith('\\item');
            
            if (isListItem && !inList) {
                result.push('\\begin{itemize}');
                inList = true;
            } else if (!isListItem && inList) {
                result.push('\\end{itemize}');
                inList = false;
            }
            
            result.push(line);
        }

        if (inList) {
            result.push('\\end{itemize}');
        }

        return result.join('\n');
    }
}
