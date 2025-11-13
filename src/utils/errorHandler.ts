/**
 * Centralized error handling system for GitForWriter
 * Provides custom error types, error logging, and user-friendly error messages
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Error severity levels
 */
export enum ErrorSeverity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

/**
 * Base error class for GitForWriter
 */
export class GitForWriterError extends Error {
    constructor(
        message: string,
        public code: string,
        public severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        public originalError?: Error,
        public context?: Record<string, any>
    ) {
        super(message);
        this.name = this.constructor.name;
        
        // Maintain proper stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    /**
     * Get user-friendly error message
     */
    getUserMessage(): string {
        return this.message;
    }

    /**
     * Get suggested actions for the user
     */
    getSuggestedActions(): string[] {
        return ['Please try again', 'Check the error log for details'];
    }
}

/**
 * Git operation errors
 */
export class GitError extends GitForWriterError {
    constructor(
        message: string,
        code: string = 'GIT_ERROR',
        originalError?: Error,
        context?: Record<string, any>
    ) {
        super(message, code, ErrorSeverity.HIGH, originalError, context);
    }

    getUserMessage(): string {
        if (this.code === 'GIT_NOT_INITIALIZED') {
            return 'Git repository is not initialized. Please open a folder with a Git repository.';
        }
        if (this.code === 'GIT_NOT_FOUND') {
            return 'Git is not installed or not found in PATH. Please install Git and try again.';
        }
        return `Git operation failed: ${this.message}`;
    }

    getSuggestedActions(): string[] {
        const actions = [];
        if (this.code === 'GIT_NOT_INITIALIZED') {
            actions.push('Open a folder with a Git repository');
            actions.push('Initialize a new Git repository with "git init"');
        } else if (this.code === 'GIT_NOT_FOUND') {
            actions.push('Install Git from https://git-scm.com/');
            actions.push('Ensure Git is in your system PATH');
        } else {
            actions.push('Check Git repository status');
            actions.push('View error log for details');
        }
        return actions;
    }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends GitForWriterError {
    constructor(
        message: string,
        code: string = 'CONFIG_ERROR',
        originalError?: Error,
        context?: Record<string, any>
    ) {
        super(message, code, ErrorSeverity.MEDIUM, originalError, context);
    }

    getUserMessage(): string {
        if (this.code === 'INVALID_API_KEY') {
            return 'Invalid API key. Please check your API key configuration.';
        }
        if (this.code === 'MISSING_CONFIG') {
            return 'Required configuration is missing. Please configure the extension.';
        }
        return `Configuration error: ${this.message}`;
    }

    getSuggestedActions(): string[] {
        const actions = [];
        if (this.code === 'INVALID_API_KEY') {
            actions.push('Open Settings and check your API key');
            actions.push('Ensure the API key is valid and active');
        } else if (this.code === 'MISSING_CONFIG') {
            actions.push('Open Settings and configure the extension');
            actions.push('Run "GitForWriter: Configure" command');
        } else {
            actions.push('Check extension settings');
            actions.push('Reset to default configuration');
        }
        return actions;
    }
}

/**
 * Export operation errors
 */
export class ExportError extends GitForWriterError {
    constructor(
        message: string,
        code: string = 'EXPORT_ERROR',
        originalError?: Error,
        context?: Record<string, any>
    ) {
        super(message, code, ErrorSeverity.MEDIUM, originalError, context);
    }

    getUserMessage(): string {
        if (this.code === 'UNSUPPORTED_FORMAT') {
            return `Unsupported export format: ${this.context?.format || 'unknown'}`;
        }
        if (this.code === 'LATEX_NOT_FOUND') {
            return 'LaTeX is not installed. PDF export requires LaTeX.';
        }
        return `Export failed: ${this.message}`;
    }

    getSuggestedActions(): string[] {
        const actions = [];
        if (this.code === 'UNSUPPORTED_FORMAT') {
            actions.push('Use supported formats: markdown, latex, pdf');
        } else if (this.code === 'LATEX_NOT_FOUND') {
            actions.push('Install LaTeX (TeX Live, MiKTeX, or MacTeX)');
            actions.push('Export to LaTeX format instead');
        } else {
            actions.push('Check file permissions');
            actions.push('Ensure output directory exists');
        }
        return actions;
    }
}

/**
 * Network errors
 */
export class NetworkError extends GitForWriterError {
    constructor(
        message: string,
        code: string = 'NETWORK_ERROR',
        originalError?: Error,
        context?: Record<string, any>
    ) {
        super(message, code, ErrorSeverity.MEDIUM, originalError, context);
    }

    getUserMessage(): string {
        if (this.code === 'TIMEOUT') {
            return 'Request timed out. Please check your internet connection.';
        }
        if (this.code === 'NO_CONNECTION') {
            return 'No internet connection. Please check your network.';
        }
        if (this.code === 'RATE_LIMIT') {
            return 'Rate limit exceeded. Please wait a moment and try again.';
        }
        return `Network error: ${this.message}`;
    }

    getSuggestedActions(): string[] {
        const actions = [];
        if (this.code === 'TIMEOUT') {
            actions.push('Check your internet connection');
            actions.push('Try again in a moment');
        } else if (this.code === 'NO_CONNECTION') {
            actions.push('Connect to the internet');
            actions.push('Check firewall settings');
        } else if (this.code === 'RATE_LIMIT') {
            actions.push('Wait a few minutes before retrying');
            actions.push('Consider upgrading your API plan');
        } else {
            actions.push('Check your internet connection');
            actions.push('Try again later');
        }
        return actions;
    }
}

/**
 * Error logger configuration
 */
interface ErrorLoggerConfig {
    logDir: string;
    maxLogSize: number; // in bytes
    maxLogFiles: number;
}

/**
 * Error logger class
 */
export class ErrorLogger {
    private config: ErrorLoggerConfig;
    private currentLogFile: string;

    constructor(workspaceRoot: string) {
        this.config = {
            logDir: path.join(workspaceRoot, '.gitforwriter'),
            maxLogSize: 5 * 1024 * 1024, // 5MB
            maxLogFiles: 5
        };
        this.currentLogFile = path.join(this.config.logDir, 'error.log');
        this.ensureLogDirectory();
    }

    /**
     * Ensure log directory exists
     */
    private ensureLogDirectory(): void {
        if (!fs.existsSync(this.config.logDir)) {
            fs.mkdirSync(this.config.logDir, { recursive: true });
        }
    }

    /**
     * Rotate log files if needed
     */
    private rotateLogsIfNeeded(): void {
        if (!fs.existsSync(this.currentLogFile)) {
            return;
        }

        const stats = fs.statSync(this.currentLogFile);
        if (stats.size < this.config.maxLogSize) {
            return;
        }

        // Delete the oldest log file if it exists
        const oldestFile = path.join(this.config.logDir, `error.log.${this.config.maxLogFiles}`);
        if (fs.existsSync(oldestFile)) {
            fs.unlinkSync(oldestFile);
        }

        // Shift log files up
        for (let i = this.config.maxLogFiles - 1; i > 0; i--) {
            const oldFile = path.join(this.config.logDir, `error.log.${i}`);
            const newFile = path.join(this.config.logDir, `error.log.${i + 1}`);

            if (fs.existsSync(oldFile)) {
                fs.renameSync(oldFile, newFile);
            }
        }

        // Rename current log to .1
        fs.renameSync(this.currentLogFile, path.join(this.config.logDir, 'error.log.1'));
    }

    /**
     * Log an error
     */
    log(error: Error | GitForWriterError, context?: Record<string, any>): void {
        this.rotateLogsIfNeeded();

        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            name: error.name,
            message: error.message,
            code: (error as GitForWriterError).code,
            severity: (error as GitForWriterError).severity,
            stack: error.stack,
            context: context || (error as GitForWriterError).context
        };

        const logLine = JSON.stringify(logEntry) + '\n';
        fs.appendFileSync(this.currentLogFile, logLine);
    }

    /**
     * Get log file path
     */
    getLogFilePath(): string {
        return this.currentLogFile;
    }
}

/**
 * Retry configuration
 */
export interface RetryConfig {
    maxRetries: number;
    initialDelay: number; // in milliseconds
    maxDelay: number; // in milliseconds
    backoffMultiplier: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
};

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    shouldRetry?: (error: Error) => boolean
): Promise<T> {
    const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let lastError: Error | undefined;
    let delay = finalConfig.initialDelay;

    for (let attempt = 0; attempt < finalConfig.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;

            // Don't retry on authentication/authorization errors (checked first)
            if (error.code === 'INVALID_API_KEY' || error.statusCode === 401 || error.statusCode === 403) {
                throw error;
            }

            // Don't retry on client errors (except rate limit)
            if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
                throw error;
            }

            // Check if we should retry this error (custom logic)
            if (shouldRetry && !shouldRetry(error)) {
                throw error;
            }

            // If this is the last attempt, throw the error
            if (attempt === finalConfig.maxRetries - 1) {
                break;
            }

            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay));

            // Increase delay for next attempt (exponential backoff)
            delay = Math.min(delay * finalConfig.backoffMultiplier, finalConfig.maxDelay);
        }
    }

    // All retry attempts failed, throw NetworkError with retry information
    const errorMessage = lastError ? lastError.message : 'Unknown error';
    throw new NetworkError(
        `Failed after ${finalConfig.maxRetries} attempts: ${errorMessage}`,
        'MAX_RETRIES_EXCEEDED',
        lastError
    );
}



