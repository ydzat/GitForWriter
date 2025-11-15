import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { StatsCollector } from '../../analytics/statsCollector';

describe('StatsCollector Unit Tests', () => {
    let tempDir: string;
    let statsCollector: StatsCollector;

    beforeEach(() => {
        // Create temporary directory for testing
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitforwriter-test-'));
        statsCollector = new StatsCollector(tempDir);
    });

    afterEach(() => {
        // Clean up temporary directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    describe('initialization', () => {
        it('should initialize with statistics disabled by default', () => {
            expect(statsCollector.isEnabled()).to.be.false;
        });

        it('should load existing statistics from disk', () => {
            const statsPath = path.join(tempDir, '.gitforwriter', 'stats.json');
            const dir = path.dirname(statsPath);
            fs.mkdirSync(dir, { recursive: true });

            const testStats = {
                enabled: true,
                sessions: [],
                dailyStats: {},
                totalWords: 100,
                currentStreak: 5,
                longestStreak: 10,
                lastWritingDate: '2025-01-01'
            };

            fs.writeFileSync(statsPath, JSON.stringify(testStats), 'utf-8');

            const newCollector = new StatsCollector(tempDir);
            const stats = newCollector.getStats();

            expect(stats.totalWords).to.equal(100);
            expect(stats.currentStreak).to.equal(5);
            expect(stats.longestStreak).to.equal(10);
        });
    });

    describe('enable/disable', () => {
        it('should enable statistics collection', () => {
            statsCollector.enable();
            expect(statsCollector.isEnabled()).to.be.true;
        });

        it('should disable statistics collection', () => {
            statsCollector.enable();
            statsCollector.disable();
            expect(statsCollector.isEnabled()).to.be.false;
        });

        it('should persist enabled state', () => {
            statsCollector.enable();
            const newCollector = new StatsCollector(tempDir);
            expect(newCollector.isEnabled()).to.be.true;
        });
    });

    describe('word counting', () => {
        it('should count words correctly', () => {
            const text = 'Hello world this is a test';
            expect(StatsCollector.countWords(text)).to.equal(6);
        });

        it('should count Chinese characters as words', () => {
            const text = '这是一个测试';
            expect(StatsCollector.countWords(text)).to.equal(6);
        });

        it('should ignore code blocks', () => {
            const text = 'Hello ```code block``` world';
            const count = StatsCollector.countWords(text);
            expect(count).to.equal(2);
        });

        it('should ignore inline code', () => {
            const text = 'Hello `code` world';
            const count = StatsCollector.countWords(text);
            expect(count).to.equal(2);
        });

        it('should ignore URLs', () => {
            const text = 'Visit https://example.com for more';
            const count = StatsCollector.countWords(text);
            expect(count).to.equal(3);
        });

        it('should handle empty text', () => {
            expect(StatsCollector.countWords('')).to.equal(0);
        });

        it('should handle mixed content', () => {
            const text = 'Hello world 你好世界 test';
            expect(StatsCollector.countWords(text)).to.equal(7); // 3 English words + 4 Chinese characters
        });
    });

    describe('session tracking', () => {
        beforeEach(() => {
            statsCollector.enable();
        });

        it('should not track when disabled', () => {
            statsCollector.disable();
            statsCollector.recordWordsWritten('/test/file.md', 100, 0);
            const stats = statsCollector.getStats();
            expect(stats.sessions.length).to.equal(0);
        });

        it('should start a new session', () => {
            statsCollector.startSession('/test/file.md');
            statsCollector.recordWordsWritten('/test/file.md', 100, 0);
            statsCollector.endSession();

            const stats = statsCollector.getStats();
            expect(stats.sessions.length).to.equal(1);
            expect(stats.sessions[0].wordsWritten).to.equal(100);
        });

        it('should track words added', () => {
            statsCollector.recordWordsWritten('/test/file.md', 100, 50);
            statsCollector.endSession();

            const stats = statsCollector.getStats();
            expect(stats.sessions[0].wordsWritten).to.equal(50);
        });

        it('should not count negative word changes', () => {
            statsCollector.recordWordsWritten('/test/file.md', 50, 100);
            statsCollector.endSession();

            const stats = statsCollector.getStats();
            expect(stats.sessions[0].wordsWritten).to.equal(0);
        });

        it('should update total words', () => {
            statsCollector.recordWordsWritten('/test/file.md', 100, 0);
            statsCollector.endSession();

            const stats = statsCollector.getStats();
            expect(stats.totalWords).to.equal(100);
        });
    });

    describe('clearAll', () => {
        it('should clear all statistics', () => {
            statsCollector.enable();
            statsCollector.recordWordsWritten('/test/file.md', 100, 0);
            statsCollector.endSession();

            statsCollector.clearAll();
            const stats = statsCollector.getStats();

            expect(stats.sessions.length).to.equal(0);
            expect(stats.totalWords).to.equal(0);
            expect(stats.currentStreak).to.equal(0);
            expect(stats.longestStreak).to.equal(0);
        });

        it('should preserve enabled state when clearing', () => {
            statsCollector.enable();
            statsCollector.clearAll();
            expect(statsCollector.isEnabled()).to.be.true;
        });
    });
});

