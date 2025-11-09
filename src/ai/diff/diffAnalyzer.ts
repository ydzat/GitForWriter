export interface DiffAnalysis {
    summary: string;
    additions: number;
    deletions: number;
    modifications: number;
    semanticChanges: SemanticChange[];
    consistencyReport: ConsistencyReport;
}

export interface SemanticChange {
    type: 'addition' | 'deletion' | 'modification';
    description: string;
    lineNumber: number;
    confidence: number;
}

export interface ConsistencyReport {
    score: number; // 0-100
    issues: string[];
    suggestions: string[];
}

export class DiffAnalyzer {
    async analyze(diff: string, fullContent: string): Promise<DiffAnalysis> {
        // Parse diff to extract changes
        const lines = diff.split('\n');
        let additions = 0;
        let deletions = 0;
        let modifications = 0;

        const semanticChanges: SemanticChange[] = [];
        let currentLine = 0;

        for (const line of lines) {
            if (line.startsWith('+') && !line.startsWith('+++')) {
                additions++;
                semanticChanges.push({
                    type: 'addition',
                    description: this.generateSemanticDescription(line.substring(1)),
                    lineNumber: currentLine,
                    confidence: 0.85
                });
            } else if (line.startsWith('-') && !line.startsWith('---')) {
                deletions++;
                semanticChanges.push({
                    type: 'deletion',
                    description: this.generateSemanticDescription(line.substring(1)),
                    lineNumber: currentLine,
                    confidence: 0.85
                });
            } else if (line.startsWith('@')) {
                // Line number info
                const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
                if (match) {
                    currentLine = parseInt(match[1], 10);
                }
            } else {
                currentLine++;
            }
        }

        // Detect modifications (deletion followed by addition)
        modifications = Math.min(additions, deletions);

        // Generate consistency report
        const consistencyReport = this.generateConsistencyReport(fullContent, semanticChanges);

        // Generate summary
        const summary = this.generateSummary(additions, deletions, modifications, semanticChanges);

        return {
            summary,
            additions,
            deletions,
            modifications,
            semanticChanges,
            consistencyReport
        };
    }

    async quickAnalyze(diff: string): Promise<{ summary: string; lineCount: number }> {
        const lines = diff.split('\n');
        let additions = 0;
        let deletions = 0;

        for (const line of lines) {
            if (line.startsWith('+') && !line.startsWith('+++')) {
                additions++;
            } else if (line.startsWith('-') && !line.startsWith('---')) {
                deletions++;
            }
        }

        return {
            summary: `+${additions} -${deletions} lines`,
            lineCount: additions + deletions
        };
    }

    private generateSemanticDescription(line: string): string {
        const trimmed = line.trim();
        
        if (trimmed.length === 0) {
            return 'Empty line change';
        }

        // Detect common patterns
        if (trimmed.startsWith('#')) {
            return `Heading change: "${trimmed.substring(0, 50)}..."`;
        } else if (trimmed.match(/^\d+\./)) {
            return `List item: "${trimmed.substring(0, 50)}..."`;
        } else if (trimmed.match(/^[-*]/)) {
            return `Bullet point: "${trimmed.substring(0, 50)}..."`;
        } else if (trimmed.length > 100) {
            return `Paragraph modification: "${trimmed.substring(0, 50)}..."`;
        } else {
            return `Text change: "${trimmed.substring(0, 50)}..."`;
        }
    }

    private generateConsistencyReport(content: string, changes: SemanticChange[]): ConsistencyReport {
        const issues: string[] = [];
        const suggestions: string[] = [];
        let score = 100;

        // Check for common writing issues
        const sentences = content.split(/[.!?]+/);
        
        // Check sentence length
        const longSentences = sentences.filter(s => s.trim().split(/\s+/).length > 30);
        if (longSentences.length > sentences.length * 0.2) {
            issues.push('多个句子过长，可能影响可读性');
            suggestions.push('考虑将长句拆分为多个短句');
            score -= 10;
        }

        // Check paragraph consistency
        const paragraphs = content.split(/\n\n+/);
        const veryShortParas = paragraphs.filter(p => p.trim().split(/\s+/).length < 20);
        if (veryShortParas.length > paragraphs.length * 0.3) {
            suggestions.push('部分段落较短，考虑扩展内容或合并相关段落');
            score -= 5;
        }

        // Check for repetitive words in changes
        const addedText = changes
            .filter(c => c.type === 'addition')
            .map(c => c.description)
            .join(' ');
        
        const words = addedText.toLowerCase().split(/\s+/);
        const wordFreq: Record<string, number> = {};
        for (const word of words) {
            if (word.length > 4) {
                wordFreq[word] = (wordFreq[word] || 0) + 1;
            }
        }

        const repetitive = Object.entries(wordFreq).filter(([, count]) => count > 3);
        if (repetitive.length > 0) {
            issues.push(`发现重复词汇: ${repetitive.map(([w]) => w).join(', ')}`);
            suggestions.push('避免过度使用相同词汇，尝试使用同义词');
            score -= 10;
        }

        return {
            score: Math.max(0, score),
            issues,
            suggestions
        };
    }

    private generateSummary(
        additions: number,
        deletions: number,
        modifications: number,
        changes: SemanticChange[]
    ): string {
        const parts: string[] = [];

        if (additions > 0) {
            parts.push(`添加了 ${additions} 行`);
        }
        if (deletions > 0) {
            parts.push(`删除了 ${deletions} 行`);
        }
        if (modifications > 0) {
            parts.push(`修改了 ${modifications} 处`);
        }

        const summary = parts.join('，');

        // Categorize changes
        const headings = changes.filter(c => c.description.includes('Heading')).length;
        const lists = changes.filter(c => c.description.includes('List') || c.description.includes('Bullet')).length;
        const paragraphs = changes.filter(c => c.description.includes('Paragraph') || c.description.includes('Text')).length;

        const details: string[] = [];
        if (headings > 0) {
            details.push(`${headings} 个标题`);
        }
        if (lists > 0) {
            details.push(`${lists} 个列表项`);
        }
        if (paragraphs > 0) {
            details.push(`${paragraphs} 段文本`);
        }

        if (details.length > 0) {
            return `${summary}。涉及${details.join('、')}。`;
        }

        return summary || '无明显变化';
    }
}
