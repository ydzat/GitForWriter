import * as vscode from 'vscode';
import { DiffAnalysis } from '../diff/diffAnalyzer';
import { AIProvider, ReviewContext, TextReview, Suggestion } from '../providers/aiProvider';
import { ConfigManager } from '../../config/configManager';
import { SecretManager } from '../../config/secretManager';
import { initializeAIProvider } from '../providers/providerFactory';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

export interface Review {
    overall: string;
    strengths: string[];
    improvements: string[];
    suggestions: ReviewSuggestion[];
    rating: number; // 0-10
    filePath?: string; // File path for the review
    documentVersion?: number; // Document version for conflict detection
}

export interface ReviewSuggestion {
    id: string;
    type: 'grammar' | 'style' | 'structure' | 'content';
    line: number; // Display line number (1-based for UI)
    startLine: number; // 0-based line number for editing
    startColumn: number; // 0-based column number
    endLine: number; // 0-based line number
    endColumn: number; // 0-based column number
    original: string;
    suggested: string;
    reason: string;
}

export class ReviewEngine {
    private aiProvider: AIProvider | null = null;
    private initializationPromise: Promise<void> | null = null;

    constructor(
        private configManager: ConfigManager,
        private secretManager: SecretManager,
        private outputChannel?: vscode.OutputChannel
    ) {
        // Initialize provider asynchronously
        this.initializationPromise = this.initializeProvider();
    }

    /**
     * Initialize AI provider based on configuration
     */
    private async initializeProvider(): Promise<void> {
        try {
            this.aiProvider = await initializeAIProvider(this.configManager, this.secretManager, this.outputChannel);
        } catch (error: any) {
            // Failed to initialize AI provider, will use fallback review
            // Log the error silently without showing UI notification
            try {
                const { errorHandler } = await import('../../utils/errorHandlerUI');
                errorHandler.handleSilent(error, {
                    context: 'ai_provider_initialization'
                });
            } catch (importError) {
                // Fallback: log both errors to console to avoid masking the original error
                console.error('Failed to import or use errorHandler:', importError);
                console.error('Original error during AI provider initialization:', error);
            }
            this.aiProvider = null;
        }
    }

    /**
     * Generate review using AI provider with fallback to rule-based review
     */
    async generateReview(analysis: DiffAnalysis, filePath?: string, fullContent?: string): Promise<Review> {
        // Wait for provider initialization
        await this.initializationPromise;

        // Try AI-powered review first
        if (this.aiProvider && fullContent) {
            try {
                if (this.outputChannel) {
                    this.outputChannel.appendLine('🤖 Using AI-powered review');
                }

                // Detect document type from file extension
                let documentType: 'markdown' | 'latex' = 'markdown';
                if (filePath) {
                    const ext = path.extname(filePath).toLowerCase();
                    if (ext === '.tex') {
                        documentType = 'latex';
                    } else if (ext === '.md' || ext === '.markdown') {
                        documentType = 'markdown';
                    }
                }

                const context: ReviewContext = {
                    filePath,
                    documentType,
                    writingStyle: 'formal'
                };

                const result = await this.aiProvider.reviewText(fullContent, context);

                if (this.outputChannel) {
                    this.outputChannel.appendLine(`✅ AI review completed (model: ${result.model})`);
                }

                // Convert AI review to our Review format
                return this.convertAIReview(result.data, analysis, filePath);
            } catch (error) {
                // Fall back to rule-based review on AI failure
                if (this.outputChannel) {
                    this.outputChannel.appendLine(`⚠️ AI review failed, falling back to rule-based review: ${error}`);
                }
                // Error is logged by AI provider
            }
        } else {
            if (this.outputChannel) {
                const reason = !this.aiProvider ? 'AI provider not initialized' : 'No content provided';
                this.outputChannel.appendLine(`ℹ️ Using rule-based review (${reason})`);
            }
        }

        // Fallback to rule-based review
        return this.fallbackGenerateReview(analysis, filePath, fullContent);
    }

    /**
     * Convert AI provider's TextReview to our Review format
     * @param aiReview - AI review result
     * @param analysis - Diff analysis (reserved for future use, e.g., merging AI suggestions with diff-based suggestions)
     * @param filePath - Optional file path
     */
    private convertAIReview(
        aiReview: TextReview,
        analysis: DiffAnalysis,
        filePath?: string
    ): Review {
        // Convert AI suggestions to our ReviewSuggestion format
        const suggestions: ReviewSuggestion[] = (aiReview.suggestions || []).map((s: Suggestion) => ({
            id: s.id || this._generateId(),
            type: this.mapSuggestionType(s.type),
            line: s.line || 0,
            startLine: s.startLine || 0,
            startColumn: s.startColumn || 0,
            endLine: s.endLine || 0,
            endColumn: s.endColumn || 0,
            original: s.original || '',
            suggested: s.suggested || '',
            reason: s.reason || ''
        }));

        return {
            overall: aiReview.overall || '整体质量良好',
            strengths: aiReview.strengths || ['继续保持细致的写作态度'],
            improvements: aiReview.improvements || ['暂无明显问题'],
            suggestions,
            rating: aiReview.rating || 7,
            filePath,
            documentVersion: undefined
        };
    }

    /**
     * Map AI suggestion type to our type
     */
    private mapSuggestionType(type: string): 'grammar' | 'style' | 'structure' | 'content' {
        const typeMap: Record<string, 'grammar' | 'style' | 'structure' | 'content'> = {
            'grammar': 'grammar',
            'style': 'style',
            'structure': 'structure',
            'content': 'content',
            'clarity': 'style' // Map clarity to style
        };
        return typeMap[type] || 'style';
    }

    /**
     * Rule-based fallback review (original implementation)
     */
    private fallbackGenerateReview(analysis: DiffAnalysis, filePath?: string, fullContent?: string): Review {
        const strengths: string[] = [];
        const improvements: string[] = [];
        const suggestions: ReviewSuggestion[] = [];

        // Analyze based on consistency report
        const { consistencyReport } = analysis;

        // Determine strengths
        if (consistencyReport.score >= 80) {
            strengths.push('文本结构清晰，逻辑连贯');
        }
        if (analysis.additions > analysis.deletions * 2) {
            strengths.push('内容扩充充分，信息量丰富');
        }
        if (analysis.semanticChanges.length > 5) {
            strengths.push('修改细致，注重细节打磨');
        }

        // Identify improvements based on issues
        improvements.push(...consistencyReport.issues);

        // Generate suggestions from consistency report
        for (const suggestion of consistencyReport.suggestions) {
            suggestions.push({
                id: this._generateId(),
                type: 'style',
                line: 0,
                startLine: 0,
                startColumn: 0,
                endLine: 0,
                endColumn: 0,
                original: '',
                suggested: '',
                reason: suggestion
            });
        }

        // Analyze semantic changes for specific suggestions with precise locations
        for (const change of analysis.semanticChanges.slice(0, 5)) {
            if (change.type === 'addition') {
                // Check for common issues in added text
                const text = change.description.toLowerCase();

                if (text.includes('很') || text.includes('非常')) {
                    // Try to find the exact location in the content
                    const location = this._findTextLocation(fullContent || '', change.description, change.lineNumber);

                    // Note: _removeExcessiveModifiers removes both "很" and "非常" globally,
                    // but the message should only mention the adverbs actually present in the text
                    const hasHen = text.includes('很');
                    const hasFeichang = text.includes('非常');
                    let reasonMessage = '减少程度副词的使用可以使文字更精炼';
                    if (hasHen && hasFeichang) {
                        reasonMessage = '减少"很"、"非常"等程度副词的使用可以使文字更精炼（将移除文本中所有"很"和"非常"）';
                    } else if (hasHen) {
                        reasonMessage = '减少"很"等程度副词的使用可以使文字更精炼（将移除文本中所有"很"）';
                    } else if (hasFeichang) {
                        reasonMessage = '减少"非常"等程度副词的使用可以使文字更精炼（将移除文本中所有"非常"）';
                    }

                    suggestions.push({
                        id: this._generateId(),
                        type: 'style',
                        line: change.lineNumber + 1, // Display as 1-based
                        startLine: location.startLine,
                        startColumn: location.startColumn,
                        endLine: location.endLine,
                        endColumn: location.endColumn,
                        original: change.description,
                        suggested: this._removeExcessiveModifiers(change.description),
                        reason: reasonMessage
                    });
                }
            }
        }

        // Generate overall assessment
        let overall = '';
        if (consistencyReport.score >= 85) {
            overall = '本次修改整体质量优秀，文本逻辑清晰，表达流畅。';
        } else if (consistencyReport.score >= 70) {
            overall = '本次修改整体质量良好，有一些小问题需要注意。';
        } else {
            overall = '本次修改存在一些需要改进的地方，建议仔细审查。';
        }

        if (analysis.additions > 0 && analysis.deletions === 0) {
            overall += '主要是内容扩充，注意保持与现有内容的一致性。';
        } else if (analysis.deletions > analysis.additions) {
            overall += '进行了内容精简，注意不要删除关键信息。';
        }

        // Calculate rating
        const rating = Math.min(10, Math.round((consistencyReport.score / 10) + 
            (strengths.length * 0.5) - 
            (improvements.length * 0.3)));

        return {
            overall,
            strengths: strengths.length > 0 ? strengths : ['继续保持细致的写作态度'],
            improvements: improvements.length > 0 ? improvements : ['暂无明显问题'],
            suggestions,
            rating: Math.max(0, rating),
            filePath,
            documentVersion: undefined // Will be set by the caller if needed
        };
    }

    /**
     * Generate a unique ID for suggestions
     */
    private _generateId(): string {
        return uuidv4();
    }

    /**
     * Find the exact location of text in content
     */
    private _findTextLocation(
        content: string,
        searchText: string,
        approximateLine: number
    ): { startLine: number; startColumn: number; endLine: number; endColumn: number } {
        const lines = content.split('\n');

        // Search around the approximate line
        const searchStart = Math.max(0, approximateLine - 2);
        const searchEnd = Math.min(lines.length, approximateLine + 3);

        for (let i = searchStart; i < searchEnd; i++) {
            const line = lines[i];
            const trimmedSearchText = searchText.trim();
            const index = line.indexOf(trimmedSearchText);

            if (index !== -1) {
                // Calculate leading whitespace to adjust column position
                const leadingWhitespace = searchText.length - searchText.trimStart().length;
                const startColumn = Math.max(0, index - leadingWhitespace);

                // Use original searchText length to preserve whitespace in position calculation
                return {
                    startLine: i,
                    startColumn: startColumn,
                    endLine: i,
                    endColumn: startColumn + searchText.length
                };
            }
        }

        // Fallback: use the approximate line, clamped to valid bounds
        const clampedLine = Math.min(Math.max(0, approximateLine), lines.length - 1);
        const lineLength = lines[clampedLine]?.length || 0;
        return {
            startLine: clampedLine,
            startColumn: 0,
            endLine: clampedLine,
            endColumn: lineLength
        };
    }

    /**
     * Remove excessive modifiers from text
     */
    private _removeExcessiveModifiers(text: string): string {
        // Improved implementation: remove "很" and "非常" only when used as standalone modifiers
        // Match "很" or "非常" at the start of the string or after whitespace, followed by a non-whitespace character
        return text
            .replace(/(^|\s)(很|非常)(?=\S)/g, '$1')
            .replace(/\s+/g, ' ')
            .trim();
    }
}
