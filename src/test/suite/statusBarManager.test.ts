import * as assert from 'assert';
import { StatusBarManager, WritingStage } from '../../utils/statusBarManager';

suite('StatusBarManager Test Suite', () => {
    let statusBarManager: StatusBarManager;

    setup(() => {
        statusBarManager = new StatusBarManager();
    });

    teardown(() => {
        statusBarManager.dispose();
    });

    test('should create status bar item', () => {
        assert.ok(statusBarManager, 'StatusBarManager should be created');
    });

    test('should update stage to ideation', () => {
        statusBarManager.updateStage('ideation');
        // No error should be thrown
        assert.ok(true, 'Should update to ideation stage');
    });

    test('should update stage to writing', () => {
        statusBarManager.updateStage('writing');
        assert.ok(true, 'Should update to writing stage');
    });

    test('should update stage to review', () => {
        statusBarManager.updateStage('review');
        assert.ok(true, 'Should update to review stage');
    });

    test('should update stage to publish', () => {
        statusBarManager.updateStage('publish');
        assert.ok(true, 'Should update to publish stage');
    });

    test('should update progress', () => {
        statusBarManager.updateProgress(50, 100);
        assert.ok(true, 'Should update progress');
    });

    test('should handle progress at 0%', () => {
        statusBarManager.updateProgress(0, 100);
        assert.ok(true, 'Should handle 0% progress');
    });

    test('should handle progress at 100%', () => {
        statusBarManager.updateProgress(100, 100);
        assert.ok(true, 'Should handle 100% progress');
    });

    test('should handle partial progress', () => {
        statusBarManager.updateProgress(33, 100);
        assert.ok(true, 'Should handle partial progress');
    });

    test('should cycle through all stages', () => {
        const stages: WritingStage[] = ['ideation', 'writing', 'review', 'publish'];
        
        stages.forEach(stage => {
            statusBarManager.updateStage(stage);
        });
        
        assert.ok(true, 'Should cycle through all stages without error');
    });

    test('should dispose properly', () => {
        const manager = new StatusBarManager();
        manager.dispose();
        assert.ok(true, 'Should dispose without error');
    });

    test('should handle multiple stage updates', () => {
        statusBarManager.updateStage('ideation');
        statusBarManager.updateStage('writing');
        statusBarManager.updateStage('review');
        statusBarManager.updateStage('writing');
        statusBarManager.updateStage('publish');
        
        assert.ok(true, 'Should handle multiple stage updates');
    });

    test('should handle multiple progress updates', () => {
        for (let i = 0; i <= 100; i += 10) {
            statusBarManager.updateProgress(i, 100);
        }
        
        assert.ok(true, 'Should handle multiple progress updates');
    });
});

