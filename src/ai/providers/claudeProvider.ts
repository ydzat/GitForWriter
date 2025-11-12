import Anthropic from '@anthropic-ai/sdk';
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
 * Claude provider configuration
 */
export interface ClaudeConfig {
    apiKey: string;
    model: string;
    maxRetries?: number;
    timeout?: number;
}

/**
 * Claude provider implementation
 */
export class ClaudeProvider implements AIProvider {
    private client: Anthropic;
    private model: string;
    private maxRetries: number;

    constructor(config: ClaudeConfig) {
        if (!config.apiKey || config.apiKey.trim() === '') {
            throw new AIProviderError('Claude API key is required', 'INVALID_API_KEY');
        }

        this.client = new Anthropic({
            apiKey: config.apiKey,
            maxRetries: config.maxRetries ?? 3,
            timeout: config.timeout ?? 60000 // 60 seconds
        });

        // Map simplified model names to full Anthropic model IDs
        const modelMap: Record<string, string> = {
            'claude-3-opus': 'claude-3-opus-20240229',
            'claude-3-sonnet': 'claude-3-sonnet-20240229',
            'claude-3-haiku': 'claude-3-haiku-20240307'
        };

        this.model = modelMap[config.model] || config.model || 'claude-3-sonnet-20240229';
        this.maxRetries = config.maxRetries ?? 3;
    }

    /**
     * Validate the Claude provider configuration
     */
    async validate(): Promise<boolean> {
        try {
            // Make a minimal API call to verify the API key
            await this.client.messages.create({
                model: this.model,
                max_tokens: 10,
                messages: [{ role: 'user', content: 'Hi' }]
            });
            return true;
        } catch (error: any) {
            if (error.status === 401) {
                throw new AIProviderError('Invalid Claude API key', 'INVALID_API_KEY', 401, error);
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
            const response = await this.callClaude(prompt, 'diff-analysis');
            const analysis = this.parseDiffAnalysis(response.content, diff);

            return {
                data: analysis,
                tokenUsage: response.tokenUsage,
                model: this.model,
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
            const response = await this.callClaude(prompt, 'text-review');
            const review = this.parseTextReview(response.content);

            return {
                data: review,
                tokenUsage: response.tokenUsage,
                model: this.model,
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
            const response = await this.callClaude(prompt, 'generate-suggestions');
            const suggestions = this.parseSuggestions(response.content);

            return {
                data: suggestions,
                tokenUsage: response.tokenUsage,
                model: this.model,
                timestamp: new Date()
            };
        } catch (error) {
            throw this.handleError(error, 'generateSuggestions');
        }
    }

    /**
     * Call Claude API with retry logic
     */
    private async callClaude(
        prompt: string,
        operation: string
    ): Promise<{ content: string; tokenUsage: TokenUsage }> {
        let lastError: Error | undefined;

        for (let attempt = 0; attempt < this.maxRetries; attempt++) {
            try {
                const message = await this.client.messages.create({
                    model: this.model,
                    max_tokens: 4096,
                    temperature: 0.3, // Lower temperature for more consistent results
                    system: 'You are a professional writing assistant specializing in document analysis and review.',
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ]
                });

                const content = message.content[0]?.type === 'text' ? message.content[0].text : '{}';
                const usage = message.usage;

                const tokenUsage: TokenUsage = {
                    promptTokens: usage.input_tokens || 0,
                    completionTokens: usage.output_tokens || 0,
                    totalTokens: (usage.input_tokens || 0) + (usage.output_tokens || 0),
                    estimatedCost: this.estimateCost(usage.input_tokens || 0, usage.output_tokens || 0)
                };

                return { content, tokenUsage };
            } catch (error: any) {
                lastError = error;

                // Don't retry on authentication errors
                if (error.status === 401) {
                    throw new AIProviderError('Invalid Claude API key', 'INVALID_API_KEY', 401, error);
                }

                // Retry on rate limit errors with exponential backoff
                if (error.status === 429) {
                    if (attempt < this.maxRetries - 1) {
                        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }
                    // If we've exhausted retries on rate limit, continue to throw MAX_RETRIES_EXCEEDED below
                } else if (error.status && error.status >= 400 && error.status < 500) {
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

IMPORTANT: You must respond with ONLY valid JSON. Do not include any text before or after the JSON object.

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

IMPORTANT: You must respond with ONLY valid JSON. Do not include any text before or after the JSON object.

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

IMPORTANT: You must respond with ONLY valid JSON. Do not include any text before or after the JSON object.

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
     * Estimate cost based on token usage
     * Claude charges different rates for input vs output tokens
     */
    private estimateCost(promptTokens: number, completionTokens: number): number {
        // Pricing as of 2024 (per 1M tokens)
        const pricePerToken: Record<string, { input: number; output: number }> = {
            'claude-3-opus-20240229': { input: 0.000015, output: 0.000075 }, // $15 input, $75 output per 1M
            'claude-3-sonnet-20240229': { input: 0.000003, output: 0.000015 }, // $3 input, $15 output per 1M
            'claude-3-haiku-20240307': { input: 0.00000025, output: 0.00000125 } // $0.25 input, $1.25 output per 1M
        };

        const prices = pricePerToken[this.model] || pricePerToken['claude-3-sonnet-20240229'];
        return (promptTokens * prices.input) + (completionTokens * prices.output);
    }

    /**
     * Handle errors and convert to AIProviderError
     */
    private handleError(error: any, operation: string): AIProviderError {
        if (error instanceof AIProviderError) {
            return error;
        }

        const message = error.message || 'Unknown error occurred';
        const statusCode = error.status || error.statusCode;

        if (statusCode === 401) {
            return new AIProviderError('Invalid Claude API key', 'INVALID_API_KEY', 401, error);
        } else if (statusCode === 429) {
            return new AIProviderError('Rate limit exceeded', 'RATE_LIMIT', 429, error);
        } else if (statusCode === 500 || statusCode === 503) {
            return new AIProviderError('Claude service unavailable', 'SERVICE_UNAVAILABLE', statusCode, error);
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return new AIProviderError('Network error: Unable to connect to Claude', 'NETWORK_ERROR', undefined, error);
        }

        return new AIProviderError(`${operation} failed: ${message}`, 'UNKNOWN_ERROR', statusCode, error);
    }
}

