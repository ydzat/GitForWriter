/**
 * Rate limiter to prevent excessive API calls
 * Uses token bucket algorithm
 */
export class RateLimiter {
    private tokens: number;
    private lastRefill: number;
    private readonly maxTokens: number;
    private readonly refillRate: number; // tokens per second
    private readonly refillInterval: number; // milliseconds

    /**
     * Create a rate limiter
     * @param maxTokens Maximum number of tokens (requests) allowed
     * @param refillRate Number of tokens to add per second
     */
    constructor(maxTokens: number = 10, refillRate: number = 1) {
        this.maxTokens = maxTokens;
        this.refillRate = refillRate;
        this.refillInterval = 1000; // 1 second
        this.tokens = maxTokens;
        this.lastRefill = Date.now();
    }

    /**
     * Refill tokens based on time elapsed
     */
    private refill(): void {
        const now = Date.now();
        const timePassed = now - this.lastRefill;
        const tokensToAdd = (timePassed / this.refillInterval) * this.refillRate;

        this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
        this.lastRefill = now;
    }

    /**
     * Try to consume a token
     * @param tokens Number of tokens to consume (default: 1)
     * @returns True if token was consumed, false if rate limit exceeded
     */
    tryConsume(tokens: number = 1): boolean {
        this.refill();

        if (this.tokens >= tokens) {
            this.tokens -= tokens;
            return true;
        }

        return false;
    }

    /**
     * Wait until a token is available, then consume it
     * @param tokens Number of tokens to consume (default: 1)
     * @param maxWaitMs Maximum time to wait in milliseconds (default: 30000)
     * @returns Promise that resolves when token is consumed
     * @throws Error if max wait time exceeded
     */
    async consume(tokens: number = 1, maxWaitMs: number = 30000): Promise<void> {
        const startTime = Date.now();

        while (!this.tryConsume(tokens)) {
            if (Date.now() - startTime > maxWaitMs) {
                throw new Error('Rate limit: Maximum wait time exceeded');
            }

            // Wait a bit before trying again
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    /**
     * Get the number of available tokens
     */
    getAvailableTokens(): number {
        this.refill();
        return Math.floor(this.tokens);
    }

    /**
     * Get time until next token is available (in milliseconds)
     */
    getTimeUntilNextToken(): number {
        this.refill();

        if (this.tokens >= 1) {
            return 0;
        }

        const tokensNeeded = 1 - this.tokens;
        return (tokensNeeded / this.refillRate) * this.refillInterval;
    }

    /**
     * Reset the rate limiter
     */
    reset(): void {
        this.tokens = this.maxTokens;
        this.lastRefill = Date.now();
    }
}

/**
 * Global rate limiters for different AI providers
 */
export class AIRateLimiters {
    private static limiters: Map<string, RateLimiter> = new Map();

    /**
     * Get or create a rate limiter for a provider
     * @param provider Provider name (e.g., 'openai', 'claude')
     * @param maxTokens Maximum requests per time window
     * @param refillRate Requests per second
     */
    static getOrCreate(provider: string, maxTokens: number = 10, refillRate: number = 1): RateLimiter {
        if (!this.limiters.has(provider)) {
            this.limiters.set(provider, new RateLimiter(maxTokens, refillRate));
        }
        return this.limiters.get(provider)!;
    }

    /**
     * Reset all rate limiters
     */
    static resetAll(): void {
        this.limiters.forEach(limiter => limiter.reset());
    }

    /**
     * Clear all rate limiters
     */
    static clearAll(): void {
        this.limiters.clear();
    }
}

