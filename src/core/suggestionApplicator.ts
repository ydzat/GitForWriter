import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';

/**
 * Enhanced suggestion interface with precise location information
 */
export interface Suggestion {
    id: string;
    type: 'grammar' | 'style' | 'structure' | 'content';
    filePath: string;
    startLine: number;  // 0-based line number
    startColumn: number; // 0-based column number
    endLine: number;    // 0-based line number
    endColumn: number;  // 0-based column number
    original: string;
    suggested: string;
    reason: string;
    applied?: boolean;
    documentVersion?: number; // Track document version for conflict detection
}

/**
 * Result of applying a suggestion
 */
export interface ApplyResult {
    success: boolean;
    suggestionId: string;
    message: string;
    error?: string;
}

/**
 * Handles the application of AI review suggestions to documents
 */
export class SuggestionApplicator {
    /**
     * Apply a single suggestion - directly modifies the file using file system API
     * This approach is more robust than relying on editor state
     */
    async applySuggestion(suggestion: Suggestion): Promise<ApplyResult> {
        try {
            const fs = require('fs').promises;
            const path = require('path');

            // Read the file content
            let content: string;
            try {
                content = await fs.readFile(suggestion.filePath, 'utf8');
            } catch (error) {
                return {
                    success: false,
                    suggestionId: suggestion.id,
                    message: 'File not found',
                    error: `Cannot read file: ${suggestion.filePath}`
                };
            }

            // Split content into lines
            const lines = content.split('\n');

            // Validate line numbers are within bounds
            if (suggestion.startLine < 0 || suggestion.startLine >= lines.length ||
                suggestion.endLine < 0 || suggestion.endLine >= lines.length) {
                return {
                    success: false,
                    suggestionId: suggestion.id,
                    message: 'Suggestion no longer applicable',
                    error: `Line numbers out of bounds. File has ${lines.length} lines, but suggestion references lines ${suggestion.startLine + 1}-${suggestion.endLine + 1}.`
                };
            }

            // Apply the edit
            if (suggestion.startLine === suggestion.endLine) {
                // Single line edit
                const line = lines[suggestion.startLine];

                // Validate column numbers
                if (suggestion.startColumn < 0 || suggestion.startColumn > line.length ||
                    suggestion.endColumn < 0 || suggestion.endColumn > line.length) {
                    return {
                        success: false,
                        suggestionId: suggestion.id,
                        message: 'Suggestion no longer applicable',
                        error: `Column numbers out of bounds. Line ${suggestion.startLine + 1} has ${line.length} characters, but suggestion references columns ${suggestion.startColumn}-${suggestion.endColumn}.`
                    };
                }

                // Replace the text
                const before = line.substring(0, suggestion.startColumn);
                const after = line.substring(suggestion.endColumn);
                lines[suggestion.startLine] = before + suggestion.suggested + after;
            } else {
                // Multi-line edit
                const startLine = lines[suggestion.startLine];
                const endLine = lines[suggestion.endLine];

                // Validate column numbers
                if (suggestion.startColumn < 0 || suggestion.startColumn > startLine.length) {
                    return {
                        success: false,
                        suggestionId: suggestion.id,
                        message: 'Suggestion no longer applicable',
                        error: `Start column out of bounds. Line ${suggestion.startLine + 1} has ${startLine.length} characters, but suggestion references column ${suggestion.startColumn}.`
                    };
                }

                if (suggestion.endColumn < 0 || suggestion.endColumn > endLine.length) {
                    return {
                        success: false,
                        suggestionId: suggestion.id,
                        message: 'Suggestion no longer applicable',
                        error: `End column out of bounds. Line ${suggestion.endLine + 1} has ${endLine.length} characters, but suggestion references column ${suggestion.endColumn}.`
                    };
                }

                // Replace the text across multiple lines
                const before = startLine.substring(0, suggestion.startColumn);
                const after = endLine.substring(suggestion.endColumn);
                const newContent = before + suggestion.suggested + after;

                // Remove the lines in between and replace with new content
                lines.splice(suggestion.startLine, suggestion.endLine - suggestion.startLine + 1, newContent);
            }

            // Write the modified content back to the file
            const newContent = lines.join('\n');
            await fs.writeFile(suggestion.filePath, newContent, 'utf8');

            // If the file is open in VSCode, reload it
            const uri = vscode.Uri.file(suggestion.filePath);
            const openDoc = vscode.workspace.textDocuments.find(doc => doc.uri.fsPath === uri.fsPath);
            if (openDoc && openDoc.isDirty) {
                // The document is open and has unsaved changes
                // We need to reload it to reflect our file system changes
                await vscode.commands.executeCommand('workbench.action.files.revert', uri);
            }

            return {
                success: true,
                suggestionId: suggestion.id,
                message: 'Suggestion applied successfully'
            };
        } catch (error) {
            return {
                success: false,
                suggestionId: suggestion.id,
                message: 'Error applying suggestion',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Apply all suggestions in order
     */
    async applyAllSuggestions(
        suggestions: Suggestion[],
        progressCallback?: (current: number, total: number, suggestion: Suggestion) => void
    ): Promise<{ results: ApplyResult[]; successCount: number; failureCount: number }> {
        const results: ApplyResult[] = [];
        let successCount = 0;
        let failureCount = 0;

        // Sort suggestions by position (bottom to top, right to left)
        // This prevents position shifts from affecting subsequent suggestions
        const sortedSuggestions = [...suggestions].sort((a, b) => {
            if (a.startLine !== b.startLine) {
                return b.startLine - a.startLine; // Bottom to top
            }
            return b.startColumn - a.startColumn; // Right to left
        });

        for (let i = 0; i < sortedSuggestions.length; i++) {
            const suggestion = sortedSuggestions[i];
            
            if (progressCallback) {
                progressCallback(i + 1, sortedSuggestions.length, suggestion);
            }

            const result = await this.applySuggestion(suggestion);
            results.push(result);

            if (result.success) {
                successCount++;
            } else {
                failureCount++;
                // Continue applying remaining suggestions even if one fails.
                // All failures and successes will be reported at the end.
            }

            // Small delay to allow VSCode to process the edit
            await new Promise(resolve => setTimeout(resolve, 20));
        }

        return { results, successCount, failureCount };
    }

    /**
     * Create a suggestion from basic information
     */
    createSuggestion(
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
            id: uuidv4(),
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

}

