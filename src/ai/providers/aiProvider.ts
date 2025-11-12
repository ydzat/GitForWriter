/**
 * Common types and interfaces for AI providers
 */

/**
 * Context for diff analysis
 */
export interface AnalysisContext {
    /** File path being analyzed */
    filePath?: string;
    /** Document type (markdown, latex, etc.) */
    documentType?: string;
    /** Full content of the document */
    fullContent?: string;
    /** Additional metadata */
    metadata?: Record<string, any>;
}

/**
 * Context for text review
 */
export interface ReviewContext {
    /** File path being reviewed */
    filePath?: string;
    /** Document type (markdown, latex, etc.) */
    documentType?: string;
    /** Writing style preference */
    writingStyle?: 'formal' | 'casual' | 'academic' | 'technical';
    /** Target audience */
    targetAudience?: string;
    /** Additional metadata */
    metadata?: Record<string, any>;
}

/**
 * Semantic change detected in diff
 */
export interface SemanticChange {
    type: 'addition' | 'deletion' | 'modification';
    description: string;
    lineNumber: number;
    confidence: number;
    /** Detailed explanation of the change */
    explanation?: string;
    /** Impact level of the change */
    impact?: 'minor' | 'moderate' | 'major';
}

/**
 * Consistency report for document
 */
export interface ConsistencyReport {
    score: number; // 0-100
    issues: string[];
    suggestions: string[];
}

/**
 * Result of diff analysis
 */
export interface DiffAnalysis {
    summary: string;
    additions: number;
    deletions: number;
    modifications: number;
    semanticChanges: SemanticChange[];
    consistencyReport: ConsistencyReport;
    /** Overall impact assessment */
    impact?: 'minor' | 'moderate' | 'major';
    /** Structural changes (headings, sections) */
    structuralChanges?: string[];
    /** Tone/style changes */
    toneChanges?: string[];
}

/**
 * Issue found in text
 */
export interface Issue {
    type: 'grammar' | 'style' | 'structure' | 'content' | 'clarity';
    line: number;
    description: string;
    severity: 'low' | 'medium' | 'high';
}

/**
 * Suggestion for improvement
 */
export interface Suggestion {
    id: string;
    type: 'grammar' | 'style' | 'structure' | 'content' | 'clarity';
    line: number;
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
    original: string;
    suggested: string;
    reason: string;
    confidence: number; // 0-1
}

/**
 * Result of text review
 */
export interface TextReview {
    overall: string;
    strengths: string[];
    improvements: string[];
    suggestions: Suggestion[];
    rating: number; // 0-10
    issues?: Issue[];
}

/**
 * Token usage information
 */
export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number; // in USD
}

/**
 * Base AI response
 */
export interface AIResponse<T> {
    data: T;
    tokenUsage?: TokenUsage;
    model?: string;
    timestamp: Date;
}

/**
 * AI error types
 */
export class AIProviderError extends Error {
    constructor(
        message: string,
        public code?: string,
        public statusCode?: number,
        public originalError?: Error
    ) {
        super(message);
        this.name = 'AIProviderError';
    }
}

/**
 * AI Provider interface
 * All AI providers (OpenAI, Claude, Local) must implement this interface
 */
export interface AIProvider {
    /**
     * Analyze a diff and extract semantic changes
     * @param diff The git diff string
     * @param context Optional context for analysis
     * @returns Promise resolving to diff analysis
     */
    analyzeDiff(diff: string, context?: AnalysisContext): Promise<AIResponse<DiffAnalysis>>;

    /**
     * Review text and provide suggestions
     * @param text The text to review
     * @param context Optional context for review
     * @returns Promise resolving to text review
     */
    reviewText(text: string, context?: ReviewContext): Promise<AIResponse<TextReview>>;

    /**
     * Generate suggestions based on identified issues
     * @param text The original text
     * @param issues List of issues found
     * @returns Promise resolving to list of suggestions
     */
    generateSuggestions(text: string, issues: Issue[]): Promise<AIResponse<Suggestion[]>>;

    /**
     * Validate that the provider is properly configured
     * @returns Promise resolving to true if valid, false otherwise
     */
    validate(): Promise<boolean>;
}

