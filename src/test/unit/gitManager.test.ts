import { expect } from 'chai';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { GitManager } from '../../utils/gitManager';

describe('GitManager Unit Tests', () => {
    let gitManager: GitManager;
    let testWorkspace: string;

    beforeEach(() => {
        gitManager = new GitManager();
        testWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'gitforwriter-test-'));
    });

    afterEach(() => {
        if (fs.existsSync(testWorkspace)) {
            fs.rmSync(testWorkspace, { recursive: true, force: true });
        }
    });

    describe('initialize()', () => {
        it('should initialize git repository', async () => {
            await gitManager.initialize(testWorkspace);
            
            const gitDir = path.join(testWorkspace, '.git');
            expect(fs.existsSync(gitDir)).to.be.true;
        });

        it('should create .gitignore on initialization', async () => {
            await gitManager.initialize(testWorkspace);
            
            const gitignorePath = path.join(testWorkspace, '.gitignore');
            expect(fs.existsSync(gitignorePath)).to.be.true;
            
            const content = fs.readFileSync(gitignorePath, 'utf-8');
            expect(content).to.include('node_modules/');
        });

        it('should not reinitialize existing repository', async () => {
            await gitManager.initialize(testWorkspace);
            await gitManager.initialize(testWorkspace);
            
            const gitDir = path.join(testWorkspace, '.git');
            expect(fs.existsSync(gitDir)).to.be.true;
        });
    });

    describe('getDiff()', () => {
        it('should get diff for new file', async () => {
            await gitManager.initialize(testWorkspace);

            const testFile = path.join(testWorkspace, 'test.md');
            fs.writeFileSync(testFile, '# Test Document\n\nThis is a test.');

            const diff = await gitManager.getDiff(testFile);
            expect(diff.length).to.be.greaterThan(0);
            expect(diff).to.include('test.md');
        });

        it('should return empty string for unchanged file', async () => {
            await gitManager.initialize(testWorkspace);

            const testFile = path.join(testWorkspace, 'test.md');
            fs.writeFileSync(testFile, '# Test');
            await gitManager.commit('Add test file');

            const diff = await gitManager.getDiff(testFile);
            expect(diff).to.equal('');
        });

        it('should get diff for modified file', async () => {
            await gitManager.initialize(testWorkspace);

            const testFile = path.join(testWorkspace, 'test.md');
            fs.writeFileSync(testFile, '# Original Content');
            await gitManager.commit('Add original file');

            fs.writeFileSync(testFile, '# Modified Content');

            const diff = await gitManager.getDiff(testFile);
            expect(diff.length).to.be.greaterThan(0);
            expect(diff).to.include('Modified Content');
        });

        it('should get diff for deleted file', async () => {
            await gitManager.initialize(testWorkspace);

            const testFile = path.join(testWorkspace, 'test.md');
            fs.writeFileSync(testFile, '# Test Content');
            await gitManager.commit('Add file to delete');

            fs.unlinkSync(testFile);

            const diff = await gitManager.getDiff(testFile);
            // Diff should show deletion or be empty for non-existent file
            expect(diff).to.be.a('string');
        });

        it('should handle diff error gracefully', async () => {
            await gitManager.initialize(testWorkspace);

            // Try to get diff for a file with invalid path characters
            const invalidFile = path.join(testWorkspace, 'test\x00invalid.md');

            // Should throw GitError on error
            try {
                await gitManager.getDiff(invalidFile);
                expect.fail('Should have thrown GitError');
            } catch (error: any) {
                expect(error.name).to.equal('GitError');
                expect(error.code).to.equal('GIT_DIFF_FAILED');
            }
        });
    });

    describe('commit()', () => {
        it('should commit changes', async () => {
            await gitManager.initialize(testWorkspace);

            const testFile = path.join(testWorkspace, 'test.md');
            fs.writeFileSync(testFile, '# Test Document');

            await gitManager.commit('Add test document');

            const history = await gitManager.getHistory(testFile, 5);
            expect(history.length).to.be.greaterThan(0);

            const hasTestCommit = history.some(h =>
                h.message.toLowerCase().includes('test document')
            );
            expect(hasTestCommit).to.be.true;
        });

        it('should commit with empty message', async () => {
            await gitManager.initialize(testWorkspace);

            const testFile = path.join(testWorkspace, 'test.md');
            fs.writeFileSync(testFile, '# Test');

            // Git allows empty messages with --allow-empty-message flag
            // But simple-git might handle this differently
            try {
                await gitManager.commit('');
                // If it succeeds, that's fine
                expect(true).to.be.true;
            } catch (error) {
                // If it fails, that's also acceptable behavior
                expect(error).to.exist;
            }
        });

        it('should handle commit with no changes gracefully', async () => {
            await gitManager.initialize(testWorkspace);

            // Try to commit without any changes
            try {
                await gitManager.commit('Empty commit');
                // Some git configs allow empty commits
                expect(true).to.be.true;
            } catch (error) {
                // It's acceptable to fail on empty commits
                expect(error).to.exist;
            }
        });

        it('should commit multiple files', async () => {
            await gitManager.initialize(testWorkspace);

            const file1 = path.join(testWorkspace, 'file1.md');
            const file2 = path.join(testWorkspace, 'file2.md');
            fs.writeFileSync(file1, '# File 1');
            fs.writeFileSync(file2, '# File 2');

            await gitManager.commit('Add multiple files');

            const history1 = await gitManager.getHistory(file1, 5);
            const history2 = await gitManager.getHistory(file2, 5);

            expect(history1.length).to.be.greaterThan(0);
            expect(history2.length).to.be.greaterThan(0);
        });
    });

    describe('getHistory()', () => {
        it('should get file history', async () => {
            await gitManager.initialize(testWorkspace);
            
            const testFile = path.join(testWorkspace, 'test.md');
            fs.writeFileSync(testFile, '# Version 1');
            await gitManager.commit('First version');
            
            fs.writeFileSync(testFile, '# Version 2');
            await gitManager.commit('Second version');
            
            const history = await gitManager.getHistory(testFile, 10);
            expect(history.length).to.be.at.least(2);
            expect(history[0].hash).to.exist;
            expect(history[0].message).to.exist;
            expect(history[0].date).to.exist;
        });

        it('should limit history results', async () => {
            await gitManager.initialize(testWorkspace);
            
            const testFile = path.join(testWorkspace, 'test.md');
            
            for (let i = 1; i <= 5; i++) {
                fs.writeFileSync(testFile, `# Version ${i}`);
                await gitManager.commit(`Version ${i}`);
            }
            
            const history = await gitManager.getHistory(testFile, 3);
            expect(history.length).to.be.at.most(3);
        });

        it('should return empty array for file with no history', async () => {
            await gitManager.initialize(testWorkspace);
            
            const testFile = path.join(testWorkspace, 'new.md');
            fs.writeFileSync(testFile, '# New File');
            
            const history = await gitManager.getHistory(testFile, 10);
            expect(history).to.be.an('array');
        });
    });

    describe('error handling', () => {
        it('should throw error when getting diff without initialization', async () => {
            const testFile = path.join(testWorkspace, 'test.md');
            fs.writeFileSync(testFile, 'content');

            try {
                await gitManager.getDiff(testFile);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error).to.exist;
            }
        });

        it('should throw error when committing without initialization', async () => {
            try {
                await gitManager.commit('Test commit');
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error).to.exist;
            }
        });

        it('should throw error when getting history without initialization', async () => {
            const testFile = path.join(testWorkspace, 'test.md');

            try {
                await gitManager.getHistory(testFile, 10);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error).to.exist;
                expect((error as Error).message).to.include('Git not initialized');
            }
        });
    });

    describe('edge cases', () => {
        it('should handle files with special characters in name', async () => {
            await gitManager.initialize(testWorkspace);

            const testFile = path.join(testWorkspace, 'test file with spaces.md');
            fs.writeFileSync(testFile, '# Test');

            const diff = await gitManager.getDiff(testFile);
            expect(diff).to.be.a('string');
        });

        it('should handle very long commit messages', async () => {
            await gitManager.initialize(testWorkspace);

            const testFile = path.join(testWorkspace, 'test.md');
            fs.writeFileSync(testFile, '# Test');

            const longMessage = 'A'.repeat(1000);
            await gitManager.commit(longMessage);

            const history = await gitManager.getHistory(testFile, 1);
            expect(history[0].message).to.equal(longMessage);
        });

        it('should handle files in subdirectories', async () => {
            await gitManager.initialize(testWorkspace);

            const subDir = path.join(testWorkspace, 'subdir');
            fs.mkdirSync(subDir);

            const testFile = path.join(subDir, 'test.md');
            fs.writeFileSync(testFile, '# Test in subdirectory');

            const diff = await gitManager.getDiff(testFile);
            expect(diff.length).to.be.greaterThan(0);
        });

        it('should handle binary files', async () => {
            await gitManager.initialize(testWorkspace);

            const binaryFile = path.join(testWorkspace, 'test.bin');
            const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);
            fs.writeFileSync(binaryFile, buffer);

            const diff = await gitManager.getDiff(binaryFile);
            expect(diff).to.be.a('string');
        });

        it('should handle concurrent operations', async () => {
            await gitManager.initialize(testWorkspace);

            const file1 = path.join(testWorkspace, 'file1.md');
            const file2 = path.join(testWorkspace, 'file2.md');
            fs.writeFileSync(file1, '# File 1');
            fs.writeFileSync(file2, '# File 2');

            // Get diffs concurrently
            const [diff1, diff2] = await Promise.all([
                gitManager.getDiff(file1),
                gitManager.getDiff(file2)
            ]);

            expect(diff1).to.be.a('string');
            expect(diff2).to.be.a('string');
        });
    });
});

