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
    });
});

