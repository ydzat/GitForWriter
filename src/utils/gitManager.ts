import simpleGit, { SimpleGit } from 'simple-git';
import * as path from 'path';
import * as fs from 'fs';
import { GitError } from './errorHandler';

export class GitManager {
    private git: SimpleGit | null = null;
    private workspaceRoot: string = '';
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
                // Note: No need to cache status here since the entire diff result is cached
                const status = await this.git.status();
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

            // Clear diff cache after commit
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
        this.diffCache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            diffCacheSize: this.diffCache.size,
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
