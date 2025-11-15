/**
 * Debounce utility for delaying function execution
 */

import * as vscode from 'vscode';

/**
 * Debounced function wrapper
 */
export interface DebouncedFunction<T extends (...args: any[]) => any> {
    (...args: Parameters<T>): void;
    cancel(): void;
    flush(): void;
}

/**
 * Create a debounced function that delays execution until after wait milliseconds
 * have elapsed since the last time it was invoked
 * 
 * @param func The function to debounce
 * @param wait The number of milliseconds to delay
 * @returns Debounced function with cancel and flush methods
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): DebouncedFunction<T> {
    let timeoutId: NodeJS.Timeout | null = null;
    let lastArgs: Parameters<T> | null = null;

    const debounced = function (this: any, ...args: Parameters<T>) {
        lastArgs = args;

        // Clear existing timeout
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }

        // Set new timeout
        timeoutId = setTimeout(() => {
            func.apply(this, args);
            timeoutId = null;
            lastArgs = null;
        }, wait);
    } as DebouncedFunction<T>;

    // Cancel pending execution
    debounced.cancel = () => {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
            timeoutId = null;
            lastArgs = null;
        }
    };

    // Execute immediately with last arguments
    debounced.flush = function (this: any) {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
            timeoutId = null;
            if (lastArgs !== null) {
                func.apply(this, lastArgs);
                lastArgs = null;
            }
        }
    };

    return debounced;
}

/**
 * Performance monitor for tracking operation durations
 */
export class PerformanceMonitor {
    private operations: Map<string, number[]> = new Map();
    private slowThreshold: number;
    private outputChannel: vscode.OutputChannel | null = null;

    constructor(slowThreshold: number = 1000, outputChannel?: vscode.OutputChannel) {
        this.slowThreshold = slowThreshold;
        this.outputChannel = outputChannel || null;
    }

    /**
     * Start timing an operation
     */
    start(operationName: string): () => void {
        const startTime = Date.now();

        return () => {
            const duration = Date.now() - startTime;
            this.record(operationName, duration);

            if (duration > this.slowThreshold) {
                const message = `⚠️ Slow operation detected: ${operationName} took ${duration}ms`;
                if (this.outputChannel) {
                    this.outputChannel.appendLine(message);
                }
            }
        };
    }

    /**
     * Record operation duration
     */
    private record(operationName: string, duration: number): void {
        if (!this.operations.has(operationName)) {
            this.operations.set(operationName, []);
        }
        this.operations.get(operationName)!.push(duration);
    }

    /**
     * Get statistics for an operation
     */
    getStats(operationName: string): {
        count: number;
        avg: number;
        min: number;
        max: number;
        total: number;
    } | null {
        const durations = this.operations.get(operationName);
        if (!durations || durations.length === 0) {
            return null;
        }

        const total = durations.reduce((sum, d) => sum + d, 0);
        const avg = total / durations.length;
        const min = Math.min(...durations);
        const max = Math.max(...durations);

        return {
            count: durations.length,
            avg: Math.round(avg),
            min,
            max,
            total
        };
    }

    /**
     * Get all statistics
     */
    getAllStats(): Map<string, ReturnType<PerformanceMonitor['getStats']>> {
        const stats = new Map();
        for (const [name] of this.operations) {
            stats.set(name, this.getStats(name));
        }
        return stats;
    }

    /**
     * Clear all statistics
     */
    clear(): void {
        this.operations.clear();
    }
}

