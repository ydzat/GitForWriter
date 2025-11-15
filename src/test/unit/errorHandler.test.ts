import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
    GitForWriterError,
    GitError,
    ConfigurationError,
    ExportError,
    NetworkError,
    ErrorSeverity,
    ErrorLogger,
    retryWithBackoff
} from '../../utils/errorHandler';

describe('ErrorHandler', () => {
    describe('Custom Error Classes', () => {
        describe('GitForWriterError', () => {
            it('should create error with all properties', () => {
                const error = new GitForWriterError(
                    'Test error',
                    'TEST_CODE',
                    ErrorSeverity.HIGH,
                    new Error('Original'),
                    { key: 'value' }
                );

                expect(error.message).to.equal('Test error');
                expect(error.code).to.equal('TEST_CODE');
                expect(error.severity).to.equal(ErrorSeverity.HIGH);
                expect(error.originalError).to.be.instanceOf(Error);
                expect(error.context).to.deep.equal({ key: 'value' });
                expect(error.name).to.equal('GitForWriterError');
            });

            it('should have default severity', () => {
                const error = new GitForWriterError('Test', 'CODE');
                expect(error.severity).to.equal(ErrorSeverity.MEDIUM);
            });

            it('should provide user message', () => {
                const error = new GitForWriterError('Test error', 'CODE');
                expect(error.getUserMessage()).to.equal('Test error');
            });

            it('should provide suggested actions', () => {
                const error = new GitForWriterError('Test', 'CODE');
                const actions = error.getSuggestedActions();
                expect(actions).to.be.an('array');
                expect(actions.length).to.be.greaterThan(0);
            });
        });

        describe('GitError', () => {
            it('should create git error', () => {
                const error = new GitError('Git failed', 'GIT_ERROR');
                expect(error).to.be.instanceOf(GitForWriterError);
                expect(error.severity).to.equal(ErrorSeverity.HIGH);
            });

            it('should provide user message for GIT_NOT_INITIALIZED', () => {
                const error = new GitError('Test', 'GIT_NOT_INITIALIZED');
                const message = error.getUserMessage();
                expect(message).to.include('Git repository is not initialized');
            });

            it('should provide user message for GIT_NOT_FOUND', () => {
                const error = new GitError('Test', 'GIT_NOT_FOUND');
                const message = error.getUserMessage();
                expect(message).to.include('Git is not installed');
            });

            it('should provide suggested actions for GIT_NOT_INITIALIZED', () => {
                const error = new GitError('Test', 'GIT_NOT_INITIALIZED');
                const actions = error.getSuggestedActions();
                expect(actions.some(a => a.includes('Git repository'))).to.be.true;
            });
        });

        describe('ConfigurationError', () => {
            it('should create configuration error', () => {
                const error = new ConfigurationError('Config failed', 'CONFIG_ERROR');
                expect(error).to.be.instanceOf(GitForWriterError);
                expect(error.severity).to.equal(ErrorSeverity.MEDIUM);
            });

            it('should provide user message for INVALID_API_KEY', () => {
                const error = new ConfigurationError('Test', 'INVALID_API_KEY');
                const message = error.getUserMessage();
                expect(message).to.include('Invalid API key');
            });

            it('should provide suggested actions for INVALID_API_KEY', () => {
                const error = new ConfigurationError('Test', 'INVALID_API_KEY');
                const actions = error.getSuggestedActions();
                expect(actions.some(a => a.includes('API key'))).to.be.true;
            });
        });

        describe('ExportError', () => {
            it('should create export error', () => {
                const error = new ExportError('Export failed', 'EXPORT_ERROR');
                expect(error).to.be.instanceOf(GitForWriterError);
            });

            it('should provide user message for UNSUPPORTED_FORMAT', () => {
                const error = new ExportError('Test', 'UNSUPPORTED_FORMAT', undefined, { format: 'xyz' });
                const message = error.getUserMessage();
                expect(message).to.include('Unsupported export format');
            });

            it('should provide user message for LATEX_NOT_FOUND', () => {
                const error = new ExportError('Test', 'LATEX_NOT_FOUND');
                const message = error.getUserMessage();
                expect(message).to.include('LaTeX is not installed');
            });
        });

        describe('NetworkError', () => {
            it('should create network error', () => {
                const error = new NetworkError('Network failed', 'NETWORK_ERROR');
                expect(error).to.be.instanceOf(GitForWriterError);
            });

            it('should provide user message for TIMEOUT', () => {
                const error = new NetworkError('Test', 'TIMEOUT');
                const message = error.getUserMessage();
                expect(message).to.include('timed out');
            });

            it('should provide user message for RATE_LIMIT', () => {
                const error = new NetworkError('Test', 'RATE_LIMIT');
                const message = error.getUserMessage();
                expect(message).to.include('Rate limit');
            });
        });
    });

    describe('ErrorLogger', () => {
        let tempDir: string;
        let logger: ErrorLogger;

        beforeEach(() => {
            // Create temporary directory for testing
            tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitforwriter-test-'));
            logger = new ErrorLogger(tempDir);
        });

        afterEach(() => {
            // Clean up temporary directory
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
        });

        it('should create log directory', () => {
            const logDir = path.join(tempDir, '.gitforwriter');
            expect(fs.existsSync(logDir)).to.be.true;
        });

        it('should log error to file', () => {
            const error = new GitError('Test error', 'TEST_CODE');
            logger.log(error);

            const logFile = logger.getLogFilePath();
            expect(fs.existsSync(logFile)).to.be.true;

            const content = fs.readFileSync(logFile, 'utf-8');
            expect(content).to.include('Test error');
            expect(content).to.include('TEST_CODE');
        });

        it('should log error with context', () => {
            const error = new Error('Test');
            logger.log(error, { key: 'value' });

            const logFile = logger.getLogFilePath();
            const content = fs.readFileSync(logFile, 'utf-8');
            const logEntry = JSON.parse(content.trim());

            expect(logEntry.context).to.deep.equal({ key: 'value' });
        });

        it('should include timestamp in log', () => {
            const error = new Error('Test');
            logger.log(error);

            const logFile = logger.getLogFilePath();
            const content = fs.readFileSync(logFile, 'utf-8');
            const logEntry = JSON.parse(content.trim());

            expect(logEntry.timestamp).to.be.a('string');
            expect(new Date(logEntry.timestamp).getTime()).to.be.greaterThan(0);
        });

        it('should rotate logs when size exceeds limit', () => {
            // Create a large log file
            const logFile = logger.getLogFilePath();
            const largeContent = 'x'.repeat(6 * 1024 * 1024); // 6MB
            fs.writeFileSync(logFile, largeContent);

            // Log another error to trigger rotation
            logger.log(new Error('Test'));

            // Check that rotation occurred
            const rotatedFile = path.join(path.dirname(logFile), 'error.log.1');
            expect(fs.existsSync(rotatedFile)).to.be.true;
        });
    });

    describe('retryWithBackoff', () => {
        it('should succeed on first attempt', async () => {
            let attempts = 0;
            const fn = async () => {
                attempts++;
                return 'success';
            };

            const result = await retryWithBackoff(fn);
            expect(result).to.equal('success');
            expect(attempts).to.equal(1);
        });

        it('should retry on failure', async () => {
            let attempts = 0;
            const fn = async () => {
                attempts++;
                if (attempts < 3) {
                    throw new Error('Temporary failure');
                }
                return 'success';
            };

            const result = await retryWithBackoff(fn, { maxRetries: 3, initialDelay: 10 });
            expect(result).to.equal('success');
            expect(attempts).to.equal(3);
        });

        it('should throw after max retries', async () => {
            const fn = async () => {
                throw new Error('Permanent failure');
            };

            try {
                await retryWithBackoff(fn, { maxRetries: 2, initialDelay: 10 });
                expect.fail('Should have thrown');
            } catch (error: any) {
                expect(error).to.be.instanceOf(NetworkError);
                expect(error.code).to.equal('MAX_RETRIES_EXCEEDED');
            }
        });

        it('should not retry on authentication errors', async () => {
            let attempts = 0;
            const fn = async () => {
                attempts++;
                const error: any = new Error('Invalid API key');
                error.code = 'INVALID_API_KEY';
                throw error;
            };

            try {
                await retryWithBackoff(fn, { maxRetries: 3, initialDelay: 10 });
                expect.fail('Should have thrown');
            } catch (error: any) {
                expect(attempts).to.equal(1); // Should not retry
                expect(error.code).to.equal('INVALID_API_KEY');
            }
        });

        it('should not retry on 4xx errors (except 429)', async () => {
            let attempts = 0;
            const fn = async () => {
                attempts++;
                const error: any = new Error('Bad request');
                error.statusCode = 400;
                throw error;
            };

            try {
                await retryWithBackoff(fn, { maxRetries: 3, initialDelay: 10 });
                expect.fail('Should have thrown');
            } catch (error: any) {
                expect(attempts).to.equal(1); // Should not retry
            }
        });

        it('should use custom shouldRetry function', async () => {
            let attempts = 0;
            const fn = async () => {
                attempts++;
                throw new Error('Custom error');
            };

            const shouldRetry = (error: Error) => error.message.includes('Custom');

            try {
                await retryWithBackoff(fn, { maxRetries: 3, initialDelay: 10 }, shouldRetry);
                expect.fail('Should have thrown');
            } catch (error: any) {
                expect(attempts).to.equal(3); // Should retry
            }
        });

        it('should use exponential backoff', async () => {
            const delays: number[] = [];
            let attempts = 0;
            let lastTime = Date.now();

            const fn = async () => {
                attempts++;
                if (attempts > 1) {
                    const now = Date.now();
                    delays.push(now - lastTime);
                    lastTime = now;
                }
                if (attempts < 4) {
                    throw new Error('Retry');
                }
                return 'success';
            };

            await retryWithBackoff(fn, {
                maxRetries: 4,
                initialDelay: 100,
                backoffMultiplier: 2
            });

            expect(attempts).to.equal(4);
            // Each delay should be roughly double the previous (with some tolerance)
            expect(delays[1]).to.be.greaterThan(delays[0] * 1.5);
        });

        it('should not retry when shouldRetry returns false', async () => {
            let attempts = 0;
            const fn = async () => {
                attempts++;
                throw new Error('Do not retry');
            };

            const shouldRetry = (error: Error) => !error.message.includes('Do not retry');

            try {
                await retryWithBackoff(fn, { maxRetries: 3, initialDelay: 10 }, shouldRetry);
                expect.fail('Should have thrown');
            } catch (error: any) {
                expect(attempts).to.equal(1); // Should not retry
                expect(error.message).to.include('Do not retry');
            }
        });
    });

    describe('NetworkError', () => {
        it('should provide user message for TIMEOUT error', () => {
            const error = new NetworkError('Request timed out', 'TIMEOUT');
            expect(error.getUserMessage()).to.include('timed out');
        });

        it('should provide user message for NO_CONNECTION error', () => {
            const error = new NetworkError('No connection', 'NO_CONNECTION');
            expect(error.getUserMessage()).to.include('No internet connection');
        });

        it('should provide user message for RATE_LIMIT error', () => {
            const error = new NetworkError('Rate limit', 'RATE_LIMIT');
            expect(error.getUserMessage()).to.include('Rate limit exceeded');
        });

        it('should provide suggested actions for TIMEOUT', () => {
            const error = new NetworkError('Timeout', 'TIMEOUT');
            const actions = error.getSuggestedActions();
            expect(actions.some(a => a.includes('internet connection'))).to.be.true;
        });

        it('should provide suggested actions for NO_CONNECTION', () => {
            const error = new NetworkError('No connection', 'NO_CONNECTION');
            const actions = error.getSuggestedActions();
            expect(actions.some(a => a.includes('Connect to the internet'))).to.be.true;
        });

        it('should provide suggested actions for RATE_LIMIT', () => {
            const error = new NetworkError('Rate limit', 'RATE_LIMIT');
            const actions = error.getSuggestedActions();
            expect(actions.some(a => a.includes('Wait a few minutes'))).to.be.true;
        });

        it('should provide default suggested actions for other errors', () => {
            const error = new NetworkError('Unknown network error', 'UNKNOWN');
            const actions = error.getSuggestedActions();
            expect(actions.some(a => a.includes('Try again later'))).to.be.true;
        });
    });

    describe('ExportError', () => {
        it('should provide user message for LATEX_NOT_FOUND', () => {
            const error = new ExportError('LaTeX not found', 'LATEX_NOT_FOUND');
            expect(error.getUserMessage()).to.include('LaTeX is not installed');
        });

        it('should provide user message for COMPILATION_FAILED', () => {
            const error = new ExportError('Compilation failed', 'COMPILATION_FAILED');
            expect(error.getUserMessage()).to.include('Export failed');
        });

        it('should provide user message for UNSUPPORTED_FORMAT', () => {
            const error = new ExportError('Unsupported format', 'UNSUPPORTED_FORMAT', undefined, { format: 'docx' });
            expect(error.getUserMessage()).to.include('Unsupported export format');
            expect(error.getUserMessage()).to.include('docx');
        });

        it('should provide suggested actions for LATEX_NOT_FOUND', () => {
            const error = new ExportError('LaTeX not found', 'LATEX_NOT_FOUND');
            const actions = error.getSuggestedActions();
            expect(actions.some(a => a.includes('Install LaTeX'))).to.be.true;
        });

        it('should provide suggested actions for UNSUPPORTED_FORMAT', () => {
            const error = new ExportError('Unsupported format', 'UNSUPPORTED_FORMAT');
            const actions = error.getSuggestedActions();
            expect(actions.some(a => a.includes('supported formats'))).to.be.true;
        });

        it('should provide default suggested actions for other errors', () => {
            const error = new ExportError('Unknown export error', 'UNKNOWN');
            const actions = error.getSuggestedActions();
            expect(actions.some(a => a.includes('file permissions'))).to.be.true;
        });
    });
});

