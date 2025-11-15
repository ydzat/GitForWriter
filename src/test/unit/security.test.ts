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

        it('Should reject AI response that is too large', () => {
            const largeResponse = { data: 'x'.repeat(11 * 1024 * 1024) }; // 11MB
            assert.throws(() => {
                InputValidator.validateAIResponse(largeResponse);
            }, /response too large/);
        });

        it('Should accept valid AI response', () => {
            const response = { data: 'Valid response', tokenUsage: { total: 100 } };
            assert.ok(InputValidator.validateAIResponse(response));
        });
    });
});

