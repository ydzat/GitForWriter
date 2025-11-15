import simpleGit, { SimpleGit, StatusResult } from 'simple-git';
import * as path from 'path';
import * as fs from 'fs';
import { GitError } from './errorHandler';

interface CachedStatus {
    status: StatusResult;
    timestamp: number;
}

export class GitManager {
    private git: SimpleGit | null = null;
    private workspaceRoot: string = '';
    private statusCache: CachedStatus | null = null;
    private statusCacheTTL: number = 5000; // 5 seconds cache
    private diffCache: Map<string, { diff: string; timestamp: number }> = new Map();
    private diffCacheTTL: number = 3000; // 3 seconds cache for diffs

    async initialize(workspacePath: string): Promise<void> {
        this.workspaceRoot = workspacePath;
        this.git = simpleGit(workspacePath);

        // Check if git is initialized
        const isRepo = await this.git.checkIsRepo();
        
        if (!isRepo) {
            await this.git.init();
            
            // Create initial gitignore
            const gitignorePath = path.join(workspacePath, '.gitignore');
            if (!fs.existsSync(gitignorePath)) {
                fs.writeFileSync(gitignorePath, 'node_modules/\n.DS_Store\n');
            }

            // Initial commit
            await this.git.add('.gitignore');
            await this.git.commit('Initial commit');
        }
    }

    /**
     * Get cached status or fetch new one
     */
    private async getStatus(): Promise<StatusResult> {
        const now = Date.now();

        // Return cached status if still valid
        if (this.statusCache && (now - this.statusCache.timestamp) < this.statusCacheTTL) {
            return this.statusCache.status;
        }

        // Fetch new status
        if (!this.git) {
            throw new GitError('Git not initialized', 'GIT_NOT_INITIALIZED');
        }

        const status = await this.git.status();
        this.statusCache = { status, timestamp: now };
        return status;
    }

    /**
     * Invalidate status cache (call after git operations that change status)
     */
    private invalidateStatusCache(): void {
        this.statusCache = null;
    }

    async getDiff(filePath: string): Promise<string> {
        if (!this.git) {
            throw new GitError('Git not initialized', 'GIT_NOT_INITIALIZED');
        }

        try {
            // Convert to POSIX path for git (use forward slashes even on Windows)
            const relativePath = path.relative(this.workspaceRoot, filePath).split(path.sep).join('/');

            // Check diff cache
            const now = Date.now();
            const cached = this.diffCache.get(relativePath);
            if (cached && (now - cached.timestamp) < this.diffCacheTTL) {
                return cached.diff;
            }

            // Get diff against HEAD
            const diff = await this.git.diff(['HEAD', '--', relativePath]);

            if (!diff) {
                // File might be new, check if it's staged
                const status = await this.getStatus(); // Use cached status
                const isNew = status.not_added.includes(relativePath) ||
                             status.created.includes(relativePath);

                if (isNew) {
                    // Return the entire file content as "added"
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const result = `+++ New file: ${relativePath}\n${content}`;
                    this.diffCache.set(relativePath, { diff: result, timestamp: now });
                    return result;
                }
            }

            // Cache the diff
            this.diffCache.set(relativePath, { diff, timestamp: now });
            return diff;
        } catch (error: any) {
            throw new GitError(
                `Failed to get diff for ${filePath}`,
                'GIT_DIFF_FAILED',
                error,
                { filePath }
            );
        }
    }

    async commit(message: string): Promise<void> {
        if (!this.git) {
            throw new GitError('Git not initialized', 'GIT_NOT_INITIALIZED');
        }

        try {
            await this.git.add('.');
            await this.git.commit(message);

            // Invalidate caches after commit
            this.invalidateStatusCache();
            this.diffCache.clear();
        } catch (error: any) {
            throw new GitError(
                `Failed to commit: ${message}`,
                'GIT_COMMIT_FAILED',
                error,
                { message }
            );
        }
    }

    /**
     * Clear all caches
     */
    clearCache(): void {
        this.statusCache = null;
        this.diffCache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            statusCached: this.statusCache !== null,
            diffCacheSize: this.diffCache.size,
            statusCacheTTL: this.statusCacheTTL,
            diffCacheTTL: this.diffCacheTTL
        };
    }

    async getHistory(filePath: string, limit: number = 10): Promise<Array<{
        hash: string;
        date: string;
        message: string;
        authorName: string;
    }>> {
        if (!this.git) {
            throw new GitError('Git not initialized', 'GIT_NOT_INITIALIZED');
        }

        try {
            // Convert to POSIX path for git (use forward slashes even on Windows)
            const relativePath = path.relative(this.workspaceRoot, filePath).split(path.sep).join('/');
            const log = await this.git.log({ file: relativePath, maxCount: limit });
            return log.all.map(entry => ({
                hash: entry.hash,
                date: entry.date,
                message: entry.message,
                authorName: entry.author_name
            }));
        } catch (error: any) {
            throw new GitError(
                `Failed to get history for ${filePath}`,
                'GIT_HISTORY_FAILED',
                error,
                { filePath, limit }
            );
        }
    }
}
