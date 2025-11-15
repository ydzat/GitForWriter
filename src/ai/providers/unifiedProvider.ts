import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createAnthropic } from '@ai-sdk/anthropic';
import type { LanguageModelV2 } from '@ai-sdk/provider';
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
import { AICache } from '../../utils/aiCache';

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
    enableCache?: boolean; // Enable AI response caching
    cacheTTL?: number; // Cache TTL in milliseconds
    cacheMaxSize?: number; // Max cache size in bytes
}

/**
 * Unified AI provider implementation using Vercel AI SDK
 * Supports 100+ LLM providers through a unified interface
 */
export class UnifiedProvider implements AIProvider {
    private provider: ReturnType<typeof createOpenAI> | ReturnType<typeof createAnthropic> | ReturnType<typeof createOpenAICompatible>;
    private model: LanguageModelV2;
    private modelName: string;
    private maxRetries: number;
    private timeout: number;
    private diffCache: AICache<DiffAnalysis>;
    private reviewCache: AICache<TextReview>;
    private suggestionsCache: AICache<Suggestion[]>;

    constructor(config: UnifiedProviderConfig) {
        if (!config.apiKey || config.apiKey.trim() === '') {
            throw new AIProviderError('API key is required', 'INVALID_API_KEY');
        }

        this.modelName = config.model;
        this.maxRetries = config.maxRetries ?? 3;
        this.timeout = config.timeout ?? 60000; // Default 60 seconds

        // Initialize caches
        const cacheConfig = {
            enabled: config.enableCache ?? true,
            ttl: config.cacheTTL ?? 60 * 60 * 1000, // Default 1 hour
            maxSize: config.cacheMaxSize ?? 100 * 1024 * 1024 // Default 100MB
        };
        this.diffCache = new AICache<DiffAnalysis>(cacheConfig);
        this.reviewCache = new AICache<TextReview>(cacheConfig);
        this.suggestionsCache = new AICache<Suggestion[]>(cacheConfig);

        // Validate baseURL if provided (security check)
        if (config.baseURL) {
            this.validateBaseURL(config.baseURL);
        }

        // Initialize provider based on type
        if (config.provider === 'openai') {
            // Use OpenAI-compatible provider if baseURL is provided (for DeepSeek, etc.)
            if (config.baseURL) {
                const fullBaseURL = this.normalizeBaseURL(config.baseURL);
                this.provider = createOpenAICompatible({
                    name: 'openai-compatible',
                    apiKey: config.apiKey,
                    baseURL: fullBaseURL
                });
                this.model = this.provider.chatModel(config.model);
            } else {
                // Use official OpenAI provider
                this.provider = createOpenAI({
                    apiKey: config.apiKey
                });
                this.model = this.provider(config.model);
            }
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
     * Generate cache key from content and metadata
     * Uses JSON.stringify to prevent key collisions
     */
    private generateCacheKey(content: string, metadata: any): string {
        return JSON.stringify({ content, metadata: metadata || {} });
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
            // Throw validation error for all other errors to maintain consistent error handling
            console.error('Validation failed:', error);
            throw new AIProviderError(
                `Validation failed: ${error.message || 'Unknown error'}`,
                'VALIDATION_ERROR',
                error.statusCode,
                error
            );
        }
    }

    /**
     * Analyze a diff and extract semantic changes
     */
    async analyzeDiff(diff: string, context?: AnalysisContext): Promise<AIResponse<DiffAnalysis>> {
        // Check cache first
        const cacheKey = this.generateCacheKey(diff, context);
        const cached = this.diffCache.get(cacheKey, 'diff-analysis');
        if (cached) {
            console.log('✅ Cache hit for diff analysis');
            return {
                data: cached,
                tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0 },
                model: this.modelName,
                timestamp: new Date()
            };
        }

        const prompt = this.buildDiffAnalysisPrompt(diff, context);

        try {
            const response = await this.callAI(prompt, 'diff-analysis');
            const analysis = this.parseDiffAnalysis(response.content, diff);

            // Cache the result
            this.diffCache.set(cacheKey, 'diff-analysis', analysis);

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
        // Check cache first
        const cacheKey = this.generateCacheKey(text, context);
        const cached = this.reviewCache.get(cacheKey, 'text-review');
        if (cached) {
            console.log('✅ Cache hit for text review');
            return {
                data: cached,
                tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0 },
                model: this.modelName,
                timestamp: new Date()
            };
        }

        const prompt = this.buildTextReviewPrompt(text, context);

        try {
            const response = await this.callAI(prompt, 'text-review');
            const review = this.parseTextReview(response.content);

            // Cache the result
            this.reviewCache.set(cacheKey, 'text-review', review);

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
        // Check cache first
        const cacheKey = this.generateCacheKey(text, issues);
        const cached = this.suggestionsCache.get(cacheKey, 'generate-suggestions');
        if (cached) {
            console.log('✅ Cache hit for suggestions');
            return {
                data: cached,
                tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0 },
                model: this.modelName,
                timestamp: new Date()
            };
        }

        const prompt = this.buildSuggestionsPrompt(text, issues);

        try {
            const response = await this.callAI(prompt, 'generate-suggestions');
            const suggestions = this.parseSuggestions(response.content);

            // Cache the result
            this.suggestionsCache.set(cacheKey, 'generate-suggestions', suggestions);

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
     * Validate baseURL for security (must use HTTPS, except for localhost)
     */
    private validateBaseURL(baseURL: string): void {
        try {
            const url = new URL(baseURL);
            const isLocalhost = url.hostname === 'localhost' ||
                                url.hostname === '127.0.0.1' ||
                                url.hostname === '::1';

            if (url.protocol !== 'https:' && !isLocalhost) {
                throw new AIProviderError(
                    'baseURL must use HTTPS protocol to protect API keys (HTTP is only allowed for localhost)',
                    'INVALID_BASE_URL'
                );
            }
        } catch (error) {
            if (error instanceof AIProviderError) {
                throw error;
            }
            throw new AIProviderError(
                `Invalid baseURL format: ${baseURL}`,
                'INVALID_BASE_URL',
                undefined,
                error as Error
            );
        }
    }

    /**
     * Normalize baseURL by adding /v1 suffix if needed
     */
    private normalizeBaseURL(baseURL: string): string {
        return baseURL.endsWith('/v1') ? baseURL : `${baseURL}/v1`;
    }

    /**
     * Calculate exponential backoff delay
     */
    private calculateBackoffDelay(attempt: number): number {
        return Math.pow(2, attempt) * 1000;
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
                // Create a timeout promise with cleanup
                let timeoutId: NodeJS.Timeout;
                const timeoutPromise = new Promise<never>((_, reject) => {
                    timeoutId = setTimeout(() => {
                        reject(new AIProviderError(
                            `Request timeout after ${this.timeout}ms`,
                            'TIMEOUT',
                            408
                        ));
                    }, this.timeout);
                });

                // Race between API call and timeout
                const result = await Promise.race([
                    generateText({
                        model: this.model,
                        prompt,
                        temperature: 0.3,
                        maxRetries: 0 // We handle retries ourselves
                    }).finally(() => clearTimeout(timeoutId)),
                    timeoutPromise
                ]);

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
                        const delay = this.calculateBackoffDelay(attempt);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }
                } else if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
                    // Don't retry on other client errors (4xx)
                    throw error;
                }

                // Retry on server errors (5xx) and network errors
                if (attempt < this.maxRetries - 1) {
                    const delay = this.calculateBackoffDelay(attempt);
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
     * Clean markdown code blocks from response
     */
    private cleanMarkdownCodeBlocks(content: string): string {
        // Remove markdown code block markers (```json ... ``` or ``` ... ```)
        let cleaned = content.trim();

        // Remove opening code block marker
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '');

        // Remove closing code block marker
        cleaned = cleaned.replace(/\n?```\s*$/i, '');

        return cleaned.trim();
    }

    /**
     * Parse diff analysis response
     */
    private parseDiffAnalysis(content: string, originalDiff: string): DiffAnalysis {
        try {
            const cleanedContent = this.cleanMarkdownCodeBlocks(content);
            const parsed = JSON.parse(cleanedContent);

            // Calculate basic stats from diff if not provided
            const lines = originalDiff.split('\n');
            let additions = 0;
            let deletions = 0;

            for (const line of lines) {
                // Skip diff metadata
                if (
                    line.startsWith('+++') ||
                    line.startsWith('---') ||
                    line.startsWith('@@') ||
                    line.startsWith('diff ') ||
                    line.startsWith('index ')
                ) {
                    continue;
                }

                // Skip context lines (start with space) and empty lines
                if (line.startsWith(' ') || line.trim() === '') {
                    continue;
                }

                if (line.startsWith('+')) {
                    additions++;
                } else if (line.startsWith('-')) {
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
            const cleanedContent = this.cleanMarkdownCodeBlocks(content);
            const parsed = JSON.parse(cleanedContent);

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
            const cleanedContent = this.cleanMarkdownCodeBlocks(content);
            const parsed = JSON.parse(cleanedContent);
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

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            diff: this.diffCache.getStats(),
            review: this.reviewCache.getStats(),
            suggestions: this.suggestionsCache.getStats()
        };
    }

    /**
     * Clear all caches
     */
    clearCache() {
        this.diffCache.clear();
        this.reviewCache.clear();
        this.suggestionsCache.clear();
    }

    /**
     * Clean expired cache entries
     */
    cleanExpiredCache() {
        const diffCleaned = this.diffCache.cleanExpired();
        const reviewCleaned = this.reviewCache.cleanExpired();
        const suggestionsCleaned = this.suggestionsCache.cleanExpired();
        return {
            diff: diffCleaned,
            review: reviewCleaned,
            suggestions: suggestionsCleaned,
            total: diffCleaned + reviewCleaned + suggestionsCleaned
        };
    }
}

