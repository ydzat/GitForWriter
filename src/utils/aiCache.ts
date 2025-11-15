import * as crypto from 'crypto';

/**
 * Cache entry with TTL support
 */
interface CacheEntry<T> {
    data: T;
    timestamp: number;
    size: number; // Estimated size in bytes
}

/**
 * LRU Cache configuration
 */
export interface CacheConfig {
    maxSize: number; // Maximum cache size in bytes (default: 100MB)
    ttl: number; // Time-to-live in milliseconds (default: 1 hour)
    enabled: boolean; // Enable/disable caching
}

/**
 * LRU Cache for AI responses
 * Implements Least Recently Used eviction policy with TTL and size limits
 */
export class AICache<T> {
    private cache: Map<string, CacheEntry<T>>;
    private accessOrder: Map<string, number>; // Track access order for LRU (key -> timestamp)
    private accessCounter: number; // Monotonically increasing counter for access order
    private currentSize: number; // Current cache size in bytes
    private config: CacheConfig;
    private hits: number;
    private misses: number;
    private operationInProgress: boolean; // Simple mutex for cache operations

    constructor(config?: Partial<CacheConfig>) {
        this.cache = new Map();
        this.accessOrder = new Map();
        this.accessCounter = 0;
        this.currentSize = 0;
        this.hits = 0;
        this.misses = 0;
        this.operationInProgress = false;

        // Default configuration
        this.config = {
            maxSize: config?.maxSize ?? 100 * 1024 * 1024, // 100MB
            ttl: config?.ttl ?? 60 * 60 * 1000, // 1 hour
            enabled: config?.enabled ?? true
        };
    }

    /**
     * Generate cache key from content using SHA-256 hash
     */
    private generateKey(content: string, operation: string): string {
        const hash = crypto.createHash('sha256');
        hash.update(`${operation}:${content}`);
        return hash.digest('hex');
    }

    /**
     * Estimate size of data in bytes
     * Uses a more robust approach to handle various object types
     */
    private estimateSize(data: T): number {
        try {
            // Try JSON.stringify first (most accurate for serializable objects)
            const jsonStr = JSON.stringify(data);
            return Buffer.byteLength(jsonStr, 'utf8');
        } catch (error) {
            // Fallback for non-serializable objects
            // Estimate based on object structure
            if (typeof data === 'string') {
                return Buffer.byteLength(data, 'utf8');
            } else if (typeof data === 'number' || typeof data === 'boolean') {
                return 8; // Approximate size
            } else if (Array.isArray(data)) {
                // Estimate array size
                return data.length * 100; // Conservative estimate
            } else if (typeof data === 'object' && data !== null) {
                // Estimate object size based on keys
                const keys = Object.keys(data);
                return keys.length * 100; // Conservative estimate
            }
            // Default fallback
            return 1024; // 1KB default
        }
    }

    /**
     * Check if entry is expired
     */
    private isExpired(entry: CacheEntry<T>): boolean {
        return Date.now() - entry.timestamp > this.config.ttl;
    }

    /**
     * Evict least recently used entries until size is under limit
     */
    private evictLRU(): void {
        while (this.currentSize > this.config.maxSize && this.accessOrder.size > 0) {
            // Find the key with the smallest access counter (least recently used)
            let oldestKey: string | null = null;
            let oldestCounter = Infinity;

            for (const [key, counter] of this.accessOrder.entries()) {
                if (counter < oldestCounter) {
                    oldestCounter = counter;
                    oldestKey = key;
                }
            }

            if (oldestKey) {
                const entry = this.cache.get(oldestKey);
                if (entry) {
                    this.currentSize -= entry.size;
                    this.cache.delete(oldestKey);
                    this.accessOrder.delete(oldestKey);
                }
            } else {
                break; // No more entries to evict
            }
        }
    }

    /**
     * Update access order for LRU
     * Uses a Map with monotonic counter for O(1) updates
     */
    private updateAccessOrder(key: string): void {
        // Reset counter if approaching MAX_SAFE_INTEGER to prevent overflow
        if (this.accessCounter > Number.MAX_SAFE_INTEGER - 1000) {
            // Reassign order values starting from 0, preserving relative order
            const entries = Array.from(this.accessOrder.entries())
                .sort((a, b) => a[1] - b[1]); // sort by old order
            this.accessCounter = 0;
            this.accessOrder.clear();
            for (const [k] of entries) {
                this.accessOrder.set(k, this.accessCounter++);
            }
        }
        this.accessOrder.set(key, this.accessCounter++);
    }

    /**
     * Get cached data
     */
    get(content: string, operation: string): T | null {
        if (!this.config.enabled) {
            return null;
        }

        const key = this.generateKey(content, operation);
        const entry = this.cache.get(key);

        if (!entry) {
            this.misses++;
            return null;
        }

        // Check if expired
        if (this.isExpired(entry)) {
            this.cache.delete(key);
            this.currentSize -= entry.size;
            this.accessOrder.delete(key);
            this.misses++;
            return null;
        }

        // Update access order
        this.updateAccessOrder(key);
        this.hits++;
        return entry.data;
    }

    /**
     * Set cached data
     * Uses simple mutex to prevent race conditions during eviction
     */
    set(content: string, operation: string, data: T): void {
        if (!this.config.enabled) {
            return;
        }

        // Wait for any ongoing operation to complete
        // In practice, this is rarely needed due to JavaScript's single-threaded nature
        // but provides safety for async interleaving
        if (this.operationInProgress) {
            // Skip this set operation if another is in progress
            // This is acceptable as it's just a cache miss on next access
            return;
        }

        this.operationInProgress = true;
        try {
            const key = this.generateKey(content, operation);
            const size = this.estimateSize(data);

            // Remove old entry if exists
            const oldEntry = this.cache.get(key);
            if (oldEntry) {
                this.currentSize -= oldEntry.size;
            }

            // Create new entry
            const entry: CacheEntry<T> = {
                data,
                timestamp: Date.now(),
                size
            };

            this.cache.set(key, entry);
            this.currentSize += size;
            this.updateAccessOrder(key);

            // Evict if necessary
            this.evictLRU();
        } finally {
            this.operationInProgress = false;
        }
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        this.cache.clear();
        this.accessOrder.clear();
        this.accessCounter = 0;
        this.currentSize = 0;
        this.hits = 0;
        this.misses = 0;
    }

    /**
     * Get cache statistics
     */
    getStats(): {
        size: number;
        entries: number;
        hits: number;
        misses: number;
        hitRate: number;
        sizeInMB: number;
    } {
        const total = this.hits + this.misses;
        return {
            size: this.currentSize,
            entries: this.cache.size,
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? this.hits / total : 0,
            sizeInMB: this.currentSize / (1024 * 1024)
        };
    }

    /**
     * Enable or disable cache
     */
    setEnabled(enabled: boolean): void {
        this.config.enabled = enabled;
        if (!enabled) {
            this.clear();
        }
    }

    /**
     * Update cache configuration
     */
    updateConfig(config: Partial<CacheConfig>): void {
        this.config = { ...this.config, ...config };

        // If size limit decreased, evict entries
        if (config.maxSize !== undefined && this.currentSize > config.maxSize) {
            this.evictLRU();
        }
    }

    /**
     * Clean up expired entries
     */
    cleanExpired(): number {
        let cleaned = 0;
        const keysToDelete: string[] = [];

        for (const [key, entry] of this.cache.entries()) {
            if (this.isExpired(entry)) {
                keysToDelete.push(key);
            }
        }

        for (const key of keysToDelete) {
            const entry = this.cache.get(key);
            if (entry) {
                this.currentSize -= entry.size;
                this.cache.delete(key);
                this.accessOrder.delete(key);
                cleaned++;
            }
        }

        return cleaned;
    }
}

