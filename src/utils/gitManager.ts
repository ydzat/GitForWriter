import simpleGit, { SimpleGit } from 'simple-git';
import * as path from 'path';
import * as fs from 'fs';

export class GitManager {
    private git: SimpleGit | null = null;
    private workspaceRoot: string = '';

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
            throw new Error('Git not initialized');
        }

        try {
            // Get diff against HEAD
            const relativePath = path.relative(this.workspaceRoot, filePath);
            const diff = await this.git.diff(['HEAD', '--', relativePath]);
            
            if (!diff) {
                // File might be new, check if it's staged
                const status = await this.git.status();
                const isNew = status.not_added.includes(relativePath) || 
                             status.created.includes(relativePath);
                
                if (isNew) {
                    // Return the entire file content as "added"
                    const content = fs.readFileSync(filePath, 'utf-8');
                    return `+++ New file: ${relativePath}\n${content}`;
                }
            }
            
            return diff;
        } catch (error) {
            console.error('Error getting diff:', error);
            return '';
        }
    }

    async commit(message: string): Promise<void> {
        if (!this.git) {
            throw new Error('Git not initialized');
        }

        await this.git.add('.');
        await this.git.commit(message);
    }

    async getHistory(filePath: string, limit: number = 10): Promise<Array<{
        hash: string;
        date: string;
        message: string;
        authorName: string;
    }>> {
        if (!this.git) {
            throw new Error('Git not initialized');
        }

        const relativePath = path.relative(this.workspaceRoot, filePath);
        const log = await this.git.log({ file: relativePath, maxCount: limit });
        return log.all.map(entry => ({
            hash: entry.hash,
            date: entry.date,
            message: entry.message,
            authorName: entry.author_name
        }));
    }
}
