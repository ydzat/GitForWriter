import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import {
    AIProvider,
    AIResponse,
    AIProviderError,
    DiffAnalysis,
    TextReview,
    Suggestion,
    Issue,
    AnalysisContext,
    ReviewContext,
    TokenUsage
} from './aiProvider';

/**
 * Unified provider configuration
 */
export interface UnifiedProviderConfig {
    provider: 'openai' | 'anthropic';
    model: string;
    apiKey: string;
    baseURL?: string; // For OpenAI-compatible APIs
    maxRetries?: number;
    timeout?: number;
}

/**
 * Unified AI provider implementation using Vercel AI SDK
 * Supports 100+ LLM providers through a unified interface
 */
export class UnifiedProvider implements AIProvider {
    private provider: any;
    private model: any;
    private modelName: string;
    private maxRetries: number;

    constructor(config: UnifiedProviderConfig) {
        if (!config.apiKey || config.apiKey.trim() === '') {
            throw new AIProviderError('API key is required', 'INVALID_API_KEY');
        }

        this.modelName = config.model;
        this.maxRetries = config.maxRetries ?? 3;

        // Initialize provider based on type
        if (config.provider === 'openai') {
            this.provider = createOpenAI({
                apiKey: config.apiKey,
                baseURL: config.baseURL
            });
            this.model = this.provider(config.model);
        } else if (config.provider === 'anthropic') {
            this.provider = createAnthropic({
                apiKey: config.apiKey
            });
            this.model = this.provider(config.model);
        } else {
            throw new AIProviderError(`Unsupported provider: ${config.provider}`, 'INVALID_PROVIDER');
        }
    }

    /**
     * Validate the provider configuration
     */
    async validate(): Promise<boolean> {
        try {
            // Make a minimal API call to verify the API key
            await generateText({
                model: this.model,
                prompt: 'Hi',
                maxOutputTokens: 10
            });
            return true;
        } catch (error: any) {
            if (error.statusCode === 401 || error.message?.includes('401')) {
                throw new AIProviderError('Invalid API key', 'INVALID_API_KEY', 401, error);
            }
            return false;
        }
    }

    /**
     * Analyze a diff and extract semantic changes
     */
    async analyzeDiff(diff: string, context?: AnalysisContext): Promise<AIResponse<DiffAnalysis>> {
        const prompt = this.buildDiffAnalysisPrompt(diff, context);

        try {
            const response = await this.callAI(prompt, 'diff-analysis');
            const analysis = this.parseDiffAnalysis(response.content, diff);

            return {
                data: analysis,
                tokenUsage: response.tokenUsage,
                model: this.modelName,
                timestamp: new Date()
            };
        } catch (error) {
            throw this.handleError(error, 'analyzeDiff');
        }
    }

    /**
     * Review text and provide suggestions
     */
    async reviewText(text: string, context?: ReviewContext): Promise<AIResponse<TextReview>> {
        const prompt = this.buildTextReviewPrompt(text, context);

        try {
            const response = await this.callAI(prompt, 'text-review');
            const review = this.parseTextReview(response.content);

            return {
                data: review,
                tokenUsage: response.tokenUsage,
                model: this.modelName,
                timestamp: new Date()
            };
        } catch (error) {
            throw this.handleError(error, 'reviewText');
        }
    }

    /**
     * Generate suggestions based on identified issues
     */
    async generateSuggestions(text: string, issues: Issue[]): Promise<AIResponse<Suggestion[]>> {
        const prompt = this.buildSuggestionsPrompt(text, issues);

        try {
            const response = await this.callAI(prompt, 'generate-suggestions');
            const suggestions = this.parseSuggestions(response.content);

            return {
                data: suggestions,
                tokenUsage: response.tokenUsage,
                model: this.modelName,
                timestamp: new Date()
            };
        } catch (error) {
            throw this.handleError(error, 'generateSuggestions');
        }
    }

    /**
     * Call AI with retry logic using Vercel AI SDK
     */
    private async callAI(
        prompt: string,
        operation: string
    ): Promise<{ content: string; tokenUsage: TokenUsage }> {
        let lastError: Error | undefined;

        for (let attempt = 0; attempt < this.maxRetries; attempt++) {
            try {
                const result = await generateText({
                    model: this.model,
                    prompt,
                    temperature: 0.3,
                    maxRetries: 0 // We handle retries ourselves
                });

                const tokenUsage: TokenUsage = {
                    promptTokens: result.usage.inputTokens || 0,
                    completionTokens: result.usage.outputTokens || 0,
                    totalTokens: result.usage.totalTokens || 0,
                    estimatedCost: 0 // Will be calculated separately if needed
                };

                return { content: result.text, tokenUsage };
            } catch (error: any) {
                lastError = error;

                // Don't retry on authentication errors
                if (error.statusCode === 401 || error.message?.includes('401')) {
                    throw new AIProviderError('Invalid API key', 'INVALID_API_KEY', 401, error);
                }

                // Retry on rate limit errors with exponential backoff
                if (error.statusCode === 429 || error.message?.includes('429')) {
                    if (attempt < this.maxRetries - 1) {
                        const delay = Math.pow(2, attempt) * 1000;
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }
                } else if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
                    // Don't retry on other client errors (4xx)
                    throw error;
                }

                // Retry on server errors (5xx) and network errors
                if (attempt < this.maxRetries - 1) {
                    const delay = Math.pow(2, attempt) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
            }
        }

        throw new AIProviderError(
            `Failed after ${this.maxRetries} attempts`,
            'MAX_RETRIES_EXCEEDED',
            undefined,
            lastError
        );
    }

    /**
     * Build prompt for diff analysis
     */
    private buildDiffAnalysisPrompt(diff: string, context?: AnalysisContext): string {
        const contextInfo = context ? `
Document Type: ${context.documentType || 'unknown'}
File Path: ${context.filePath || 'unknown'}
` : '';

        return `You are analyzing changes in a document. Analyze the following git diff and provide a detailed analysis.

${contextInfo}
Git Diff:
\`\`\`
${diff}
\`\`\`

Provide your analysis in JSON format with the following structure:
{
  "summary": "Brief summary of changes in Chinese",
  "semanticChanges": [
    {
      "type": "addition|deletion|modification",
      "description": "Description of the change",
      "lineNumber": number,
      "confidence": 0.0-1.0,
      "explanation": "Detailed explanation",
      "impact": "minor|moderate|major"
    }
  ],
  "structuralChanges": ["List of structural changes like headings, sections"],
  "toneChanges": ["List of tone or style changes"],
  "impact": "minor|moderate|major",
  "consistencyReport": {
    "score": 0-100,
    "issues": ["List of consistency issues"],
    "suggestions": ["List of suggestions for improvement"]
  }
}

Focus on:
1. Semantic meaning changes (not just line counts)
2. Structural changes (headings, sections, organization)
3. Tone and style changes
4. Overall impact on the document
5. Consistency and quality issues

Respond ONLY with valid JSON.`;
    }

    /**
     * Build prompt for text review
     */
    private buildTextReviewPrompt(text: string, context?: ReviewContext): string {
        const styleInfo = context?.writingStyle ? `Writing Style: ${context.writingStyle}` : '';
        const audienceInfo = context?.targetAudience ? `Target Audience: ${context.targetAudience}` : '';
        const contextInfo = styleInfo || audienceInfo ? `\n${styleInfo}\n${audienceInfo}\n` : '';

        return `You are a professional writing editor. Review the following text and provide detailed feedback.
${contextInfo}
Text to Review:
\`\`\`
${text}
\`\`\`

Provide your review in JSON format with the following structure:
{
  "overall": "Overall assessment in Chinese",
  "strengths": ["List of strengths"],
  "improvements": ["List of areas for improvement"],
  "rating": 0-10,
  "suggestions": [
    {
      "id": "unique-id",
      "type": "grammar|style|structure|content|clarity",
      "line": number,
      "startLine": number,
      "startColumn": number,
      "endLine": number,
      "endColumn": number,
      "original": "original text",
      "suggested": "suggested replacement",
      "reason": "explanation in Chinese",
      "confidence": 0.0-1.0
    }
  ],
  "issues": [
    {
      "type": "grammar|style|structure|content|clarity",
      "line": number,
      "description": "description in Chinese",
      "severity": "low|medium|high"
    }
  ]
}

Review for:
- Grammar and spelling
- Clarity and readability
- Style consistency
- Structure and flow
- Content quality

Provide specific, actionable suggestions. Respond ONLY with valid JSON.`;
    }

    /**
     * Build prompt for generating suggestions
     */
    private buildSuggestionsPrompt(text: string, issues: Issue[]): string {
        const issuesText = issues.map(issue =>
            `Line ${issue.line}: [${issue.type}] ${issue.description} (${issue.severity})`
        ).join('\n');

        return `You are a writing assistant. Given the following text and identified issues, provide specific suggestions for improvement.

Text:
\`\`\`
${text}
\`\`\`

Issues:
${issuesText}

Provide suggestions in JSON format:
{
  "suggestions": [
    {
      "id": "unique-id",
      "type": "grammar|style|structure|content|clarity",
      "line": number,
      "startLine": number,
      "startColumn": number,
      "endLine": number,
      "endColumn": number,
      "original": "original text",
      "suggested": "suggested replacement",
      "reason": "explanation in Chinese",
      "confidence": 0.0-1.0
    }
  ]
}

Respond ONLY with valid JSON.`;
    }

    /**
     * Parse diff analysis response
     */
    private parseDiffAnalysis(content: string, originalDiff: string): DiffAnalysis {
        try {
            const parsed = JSON.parse(content);

            // Calculate basic stats from diff if not provided
            const lines = originalDiff.split('\n');
            let additions = 0;
            let deletions = 0;

            for (const line of lines) {
                if (line.startsWith('+') && !line.startsWith('+++')) {
                    additions++;
                } else if (line.startsWith('-') && !line.startsWith('---')) {
                    deletions++;
                }
            }

            const modifications = Math.min(additions, deletions);

            return {
                summary: parsed.summary || '无明显变化',
                additions,
                deletions,
                modifications,
                semanticChanges: parsed.semanticChanges || [],
                consistencyReport: parsed.consistencyReport || {
                    score: 80,
                    issues: [],
                    suggestions: []
                },
                impact: parsed.impact || 'minor',
                structuralChanges: parsed.structuralChanges || [],
                toneChanges: parsed.toneChanges || []
            };
        } catch (error) {
            throw new AIProviderError('Failed to parse diff analysis response', 'PARSE_ERROR', undefined, error as Error);
        }
    }

    /**
     * Parse text review response
     */
    private parseTextReview(content: string): TextReview {
        try {
            const parsed = JSON.parse(content);

            return {
                overall: parsed.overall || '整体质量良好',
                strengths: parsed.strengths || [],
                improvements: parsed.improvements || [],
                suggestions: parsed.suggestions || [],
                rating: parsed.rating || 7,
                issues: parsed.issues || []
            };
        } catch (error) {
            throw new AIProviderError('Failed to parse text review response', 'PARSE_ERROR', undefined, error as Error);
        }
    }

    /**
     * Parse suggestions response
     */
    private parseSuggestions(content: string): Suggestion[] {
        try {
            const parsed = JSON.parse(content);
            return parsed.suggestions || [];
        } catch (error) {
            throw new AIProviderError('Failed to parse suggestions response', 'PARSE_ERROR', undefined, error as Error);
        }
    }

    /**
     * Handle errors and convert to AIProviderError
     */
    private handleError(error: any, operation: string): AIProviderError {
        if (error instanceof AIProviderError) {
            return error;
        }

        const message = error.message || 'Unknown error occurred';
        const statusCode = error.statusCode || error.status;

        if (statusCode === 401) {
            return new AIProviderError('Invalid API key', 'INVALID_API_KEY', 401, error);
        } else if (statusCode === 429) {
            return new AIProviderError('Rate limit exceeded', 'RATE_LIMIT', 429, error);
        } else if (statusCode === 500 || statusCode === 503) {
            return new AIProviderError('Service unavailable', 'SERVICE_UNAVAILABLE', statusCode, error);
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return new AIProviderError('Network error: Unable to connect', 'NETWORK_ERROR', undefined, error);
        }

        return new AIProviderError(`${operation} failed: ${message}`, 'UNKNOWN_ERROR', statusCode, error);
    }
}

