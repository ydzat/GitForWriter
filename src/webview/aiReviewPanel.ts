import * as vscode from 'vscode';
import { Review } from '../ai/review/reviewEngine';
import { SuggestionApplicator, Suggestion } from '../core/suggestionApplicator';
import { i18n } from '../i18n';

export class AIReviewPanel {
    public static currentPanel: AIReviewPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _applicator: SuggestionApplicator;
    private _currentReview: Review | undefined;
    private _filePath: string | undefined;
    private _appliedSuggestions: Set<string> = new Set();

    public static createOrShow(extensionUri: vscode.Uri, review: Review, filePath?: string) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it
        if (AIReviewPanel.currentPanel) {
            AIReviewPanel.currentPanel._panel.reveal(column);
            AIReviewPanel.currentPanel._update(review, filePath);
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

        AIReviewPanel.currentPanel = new AIReviewPanel(panel, extensionUri, review, filePath);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, review: Review, filePath?: string) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._applicator = new SuggestionApplicator();
        this._currentReview = review;
        this._filePath = filePath;

        // Set the webview's initial html content
        this._update(review, filePath);

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'applySuggestion':
                        await this._applySuggestion(message.suggestionId);
                        return;
                    case 'applyAll':
                        await this._applyAllSuggestions();
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    private _update(review: Review, filePath?: string) {
        this._currentReview = review;
        this._filePath = filePath;
        // Clear applied suggestions when updating to a new review
        this._appliedSuggestions.clear();
        this._panel.webview.html = this._getHtmlForWebview(review);
    }

    private async _applySuggestion(suggestionId: string) {
        if (!this._currentReview || !this._filePath) {
            vscode.window.showErrorMessage('No review data available');
            return;
        }

        // Find the suggestion
        const reviewSuggestion = this._currentReview.suggestions.find(s => s.id === suggestionId);
        if (!reviewSuggestion) {
            vscode.window.showErrorMessage('Suggestion not found');
            return;
        }

        // Convert ReviewSuggestion to Suggestion
        const suggestion: Suggestion = {
            id: reviewSuggestion.id,
            type: reviewSuggestion.type,
            filePath: this._filePath,
            startLine: reviewSuggestion.startLine,
            startColumn: reviewSuggestion.startColumn,
            endLine: reviewSuggestion.endLine,
            endColumn: reviewSuggestion.endColumn,
            original: reviewSuggestion.original,
            suggested: reviewSuggestion.suggested,
            reason: reviewSuggestion.reason,
            documentVersion: this._currentReview.documentVersion
        };

        // Show progress
        this._sendMessageToWebview({
            command: 'suggestionApplying',
            suggestionId: suggestionId
        });

        // Apply the suggestion
        const result = await this._applicator.applySuggestion(suggestion);

        if (result.success) {
            this._appliedSuggestions.add(suggestionId);
            vscode.window.showInformationMessage(`✅ ${result.message}`);

            // Update webview to show applied state
            this._sendMessageToWebview({
                command: 'suggestionApplied',
                suggestionId: suggestionId,
                success: true
            });
        } else {
            vscode.window.showErrorMessage(`❌ ${result.message}${result.error ? ': ' + result.error : ''}`);

            // Update webview to show error state
            this._sendMessageToWebview({
                command: 'suggestionApplied',
                suggestionId: suggestionId,
                success: false,
                error: result.error
            });
        }
    }

    private async _applyAllSuggestions() {
        if (!this._currentReview || !this._filePath) {
            vscode.window.showErrorMessage('No review data available');
            return;
        }

        // Filter out suggestions that don't have actual text changes
        // Note: We allow suggestions where original is empty (insertions)
        const applicableSuggestions = this._currentReview.suggestions.filter(
            s => s.suggested && s.suggested.trim() !== '' &&
                !this._appliedSuggestions.has(s.id)
        );

        if (applicableSuggestions.length === 0) {
            vscode.window.showInformationMessage('No suggestions to apply');
            return;
        }

        // Convert to Suggestion format
        const suggestions: Suggestion[] = applicableSuggestions.map(rs => ({
            id: rs.id,
            type: rs.type,
            filePath: this._filePath!,
            startLine: rs.startLine,
            startColumn: rs.startColumn,
            endLine: rs.endLine,
            endColumn: rs.endColumn,
            original: rs.original,
            suggested: rs.suggested,
            reason: rs.reason,
            documentVersion: this._currentReview!.documentVersion
        }));

        // Show progress
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Applying suggestions',
                cancellable: false
            },
            async (progress) => {
                const result = await this._applicator.applyAllSuggestions(
                    suggestions,
                    (current, total, suggestion) => {
                        const reason = suggestion.reason || '';
                        const displayReason = reason.substring(0, 50) + (reason.length > 50 ? '...' : '');
                        progress.report({
                            message: `${current}/${total}: ${displayReason}`,
                            increment: total > 0 ? (100 / total) : 0
                        });
                    }
                );

                // Mark applied suggestions
                result.results.forEach((r) => {
                    if (r.success) {
                        this._appliedSuggestions.add(r.suggestionId);
                        this._sendMessageToWebview({
                            command: 'suggestionApplied',
                            suggestionId: r.suggestionId,
                            success: true
                        });
                    }
                });

                // Show summary
                if (result.successCount > 0) {
                    vscode.window.showInformationMessage(
                        `✅ Applied ${result.successCount} of ${suggestions.length} suggestions`
                    );
                }
                if (result.failureCount > 0) {
                    vscode.window.showWarningMessage(
                        `⚠️ Failed to apply ${result.failureCount} suggestions`
                    );
                }
            }
        );
    }

    private _sendMessageToWebview(message: any) {
        this._panel.webview.postMessage(message);
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
            transition: all 0.2s;
        }
        button:hover:not(:disabled) {
            background-color: var(--vscode-button-hoverBackground);
        }
        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        button.applied {
            background-color: var(--vscode-charts-green);
            color: white;
        }
        button.applying {
            background-color: var(--vscode-charts-blue);
            color: white;
        }
        .suggestion-buttons {
            margin-top: 10px;
        }
        .spinner {
            display: inline-block;
            width: 12px;
            height: 12px;
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 0.6s linear infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .status-message {
            display: inline-block;
            margin-left: 10px;
            font-size: 12px;
            opacity: 0.8;
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
    <h1>${i18n.getStrings().review.title}</h1>

    <div class="rating">
        ${this._getRatingStars(review.rating)} ${review.rating.toFixed(1)}/10
    </div>

    <div class="overall">
        <strong>${i18n.getStrings().review.overallAssessment}</strong>
        <p>${review.overall}</p>
    </div>

    <div class="section">
        <h2>${i18n.getStrings().review.strengths}</h2>
        <ul>
            ${review.strengths.map(s => `
                <li class="item strength">${s}</li>
            `).join('')}
        </ul>
    </div>

    <div class="section">
        <h2>${i18n.getStrings().review.improvements}</h2>
        <ul>
            ${review.improvements.map(i => `
                <li class="item improvement">${i}</li>
            `).join('')}
        </ul>
    </div>

    <div class="section">
        <h2>${i18n.getStrings().review.suggestions}</h2>
        ${review.suggestions.length > 0 ? review.suggestions.map((s, index) => {
            // Escape all dynamic values for consistency, even though UUIDs are safe
            const escapedId = this._escapeHtml(s.id);
            const lineText = i18n.getStrings().review.line;
            const originalText = i18n.getStrings().review.original;
            const suggestedText = i18n.getStrings().review.suggested;
            const applyText = i18n.getStrings().review.applySuggestion;
            return `
            <div class="suggestion" id="suggestion-${escapedId}">
                <span class="suggestion-type type-${s.type}">${this._getTypeLabel(s.type)}</span>
                ${s.line > 0 ? `<span style="opacity: 0.7;"> (${lineText} ${s.line} ${i18n.getLocale() === 'zh-cn' ? '行' : ''})</span>` : ''}
                <div class="suggestion-reason">${this._escapeHtml(s.reason)}</div>
                ${s.original ? `<div style="margin-top: 8px;"><strong>${originalText}</strong> ${this._escapeHtml(s.original)}</div>` : ''}
                ${s.suggested ? `<div style="margin-top: 4px;"><strong>${suggestedText}</strong> ${this._escapeHtml(s.suggested)}</div>` : ''}
                <div class="suggestion-buttons">
                    ${s.suggested && s.suggested.trim() !== '' ? `
                        <div style="margin-top: 10px; padding: 8px; background-color: var(--vscode-inputValidation-warningBackground); border-left: 4px solid var(--vscode-inputValidation-warningBorder); border-radius: 4px;">
                            <strong>⚠️ ${i18n.getLocale() === 'zh-cn' ? '注意' : 'Note'}:</strong> ${i18n.getLocale() === 'zh-cn' ? '自动应用功能暂时禁用，请手动复制建议的文本进行修改。' : 'Auto-apply feature is temporarily disabled. Please manually copy the suggested text to make changes.'}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        }).join('') : `<p>${i18n.getStrings().review.noSuggestions}</p>`}
    </div>

    <div class="actions">
        <button onclick="close()">${i18n.getStrings().review.close}</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const appliedSuggestions = new Set();

        function applySuggestion(suggestionId) {
            if (appliedSuggestions.has(suggestionId)) {
                return;
            }

            const button = document.getElementById('btn-' + suggestionId);
            const status = document.getElementById('status-' + suggestionId);

            if (button) {
                button.disabled = true;
                button.classList.add('applying');
                button.innerHTML = '<span class="spinner"></span> <span class="btn-text">应用中...</span>';
            }

            vscode.postMessage({
                command: 'applySuggestion',
                suggestionId: suggestionId
            });
        }

        function applyAll() {
            const applyAllBtn = document.getElementById('apply-all-btn');
            if (applyAllBtn) {
                applyAllBtn.disabled = true;
                applyAllBtn.innerHTML = '<span class="spinner"></span> <span class="btn-text">应用中...</span>';
            }

            vscode.postMessage({
                command: 'applyAll'
            });
        }

        function close() {
            // The panel will be closed by user clicking X
        }

        // Listen for messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;

            switch (message.command) {
                case 'suggestionApplied':
                    const suggestionId = message.suggestionId;
                    const button = document.getElementById('btn-' + suggestionId);
                    const status = document.getElementById('status-' + suggestionId);

                    if (message.success) {
                        appliedSuggestions.add(suggestionId);
                        if (button) {
                            button.classList.remove('applying');
                            button.classList.add('applied');
                            button.innerHTML = '✓ 已采纳';
                            button.disabled = true;
                        }
                        if (status) {
                            status.textContent = '✓ 已应用';
                            status.style.color = 'var(--vscode-charts-green)';
                        }
                    } else {
                        if (button) {
                            button.classList.remove('applying');
                            button.disabled = false;
                            button.innerHTML = '<span class="btn-text">采纳建议</span>';
                        }
                        if (status) {
                            status.textContent = '✗ 应用失败';
                            status.style.color = 'var(--vscode-charts-red)';
                        }
                    }
                    break;
            }
        });
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
        const validTypes = ['grammar', 'style', 'structure', 'content', 'clarity'] as const;
        type ReviewType = typeof validTypes[number];
        if (validTypes.includes(type as any)) {
            return i18n.getReviewType(type as ReviewType);
        }
        return type;
    }

    private _escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}
