import { DiffAnalysis } from '../diff/diffAnalyzer';

export interface Review {
    overall: string;
    strengths: string[];
    improvements: string[];
    suggestions: ReviewSuggestion[];
    rating: number; // 0-10
}

export interface ReviewSuggestion {
    type: 'grammar' | 'style' | 'structure' | 'content';
    line: number;
    original: string;
    suggested: string;
    reason: string;
}

export class ReviewEngine {
    async generateReview(analysis: DiffAnalysis): Promise<Review> {
        const strengths: string[] = [];
        const improvements: string[] = [];
        const suggestions: ReviewSuggestion[] = [];
        
        // Analyze based on consistency report
        const { consistencyReport } = analysis;
        
        // Determine strengths
        if (consistencyReport.score >= 80) {
            strengths.push('文本结构清晰，逻辑连贯');
        }
        if (analysis.additions > analysis.deletions * 2) {
            strengths.push('内容扩充充分，信息量丰富');
        }
        if (analysis.semanticChanges.length > 5) {
            strengths.push('修改细致，注重细节打磨');
        }

        // Identify improvements based on issues
        improvements.push(...consistencyReport.issues);

        // Generate suggestions from consistency report
        for (const suggestion of consistencyReport.suggestions) {
            suggestions.push({
                type: 'style',
                line: 0,
                original: '',
                suggested: '',
                reason: suggestion
            });
        }

        // Analyze semantic changes for specific suggestions
        for (const change of analysis.semanticChanges.slice(0, 5)) {
            if (change.type === 'addition') {
                // Check for common issues in added text
                const text = change.description.toLowerCase();
                
                if (text.includes('很') && text.includes('非常')) {
                    suggestions.push({
                        type: 'style',
                        line: change.lineNumber,
                        original: change.description,
                        suggested: '避免使用过度修饰词',
                        reason: '减少"很"、"非常"等程度副词的使用可以使文字更精炼'
                    });
                }
            }
        }

        // Generate overall assessment
        let overall = '';
        if (consistencyReport.score >= 85) {
            overall = '本次修改整体质量优秀，文本逻辑清晰，表达流畅。';
        } else if (consistencyReport.score >= 70) {
            overall = '本次修改整体质量良好，有一些小问题需要注意。';
        } else {
            overall = '本次修改存在一些需要改进的地方，建议仔细审查。';
        }

        if (analysis.additions > 0 && analysis.deletions === 0) {
            overall += '主要是内容扩充，注意保持与现有内容的一致性。';
        } else if (analysis.deletions > analysis.additions) {
            overall += '进行了内容精简，注意不要删除关键信息。';
        }

        // Calculate rating
        const rating = Math.min(10, Math.round((consistencyReport.score / 10) + 
            (strengths.length * 0.5) - 
            (improvements.length * 0.3)));

        return {
            overall,
            strengths: strengths.length > 0 ? strengths : ['继续保持细致的写作态度'],
            improvements: improvements.length > 0 ? improvements : ['暂无明显问题'],
            suggestions,
            rating: Math.max(0, rating)
        };
    }
}
