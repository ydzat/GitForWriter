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
     * Apply a single suggestion to the active editor
     */
    async applySuggestion(suggestion: Suggestion): Promise<ApplyResult> {
        const editor = vscode.window.activeTextEditor;
        
        if (!editor) {
            return {
                success: false,
                suggestionId: suggestion.id,
                message: 'No active editor',
                error: 'Please open the file in the editor'
            };
        }

        // Validate file path matches
        if (!this._isCorrectFile(editor.document, suggestion.filePath)) {
            return {
                success: false,
                suggestionId: suggestion.id,
                message: 'Wrong file',
                error: `This suggestion is for ${suggestion.filePath}, but you have ${editor.document.fileName} open`
            };
        }

        // Check if file is read-only
        if (editor.document.isUntitled && editor.document.uri.scheme === 'untitled') {
            // Untitled files are editable
        } else if (editor.document.uri.scheme === 'file') {
            // Check file permissions (VSCode handles this, but we can check)
            try {
                await vscode.workspace.fs.stat(editor.document.uri);
            } catch (error) {
                return {
                    success: false,
                    suggestionId: suggestion.id,
                    message: 'File access error',
                    error: 'Cannot access the file'
                };
            }
        }

        // Validate suggestion is still applicable (conflict detection)
        const validationResult = this._validateSuggestion(editor.document, suggestion);
        if (!validationResult.valid) {
            return {
                success: false,
                suggestionId: suggestion.id,
                message: 'Suggestion no longer applicable',
                error: validationResult.reason
            };
        }

        // Apply the suggestion
        try {
            const success = await editor.edit((editBuilder) => {
                const range = new vscode.Range(
                    new vscode.Position(suggestion.startLine, suggestion.startColumn),
                    new vscode.Position(suggestion.endLine, suggestion.endColumn)
                );
                editBuilder.replace(range, suggestion.suggested);
            });

            if (success) {
                return {
                    success: true,
                    suggestionId: suggestion.id,
                    message: 'Suggestion applied successfully'
                };
            } else {
                return {
                    success: false,
                    suggestionId: suggestion.id,
                    message: 'Failed to apply suggestion',
                    error: 'Edit operation was rejected'
                };
            }
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
                // Stop on first error (optional behavior)
                // You can remove this break to continue applying remaining suggestions
                break;
            }

            // Small delay to allow VSCode to process the edit
            await new Promise(resolve => setTimeout(resolve, 50));
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

    /**
     * Validate if a suggestion is still applicable
     */
    private _validateSuggestion(
        document: vscode.TextDocument,
        suggestion: Suggestion
    ): { valid: boolean; reason?: string } {
        // Check if line numbers are within document bounds
        if (suggestion.startLine >= document.lineCount || suggestion.endLine >= document.lineCount) {
            return {
                valid: false,
                reason: 'Line numbers are out of document bounds. The document may have been modified.'
            };
        }

        // Check if the original text still matches
        try {
            const range = new vscode.Range(
                new vscode.Position(suggestion.startLine, suggestion.startColumn),
                new vscode.Position(suggestion.endLine, suggestion.endColumn)
            );
            const currentText = document.getText(range);

            if (currentText !== suggestion.original) {
                return {
                    valid: false,
                    reason: 'The text at this location has changed since the review was generated.'
                };
            }
        } catch (error) {
            return {
                valid: false,
                reason: 'Invalid range or position in document.'
            };
        }

        // Check document version if available
        if (suggestion.documentVersion !== undefined && document.version !== suggestion.documentVersion) {
            // Document has been modified, but text might still match
            // We already checked text match above, so this is just a warning
            // For now, we'll allow it if text matches
        }

        return { valid: true };
    }

    /**
     * Check if the editor has the correct file open
     */
    private _isCorrectFile(document: vscode.TextDocument, suggestionFilePath: string): boolean {
        // Normalize paths for comparison
        const docPath = document.uri.fsPath.replace(/\\/g, '/');
        const suggPath = suggestionFilePath.replace(/\\/g, '/');
        
        // Check if paths match or if suggestion path is a suffix of document path
        return docPath === suggPath || docPath.endsWith(suggPath);
    }
}

