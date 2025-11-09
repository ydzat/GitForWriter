import * as vscode from 'vscode';
import { Review } from '../ai/review/reviewEngine';

export class AIReviewPanel {
    public static currentPanel: AIReviewPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, review: Review) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it
        if (AIReviewPanel.currentPanel) {
            AIReviewPanel.currentPanel._panel.reveal(column);
            AIReviewPanel.currentPanel._update(review);
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            'aiReview',
            'AI Review Results',
            column || vscode.ViewColumn.Two,
            {
                enableScripts: true,
                localResourceRoots: [extensionUri]
            }
        );

        AIReviewPanel.currentPanel = new AIReviewPanel(panel, extensionUri, review);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, review: Review) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // Set the webview's initial html content
        this._update(review);

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'applySuggestion':
                        this._applySuggestion(message.suggestion);
                        return;
                    case 'applyAll':
                        this._applyAllSuggestions(message.suggestions);
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    private _update(review: Review) {
        this._panel.webview.html = this._getHtmlForWebview(review);
    }

    private _applySuggestion(suggestion: { type: string; line: number; original: string; suggested: string; reason: string }) {
        vscode.window.showInformationMessage(`Applied suggestion: ${suggestion.reason}`);
        // In a real implementation, this would apply the actual text change
    }

    private _applyAllSuggestions(suggestions: Array<{ type: string; line: number; original: string; suggested: string; reason: string }>) {
        vscode.window.showInformationMessage(`Applied ${suggestions.length} suggestions`);
        // In a real implementation, this would apply all text changes
    }

    public dispose() {
        AIReviewPanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _getHtmlForWebview(review: Review): string {
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Review Results</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            line-height: 1.6;
        }
        h1 {
            color: var(--vscode-titleBar-activeForeground);
            border-bottom: 2px solid var(--vscode-titleBar-border);
            padding-bottom: 10px;
        }
        h2 {
            color: var(--vscode-textLink-foreground);
            margin-top: 30px;
        }
        .rating {
            font-size: 48px;
            font-weight: bold;
            color: var(--vscode-charts-green);
            text-align: center;
            margin: 20px 0;
        }
        .overall {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            border-left: 4px solid var(--vscode-textLink-foreground);
        }
        .section {
            margin: 20px 0;
        }
        .item {
            background-color: var(--vscode-input-background);
            padding: 10px;
            margin: 10px 0;
            border-radius: 5px;
            border: 1px solid var(--vscode-input-border);
        }
        .strength {
            border-left: 4px solid var(--vscode-charts-green);
        }
        .improvement {
            border-left: 4px solid var(--vscode-charts-orange);
        }
        .suggestion {
            background-color: var(--vscode-editor-selectionBackground);
            padding: 15px;
            margin: 15px 0;
            border-radius: 5px;
            border: 1px solid var(--vscode-editor-selectionHighlightBorder);
        }
        .suggestion-type {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 3px;
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 8px;
        }
        .type-grammar { background-color: #f44336; color: white; }
        .type-style { background-color: #2196F3; color: white; }
        .type-structure { background-color: #FF9800; color: white; }
        .type-content { background-color: #4CAF50; color: white; }
        .suggestion-reason {
            font-style: italic;
            margin-top: 8px;
            opacity: 0.8;
        }
        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin: 5px;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .actions {
            margin-top: 30px;
            text-align: center;
        }
        ul {
            list-style-type: none;
            padding: 0;
        }
        li {
            margin: 8px 0;
        }
        li:before {
            content: "• ";
            color: var(--vscode-textLink-foreground);
            font-weight: bold;
            margin-right: 8px;
        }
    </style>
</head>
<body>
    <h1>🔍 AI 审校结果</h1>
    
    <div class="rating">
        ${this._getRatingStars(review.rating)} ${review.rating.toFixed(1)}/10
    </div>

    <div class="overall">
        <strong>总体评价：</strong>
        <p>${review.overall}</p>
    </div>

    <div class="section">
        <h2>✨ 优点</h2>
        <ul>
            ${review.strengths.map(s => `
                <li class="item strength">${s}</li>
            `).join('')}
        </ul>
    </div>

    <div class="section">
        <h2>📋 需要改进</h2>
        <ul>
            ${review.improvements.map(i => `
                <li class="item improvement">${i}</li>
            `).join('')}
        </ul>
    </div>

    <div class="section">
        <h2>💡 修改建议</h2>
        ${review.suggestions.length > 0 ? review.suggestions.map((s, index) => `
            <div class="suggestion">
                <span class="suggestion-type type-${s.type}">${this._getTypeLabel(s.type)}</span>
                ${s.line > 0 ? `<span style="opacity: 0.7;"> (第 ${s.line} 行)</span>` : ''}
                <div class="suggestion-reason">${s.reason}</div>
                ${s.suggested ? `<button onclick="applySuggestion(${index})">采纳建议</button>` : ''}
            </div>
        `).join('') : '<p>暂无具体建议</p>'}
    </div>

    <div class="actions">
        ${review.suggestions.filter(s => s.suggested).length > 0 ? `
            <button onclick="applyAll()">一键采纳所有建议</button>
        ` : ''}
        <button onclick="close()">关闭</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function applySuggestion(index) {
            const suggestions = ${JSON.stringify(review.suggestions)};
            vscode.postMessage({
                command: 'applySuggestion',
                suggestion: suggestions[index]
            });
        }

        function applyAll() {
            const suggestions = ${JSON.stringify(review.suggestions)};
            vscode.postMessage({
                command: 'applyAll',
                suggestions: suggestions.filter(s => s.suggested)
            });
        }

        function close() {
            // The panel will be closed by user clicking X
        }
    </script>
</body>
</html>`;
    }

    private _getRatingStars(rating: number): string {
        const fullStars = Math.floor(rating / 2);
        const halfStar = rating % 2 >= 1;
        const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
        
        return '⭐'.repeat(fullStars) + 
               (halfStar ? '✩' : '') + 
               '☆'.repeat(emptyStars);
    }

    private _getTypeLabel(type: string): string {
        const labels: Record<string, string> = {
            grammar: '语法',
            style: '风格',
            structure: '结构',
            content: '内容'
        };
        return labels[type] || type;
    }
}
