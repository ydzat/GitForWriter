import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { GitManager } from '../../utils/gitManager';

suite('GitManager Test Suite', () => {
    let gitManager: GitManager;
    let testWorkspace: string;

    setup(() => {
        gitManager = new GitManager();
        // Create a temporary directory for testing
        testWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'gitforwriter-test-'));
    });

    teardown(() => {
        // Clean up test workspace
        if (fs.existsSync(testWorkspace)) {
            fs.rmSync(testWorkspace, { recursive: true, force: true });
        }
    });

    test('should initialize git repository', async () => {
        await gitManager.initialize(testWorkspace);
        
        const gitDir = path.join(testWorkspace, '.git');
        assert.strictEqual(fs.existsSync(gitDir), true, 'Git directory should exist');
    });

    test('should create .gitignore on initialization', async () => {
        await gitManager.initialize(testWorkspace);
        
        const gitignorePath = path.join(testWorkspace, '.gitignore');
        assert.strictEqual(fs.existsSync(gitignorePath), true, '.gitignore should exist');
        
        const content = fs.readFileSync(gitignorePath, 'utf-8');
        assert.ok(content.includes('node_modules/'), '.gitignore should contain node_modules/');
    });

    test('should not reinitialize existing repository', async () => {
        await gitManager.initialize(testWorkspace);
        
        // Initialize again
        await gitManager.initialize(testWorkspace);
        
        const gitDir = path.join(testWorkspace, '.git');
        assert.strictEqual(fs.existsSync(gitDir), true, 'Git directory should still exist');
    });

    test('should get diff for new file', async () => {
        await gitManager.initialize(testWorkspace);
        
        const testFile = path.join(testWorkspace, 'test.md');
        fs.writeFileSync(testFile, '# Test Document\n\nThis is a test.');
        
        const diff = await gitManager.getDiff(testFile);
        assert.ok(diff.length > 0, 'Diff should not be empty for new file');
        assert.ok(diff.includes('test.md'), 'Diff should mention the file name');
    });

    test('should commit changes', async () => {
        await gitManager.initialize(testWorkspace);
        
        const testFile = path.join(testWorkspace, 'test.md');
        fs.writeFileSync(testFile, '# Test Document');
        
        await gitManager.commit('Add test document');
        
        const history = await gitManager.getHistory(testFile, 5);
        assert.ok(history.length > 0, 'Should have commit history');
        assert.ok(
            history.some(h => h.message.includes('test document')),
            'Should find the test commit'
        );
    });

    test('should get file history', async () => {
        await gitManager.initialize(testWorkspace);
        
        const testFile = path.join(testWorkspace, 'test.md');
        fs.writeFileSync(testFile, '# Version 1');
        await gitManager.commit('First version');
        
        fs.writeFileSync(testFile, '# Version 2');
        await gitManager.commit('Second version');
        
        const history = await gitManager.getHistory(testFile, 10);
        assert.strictEqual(history.length >= 2, true, 'Should have at least 2 commits');
        assert.ok(history[0].hash, 'Commit should have hash');
        assert.ok(history[0].message, 'Commit should have message');
        assert.ok(history[0].date, 'Commit should have date');
    });

    test('should limit history results', async () => {
        await gitManager.initialize(testWorkspace);
        
        const testFile = path.join(testWorkspace, 'test.md');
        
        // Create multiple commits
        for (let i = 1; i <= 5; i++) {
            fs.writeFileSync(testFile, `# Version ${i}`);
            await gitManager.commit(`Version ${i}`);
        }
        
        const history = await gitManager.getHistory(testFile, 3);
        assert.strictEqual(history.length <= 3, true, 'Should limit to 3 results');
    });
});

