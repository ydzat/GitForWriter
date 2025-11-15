import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Writing session data
 */
export interface WritingSession {
    startTime: number;
    endTime: number;
    duration: number; // milliseconds
    wordsWritten: number;
    filePath: string;
    date: string; // YYYY-MM-DD
}

/**
 * Daily statistics
 */
export interface DailyStats {
    date: string; // YYYY-MM-DD
    wordsWritten: number;
    sessions: number;
    totalDuration: number; // milliseconds
    files: Set<string>;
}

/**
 * Statistics data structure
 */
export interface WritingStats {
    enabled: boolean;
    sessions: WritingSession[];
    dailyStats: { [date: string]: DailyStats };
    totalWords: number;
    currentStreak: number;
    longestStreak: number;
    lastWritingDate: string | null;
}

/**
 * Statistics collector for tracking writing habits and productivity
 */
export class StatsCollector {
    private stats: WritingStats;
    private statsPath: string;
    private currentSession: WritingSession | null = null;
    private sessionTimeout: NodeJS.Timeout | null = null;
    private readonly SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

    constructor(workspaceRoot: string) {
        this.statsPath = path.join(workspaceRoot, '.gitforwriter', 'stats.json');
        this.stats = this.loadStats();
    }

    /**
     * Load statistics from disk
     */
    private loadStats(): WritingStats {
        try {
            if (fs.existsSync(this.statsPath)) {
                const data = fs.readFileSync(this.statsPath, 'utf-8');
                const parsed = JSON.parse(data);
                
                // Convert dailyStats files Set from array
                if (parsed.dailyStats) {
                    Object.keys(parsed.dailyStats).forEach(date => {
                        parsed.dailyStats[date].files = new Set(parsed.dailyStats[date].files || []);
                    });
                }
                
                return parsed;
            }
        } catch (error) {
            console.error('Failed to load stats:', error);
        }

        return {
            enabled: false, // Opt-in by default
            sessions: [],
            dailyStats: {},
            totalWords: 0,
            currentStreak: 0,
            longestStreak: 0,
            lastWritingDate: null
        };
    }

    /**
     * Save statistics to disk
     */
    private saveStats(): void {
        try {
            const dir = path.dirname(this.statsPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Convert Sets to arrays for JSON serialization
            const toSave = {
                ...this.stats,
                dailyStats: Object.fromEntries(
                    Object.entries(this.stats.dailyStats).map(([date, stats]) => [
                        date,
                        { ...stats, files: Array.from(stats.files) }
                    ])
                )
            };

            fs.writeFileSync(this.statsPath, JSON.stringify(toSave, null, 2), 'utf-8');
        } catch (error) {
            console.error('Failed to save stats:', error);
        }
    }

    /**
     * Check if statistics collection is enabled
     */
    isEnabled(): boolean {
        return this.stats.enabled;
    }

    /**
     * Enable statistics collection
     */
    enable(): void {
        this.stats.enabled = true;
        this.saveStats();
    }

    /**
     * Disable statistics collection
     */
    disable(): void {
        this.stats.enabled = false;
        this.saveStats();
    }

    /**
     * Get current statistics
     */
    getStats(): WritingStats {
        return { ...this.stats };
    }

    /**
     * Clear all statistics
     */
    clearAll(): void {
        this.stats = {
            enabled: this.stats.enabled,
            sessions: [],
            dailyStats: {},
            totalWords: 0,
            currentStreak: 0,
            longestStreak: 0,
            lastWritingDate: null
        };
        this.saveStats();
    }

    /**
     * Start a new writing session
     */
    startSession(filePath: string): void {
        if (!this.stats.enabled) {
            return;
        }

        const now = Date.now();
        const date = this.getDateString(now);

        this.currentSession = {
            startTime: now,
            endTime: now,
            duration: 0,
            wordsWritten: 0,
            filePath,
            date
        };

        // Reset session timeout
        this.resetSessionTimeout();
    }

    /**
     * Record words written in current session
     */
    recordWordsWritten(filePath: string, wordCount: number, previousWordCount: number): void {
        if (!this.stats.enabled) {
            return;
        }

        const wordsAdded = Math.max(0, wordCount - previousWordCount);

        if (!this.currentSession || this.currentSession.filePath !== filePath) {
            this.startSession(filePath);
        }

        if (this.currentSession) {
            this.currentSession.wordsWritten += wordsAdded;
            this.currentSession.endTime = Date.now();
            this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime;

            this.resetSessionTimeout();
        }
    }

    /**
     * End current session and save statistics
     */
    endSession(): void {
        if (!this.currentSession) {
            return;
        }

        const session = this.currentSession;
        this.stats.sessions.push(session);
        this.stats.totalWords += session.wordsWritten;

        // Update daily stats
        this.updateDailyStats(session);

        // Update streaks
        this.updateStreaks(session.date);

        this.currentSession = null;
        this.saveStats();
    }

    /**
     * Reset session timeout
     */
    private resetSessionTimeout(): void {
        if (this.sessionTimeout) {
            clearTimeout(this.sessionTimeout);
        }

        this.sessionTimeout = setTimeout(() => {
            this.endSession();
        }, this.SESSION_TIMEOUT);
    }

    /**
     * Update daily statistics
     */
    private updateDailyStats(session: WritingSession): void {
        const date = session.date;

        if (!this.stats.dailyStats[date]) {
            this.stats.dailyStats[date] = {
                date,
                wordsWritten: 0,
                sessions: 0,
                totalDuration: 0,
                files: new Set()
            };
        }

        const daily = this.stats.dailyStats[date];
        daily.wordsWritten += session.wordsWritten;
        daily.sessions += 1;
        daily.totalDuration += session.duration;
        daily.files.add(session.filePath);
    }

    /**
     * Update writing streaks
     */
    private updateStreaks(currentDate: string): void {
        if (!this.stats.lastWritingDate) {
            this.stats.currentStreak = 1;
            this.stats.longestStreak = 1;
            this.stats.lastWritingDate = currentDate;
            return;
        }

        const lastDate = new Date(this.stats.lastWritingDate);
        const today = new Date(currentDate);
        const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            // Same day, no change to streak
            return;
        } else if (diffDays === 1) {
            // Consecutive day
            this.stats.currentStreak += 1;
            this.stats.longestStreak = Math.max(this.stats.longestStreak, this.stats.currentStreak);
        } else {
            // Streak broken
            this.stats.currentStreak = 1;
        }

        this.stats.lastWritingDate = currentDate;
    }

    /**
     * Get date string in YYYY-MM-DD format
     */
    private getDateString(timestamp: number): string {
        const date = new Date(timestamp);
        return date.toISOString().split('T')[0];
    }

    /**
     * Count words in text
     */
    static countWords(text: string): number {
        // Remove code blocks
        text = text.replace(/```[\s\S]*?```/g, '');
        // Remove inline code
        text = text.replace(/`[^`]*`/g, '');
        // Remove URLs
        text = text.replace(/https?:\/\/[^\s]+/g, '');
        // Count words (including Chinese characters)
        const words = text.match(/[\w\u4e00-\u9fa5]+/g);
        return words ? words.length : 0;
    }
}

