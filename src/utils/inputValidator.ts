import * as path from 'path';

/**
 * Input validation utilities to prevent security vulnerabilities
 */
export class InputValidator {
    /**
     * Validate and sanitize a file path to prevent path traversal attacks
     * @param filePath The file path to validate
     * @param workspaceRoot The workspace root directory
     * @returns Sanitized absolute path
     * @throws Error if path is invalid or attempts path traversal
     */
    static validateFilePath(filePath: string, workspaceRoot: string): string {
        if (!filePath || typeof filePath !== 'string') {
            throw new Error('Invalid file path: path must be a non-empty string');
        }

        // Normalize the path to resolve any '..' or '.' segments
        const normalizedPath = path.normalize(filePath);
        
        // Resolve to absolute path
        const absolutePath = path.isAbsolute(normalizedPath) 
            ? normalizedPath 
            : path.join(workspaceRoot, normalizedPath);

        // Ensure the resolved path is within the workspace
        const resolvedPath = path.resolve(absolutePath);
        const resolvedWorkspace = path.resolve(workspaceRoot);

        if (!resolvedPath.startsWith(resolvedWorkspace)) {
            throw new Error(`Path traversal detected: ${filePath} is outside workspace`);
        }

        // Check for null bytes (can be used to bypass file extension checks)
        if (filePath.includes('\0')) {
            throw new Error('Invalid file path: null byte detected');
        }

        // Check for suspicious patterns (only for relative paths)
        // Absolute paths are already validated above
        if (!path.isAbsolute(filePath)) {
            const suspiciousPatterns = [
                /\.\.[\/\\]/,  // Parent directory traversal
            ];

            for (const pattern of suspiciousPatterns) {
                if (pattern.test(filePath)) {
                    throw new Error(`Invalid file path: suspicious pattern detected in ${filePath}`);
                }
            }
        }

        return resolvedPath;
    }

    /**
     * Validate a filename for LaTeX compilation
     * Prevents command injection and path traversal
     * @param filename The filename to validate
     * @returns True if valid
     * @throws Error if filename is invalid
     */
    static validateLatexFilename(filename: string): boolean {
        if (!filename || typeof filename !== 'string') {
            throw new Error('Invalid filename: must be a non-empty string');
        }

        // Must end with .tex
        if (!filename.endsWith('.tex')) {
            throw new Error('Invalid filename: must end with .tex');
        }

        // No path traversal
        if (filename.includes('..')) {
            throw new Error('Invalid filename: path traversal detected');
        }

        // No path separators (filename only, not a path)
        if (/[<>:"|?*\\/]/.test(filename)) {
            throw new Error('Invalid filename: contains invalid characters');
        }

        // No null bytes
        if (filename.includes('\0')) {
            throw new Error('Invalid filename: null byte detected');
        }

        // Reasonable length (prevent buffer overflow attacks)
        if (filename.length > 255) {
            throw new Error('Invalid filename: too long (max 255 characters)');
        }

        return true;
    }

    /**
     * Validate a URL to prevent injection attacks
     * @param url The URL to validate
     * @returns True if valid
     * @throws Error if URL is invalid
     */
    static validateUrl(url: string): boolean {
        if (!url || typeof url !== 'string') {
            throw new Error('Invalid URL: must be a non-empty string');
        }

        // Check for null bytes
        if (url.includes('\0')) {
            throw new Error('Invalid URL: null byte detected');
        }

        // Basic URL format validation
        try {
            const parsed = new URL(url);
            
            // Only allow http and https protocols
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                throw new Error(`Invalid URL: unsupported protocol ${parsed.protocol}`);
            }

            return true;
        } catch (error: any) {
            throw new Error(`Invalid URL: ${error.message}`);
        }
    }

    /**
     * Sanitize text for safe display in HTML
     * Prevents XSS attacks
     * @param text The text to sanitize
     * @returns Sanitized text
     */
    static sanitizeHtml(text: string): string {
        if (typeof text !== 'string') {
            return '';
        }

        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Validate AI response to ensure it's safe to use
     * @param response The AI response to validate
     * @returns True if valid
     * @throws Error if response is invalid
     */
    static validateAIResponse(response: any): boolean {
        if (!response) {
            throw new Error('Invalid AI response: response is null or undefined');
        }

        // Check for circular references (prevent JSON.stringify from throwing)
        function hasCircular(obj: any, seen: WeakSet<any> = new WeakSet()): boolean {
            if (obj && typeof obj === 'object') {
                if (seen.has(obj)) {
                    return true;
                }
                seen.add(obj);
                for (const key in obj) {
                    if (Object.prototype.hasOwnProperty.call(obj, key)) {
                        if (hasCircular(obj[key], seen)) {
                            return true;
                        }
                    }
                }
            }
            return false;
        }

        if (hasCircular(response)) {
            throw new Error('Invalid AI response: circular reference detected');
        }

        // Check key fields for reasonable size (prevent memory exhaustion)
        const maxFieldSize = 10 * 1024 * 1024; // 10MB per field

        // Check common response fields
        if (typeof response.text === 'string' && response.text.length > maxFieldSize) {
            throw new Error('Invalid AI response: text field too large');
        }

        if (typeof response.content === 'string' && response.content.length > maxFieldSize) {
            throw new Error('Invalid AI response: content field too large');
        }

        // Check choices array (OpenAI format)
        if (Array.isArray(response.choices)) {
            for (const choice of response.choices) {
                if (choice && typeof choice.text === 'string' && choice.text.length > maxFieldSize) {
                    throw new Error('Invalid AI response: choice text too large');
                }
                if (choice && choice.message && typeof choice.message.content === 'string' && choice.message.content.length > maxFieldSize) {
                    throw new Error('Invalid AI response: choice message content too large');
                }
            }
        }

        return true;
    }

    /**
     * Validate and sanitize a commit message
     * @param message The commit message to validate
     * @returns Sanitized commit message
     * @throws Error if message is invalid
     */
    static validateCommitMessage(message: string): string {
        if (!message || typeof message !== 'string') {
            throw new Error('Invalid commit message: must be a non-empty string');
        }

        // Trim whitespace
        const trimmed = message.trim();

        if (trimmed.length === 0) {
            throw new Error('Invalid commit message: cannot be empty');
        }

        // Check for null bytes
        if (trimmed.includes('\0')) {
            throw new Error('Invalid commit message: null byte detected');
        }

        // Reasonable length
        if (trimmed.length > 1000) {
            throw new Error('Invalid commit message: too long (max 1000 characters)');
        }

        return trimmed;
    }

    /**
     * Validate configuration value
     * @param value The value to validate
     * @param type Expected type ('string', 'number', 'boolean', 'object', 'array', 'null')
     * @param allowedValues Optional array of allowed values
     * @returns True if valid
     * @throws Error if value is invalid
     */
    static validateConfigValue(value: any, type: string, allowedValues?: any[]): boolean {
        // Type check with proper handling for array, null, and object
        let actualType: string;

        if (value === null) {
            actualType = 'null';
        } else if (Array.isArray(value)) {
            actualType = 'array';
        } else {
            actualType = typeof value;
        }

        if (actualType !== type) {
            throw new Error(`Invalid config value: expected ${type}, got ${actualType}`);
        }

        // Check allowed values if provided
        if (allowedValues && !allowedValues.includes(value)) {
            throw new Error(`Invalid config value: must be one of ${allowedValues.join(', ')}`);
        }

        return true;
    }
}

