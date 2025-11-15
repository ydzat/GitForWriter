import * as assert from 'assert';
import { InputValidator } from '../../utils/inputValidator';
import { SecretManager } from '../../config/secretManager';
import { ErrorLogger } from '../../utils/errorHandler';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('Security Test Suite', () => {
    describe('Input Validation - Path Traversal', () => {
        const workspaceRoot = '/workspace/test';

        it('Should reject path traversal with ../', () => {
            assert.throws(() => {
                InputValidator.validateFilePath('../../../etc/passwd', workspaceRoot);
            }, /Path traversal detected/);
        });

        it('Should reject path traversal with absolute path outside workspace', () => {
            assert.throws(() => {
                InputValidator.validateFilePath('/etc/passwd', workspaceRoot);
            }, /outside workspace/);
        });

        it('Should reject null byte in path', () => {
            assert.throws(() => {
                InputValidator.validateFilePath('file.txt\0.md', workspaceRoot);
            }, /null byte detected/);
        });

        it('Should accept valid relative path', () => {
            const result = InputValidator.validateFilePath('docs/file.md', workspaceRoot);
            assert.ok(result.startsWith(workspaceRoot));
        });

        it('Should accept path equal to workspace root', () => {
            const result = InputValidator.validateFilePath('.', workspaceRoot);
            assert.strictEqual(result, workspaceRoot);
        });

        it('Should accept valid absolute path within workspace', () => {
            const validPath = path.join(workspaceRoot, 'file.md');
            const result = InputValidator.validateFilePath(validPath, workspaceRoot);
            assert.ok(result.startsWith(workspaceRoot));
        });
    });

    describe('Input Validation - LaTeX Filename', () => {
        it('Should reject filename without .tex extension', () => {
            assert.throws(() => {
                InputValidator.validateLatexFilename('file.txt');
            }, /must end with .tex/);
        });

        it('Should reject filename with path traversal', () => {
            assert.throws(() => {
                InputValidator.validateLatexFilename('../file.tex');
            }, /path traversal detected/);
        });

        it('Should reject filename with path separators', () => {
            assert.throws(() => {
                InputValidator.validateLatexFilename('dir/file.tex');
            }, /contains invalid characters/);
        });

        it('Should reject filename with null byte', () => {
            assert.throws(() => {
                InputValidator.validateLatexFilename('file\0.tex');
            }, /null byte detected/);
        });

        it('Should reject filename that is too long', () => {
            const longName = 'a'.repeat(300) + '.tex';
            assert.throws(() => {
                InputValidator.validateLatexFilename(longName);
            }, /too long/);
        });

        it('Should accept valid LaTeX filename', () => {
            assert.ok(InputValidator.validateLatexFilename('document.tex'));
        });
    });

    describe('Input Validation - XSS Prevention', () => {
        it('Should escape HTML special characters', () => {
            const malicious = '<script>alert("XSS")</script>';
            const sanitized = InputValidator.sanitizeHtml(malicious);
            assert.strictEqual(sanitized, '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
        });

        it('Should escape ampersands', () => {
            const text = 'A & B';
            const sanitized = InputValidator.sanitizeHtml(text);
            assert.strictEqual(sanitized, 'A &amp; B');
        });

        it('Should escape single quotes', () => {
            const text = "It's a test";
            const sanitized = InputValidator.sanitizeHtml(text);
            assert.strictEqual(sanitized, 'It&#039;s a test');
        });
    });

    describe('Input Validation - URL Validation', () => {
        it('Should reject javascript: protocol', () => {
            assert.throws(() => {
                InputValidator.validateUrl('javascript:alert("XSS")');
            }, /unsupported protocol/);
        });

        it('Should reject data: protocol', () => {
            assert.throws(() => {
                InputValidator.validateUrl('data:text/html,<script>alert("XSS")</script>');
            }, /unsupported protocol/);
        });

        it('Should reject file: protocol', () => {
            assert.throws(() => {
                InputValidator.validateUrl('file:///etc/passwd');
            }, /unsupported protocol/);
        });

        it('Should accept valid HTTP URL', () => {
            assert.ok(InputValidator.validateUrl('http://example.com'));
        });

        it('Should accept valid HTTPS URL', () => {
            assert.ok(InputValidator.validateUrl('https://example.com'));
        });

        it('Should reject URL with null byte', () => {
            assert.throws(() => {
                InputValidator.validateUrl('http://example.com\0');
            }, /null byte detected/);
        });
    });

    describe('Input Validation - Commit Message', () => {
        it('Should reject empty commit message', () => {
            assert.throws(() => {
                InputValidator.validateCommitMessage('');
            }, /must be a non-empty string/);
        });

        it('Should reject commit message with only whitespace', () => {
            assert.throws(() => {
                InputValidator.validateCommitMessage('   ');
            }, /cannot be empty/);
        });

        it('Should reject commit message with null byte', () => {
            assert.throws(() => {
                InputValidator.validateCommitMessage('Commit\0message');
            }, /null byte detected/);
        });

        it('Should reject commit message that is too long', () => {
            const longMessage = 'a'.repeat(1001);
            assert.throws(() => {
                InputValidator.validateCommitMessage(longMessage);
            }, /too long/);
        });

        it('Should accept valid commit message', () => {
            const message = 'Add new feature';
            const result = InputValidator.validateCommitMessage(message);
            assert.strictEqual(result, message);
        });

        it('Should trim whitespace from commit message', () => {
            const message = '  Add new feature  ';
            const result = InputValidator.validateCommitMessage(message);
            assert.strictEqual(result, 'Add new feature');
        });
    });

    describe('Rate Limiter - Parameter Validation', () => {
        it('Should reject negative maxTokens', () => {
            const { RateLimiter } = require('../../utils/rateLimiter');
            assert.throws(() => {
                new RateLimiter(-1, 1);
            }, /must be positive numbers/);
        });

        it('Should reject zero maxTokens', () => {
            const { RateLimiter } = require('../../utils/rateLimiter');
            assert.throws(() => {
                new RateLimiter(0, 1);
            }, /must be positive numbers/);
        });

        it('Should reject negative refillRate', () => {
            const { RateLimiter } = require('../../utils/rateLimiter');
            assert.throws(() => {
                new RateLimiter(10, -1);
            }, /must be positive numbers/);
        });

        it('Should reject zero refillRate', () => {
            const { RateLimiter } = require('../../utils/rateLimiter');
            assert.throws(() => {
                new RateLimiter(10, 0);
            }, /must be positive numbers/);
        });

        it('Should accept valid parameters', () => {
            const { RateLimiter } = require('../../utils/rateLimiter');
            const limiter = new RateLimiter(10, 1);
            assert.ok(limiter);
        });
    });

    describe('API Key Security', () => {
        it('Should mask OpenAI API key', () => {
            const apiKey = 'sk-1234567890abcdefghijklmnopqrstuvwxyz';
            const masked = SecretManager.maskApiKey(apiKey);
            assert.ok(masked.startsWith('sk-'));
            assert.ok(masked.includes('...'));
            assert.ok(masked.endsWith(apiKey.slice(-4)));
            assert.ok(!masked.includes('1234567890'));
        });

        it('Should mask Claude API key', () => {
            const apiKey = 'sk-ant-1234567890abcdefghijklmnopqrstuvwxyz';
            const masked = SecretManager.maskApiKey(apiKey);
            assert.ok(masked.startsWith('sk-ant-'));
            assert.ok(masked.includes('...'));
            assert.ok(masked.endsWith(apiKey.slice(-4)));
            assert.ok(!masked.includes('1234567890'));
        });

        it('Should mask short API key', () => {
            const apiKey = 'short';
            const masked = SecretManager.maskApiKey(apiKey);
            assert.strictEqual(masked, '***');
        });
    });

    describe('Error Logging - Sensitive Data Sanitization', () => {
        let tempDir: string;
        let logger: ErrorLogger;

        beforeEach(() => {
            tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitforwriter-test-'));
            logger = new ErrorLogger(tempDir);
        });

        afterEach(() => {
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
        });

        it('Should sanitize OpenAI API key in error message', () => {
            const error = new Error('Failed with API key: sk-1234567890abcdefghijklmnopqrstuvwxyz');
            logger.log(error);

            const logFile = path.join(tempDir, '.gitforwriter', 'error.log');
            const logContent = fs.readFileSync(logFile, 'utf-8');

            assert.ok(!logContent.includes('sk-1234567890'));
            assert.ok(logContent.includes('sk-***REDACTED***'));
        });

        it('Should sanitize Claude API key in error message', () => {
            const error = new Error('Failed with API key: sk-ant-1234567890abcdefghijklmnopqrstuvwxyz');
            logger.log(error);

            const logFile = path.join(tempDir, '.gitforwriter', 'error.log');
            const logContent = fs.readFileSync(logFile, 'utf-8');

            assert.ok(!logContent.includes('sk-ant-1234567890'));
            assert.ok(logContent.includes('sk-ant-***REDACTED***'));
        });

        it('Should sanitize API key in context object', () => {
            const error = new Error('API call failed');
            logger.log(error, { apiKey: 'sk-1234567890abcdefghijklmnopqrstuvwxyz' });

            const logFile = path.join(tempDir, '.gitforwriter', 'error.log');
            const logContent = fs.readFileSync(logFile, 'utf-8');

            assert.ok(!logContent.includes('sk-1234567890'));
            assert.ok(logContent.includes('***REDACTED***'));
        });

        it('Should handle circular references in context object', () => {
            const error = new Error('API call failed');
            const circularContext: any = { data: 'test' };
            circularContext.self = circularContext;

            // Should not throw error, should handle gracefully
            assert.doesNotThrow(() => {
                logger.log(error, circularContext);
            });

            const logFile = path.join(tempDir, '.gitforwriter', 'error.log');
            const logContent = fs.readFileSync(logFile, 'utf-8');
            assert.ok(logContent.includes('[Circular Reference]'));
        });

        it('Should handle deeply nested objects', () => {
            const error = new Error('API call failed');
            let deepContext: any = { level: 0 };
            let current = deepContext;

            // Create 15 levels of nesting (exceeds max depth of 10)
            for (let i = 1; i < 15; i++) {
                current.nested = { level: i };
                current = current.nested;
            }

            // Should not throw error, should handle gracefully
            assert.doesNotThrow(() => {
                logger.log(error, deepContext);
            });

            const logFile = path.join(tempDir, '.gitforwriter', 'error.log');
            const logContent = fs.readFileSync(logFile, 'utf-8');
            assert.ok(logContent.includes('[Max Depth Exceeded]'));
        });
    });

    describe('AI Response Validation', () => {
        it('Should reject null AI response', () => {
            assert.throws(() => {
                InputValidator.validateAIResponse(null);
            }, /null or undefined/);
        });

        it('Should reject undefined AI response', () => {
            assert.throws(() => {
                InputValidator.validateAIResponse(undefined);
            }, /null or undefined/);
        });

        it('Should reject AI response with circular reference', () => {
            const circularResponse: any = { data: 'test' };
            circularResponse.self = circularResponse;
            assert.throws(() => {
                InputValidator.validateAIResponse(circularResponse);
            }, /circular reference detected/);
        });

        it('Should reject AI response with too large text field', () => {
            const largeResponse = { text: 'x'.repeat(11 * 1024 * 1024) }; // 11MB text field
            assert.throws(() => {
                InputValidator.validateAIResponse(largeResponse);
            }, /text field too large/);
        });

        it('Should reject AI response with too large content field', () => {
            const largeResponse = { content: 'x'.repeat(11 * 1024 * 1024) }; // 11MB content field
            assert.throws(() => {
                InputValidator.validateAIResponse(largeResponse);
            }, /content field too large/);
        });

        it('Should reject AI response with too large choice text', () => {
            const largeResponse = {
                choices: [
                    { text: 'x'.repeat(11 * 1024 * 1024) }
                ]
            };
            assert.throws(() => {
                InputValidator.validateAIResponse(largeResponse);
            }, /choice text too large/);
        });

        it('Should reject AI response with too large choice message content', () => {
            const largeResponse = {
                choices: [
                    { message: { content: 'x'.repeat(11 * 1024 * 1024) } }
                ]
            };
            assert.throws(() => {
                InputValidator.validateAIResponse(largeResponse);
            }, /choice message content too large/);
        });

        it('Should accept valid AI response', () => {
            const response = { data: 'Valid response', tokenUsage: { total: 100 } };
            assert.ok(InputValidator.validateAIResponse(response));
        });

        it('Should accept AI response with reasonable text field', () => {
            const response = { text: 'x'.repeat(1024 * 1024) }; // 1MB is OK
            assert.ok(InputValidator.validateAIResponse(response));
        });

        it('Should accept AI response with choices array', () => {
            const response = {
                choices: [
                    { message: { content: 'Valid response' } }
                ]
            };
            assert.ok(InputValidator.validateAIResponse(response));
        });
    });

    describe('Config Value Validation', () => {
        it('Should validate string type correctly', () => {
            assert.ok(InputValidator.validateConfigValue('test', 'string'));
        });

        it('Should validate number type correctly', () => {
            assert.ok(InputValidator.validateConfigValue(123, 'number'));
        });

        it('Should validate boolean type correctly', () => {
            assert.ok(InputValidator.validateConfigValue(true, 'boolean'));
        });

        it('Should validate array type correctly', () => {
            assert.ok(InputValidator.validateConfigValue([1, 2, 3], 'array'));
        });

        it('Should validate object type correctly', () => {
            assert.ok(InputValidator.validateConfigValue({ key: 'value' }, 'object'));
        });

        it('Should validate null type correctly', () => {
            assert.ok(InputValidator.validateConfigValue(null, 'null'));
        });

        it('Should reject array when expecting object', () => {
            assert.throws(() => {
                InputValidator.validateConfigValue([1, 2, 3], 'object');
            }, /expected object, got array/);
        });

        it('Should reject null when expecting object', () => {
            assert.throws(() => {
                InputValidator.validateConfigValue(null, 'object');
            }, /expected object, got null/);
        });

        it('Should reject string when expecting number', () => {
            assert.throws(() => {
                InputValidator.validateConfigValue('123', 'number');
            }, /expected number, got string/);
        });

        it('Should validate allowed values', () => {
            assert.ok(InputValidator.validateConfigValue('option1', 'string', ['option1', 'option2']));
        });

        it('Should reject value not in allowed values', () => {
            assert.throws(() => {
                InputValidator.validateConfigValue('option3', 'string', ['option1', 'option2']);
            }, /must be one of option1, option2/);
        });
    });
});

