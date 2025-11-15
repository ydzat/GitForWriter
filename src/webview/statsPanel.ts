import * as vscode from 'vscode';
import { StatsCollector, WritingStats } from '../analytics/statsCollector';

/**
 * Statistics panel for displaying writing analytics
 */
export class StatsPanel {
    public static currentPanel: StatsPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private disposables: vscode.Disposable[] = [];

    private constructor(
        panel: vscode.WebviewPanel,
        private readonly statsCollector: StatsCollector
    ) {
        this.panel = panel;

        // Set initial HTML content
        this.update();

        // Handle messages from webview
        this.panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'exportCSV':
                        this.exportCSV();
                        break;
                    case 'exportJSON':
                        this.exportJSON();
                        break;
                    case 'clearStats':
                        this.clearStats();
                        break;
                }
            },
            null,
            this.disposables
        );

        // Handle panel disposal
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    }

    /**
     * Create or show statistics panel
     */
    public static createOrShow(statsCollector: StatsCollector): void {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If panel already exists, show it
        if (StatsPanel.currentPanel) {
            StatsPanel.currentPanel.panel.reveal(column);
            StatsPanel.currentPanel.update();
            return;
        }

        // Create new panel
        const panel = vscode.window.createWebviewPanel(
            'gitforwriterStats',
            'Writing Statistics',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        StatsPanel.currentPanel = new StatsPanel(panel, statsCollector);
    }

    /**
     * Update webview content
     */
    private update(): void {
        const stats = this.statsCollector.getStats();
        this.panel.webview.html = this.getHtmlContent(stats);
    }

    /**
     * Export statistics as CSV
     */
    private async exportCSV(): Promise<void> {
        const stats = this.statsCollector.getStats();
        const csv = this.generateCSV(stats);

        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file('writing-stats.csv'),
            filters: { 'CSV': ['csv'] }
        });

        if (uri) {
            await vscode.workspace.fs.writeFile(uri, Buffer.from(csv, 'utf-8'));
            vscode.window.showInformationMessage('Statistics exported to CSV');
        }
    }

    /**
     * Export statistics as JSON
     */
    private async exportJSON(): Promise<void> {
        const stats = this.statsCollector.getStats();
        const json = JSON.stringify(stats, null, 2);

        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file('writing-stats.json'),
            filters: { 'JSON': ['json'] }
        });

        if (uri) {
            await vscode.workspace.fs.writeFile(uri, Buffer.from(json, 'utf-8'));
            vscode.window.showInformationMessage('Statistics exported to JSON');
        }
    }

    /**
     * Clear all statistics
     */
    private async clearStats(): Promise<void> {
        const answer = await vscode.window.showWarningMessage(
            'Are you sure you want to clear all writing statistics? This cannot be undone.',
            'Clear', 'Cancel'
        );

        if (answer === 'Clear') {
            this.statsCollector.clearAll();
            this.update();
            vscode.window.showInformationMessage('All statistics cleared');
        }
    }

    /**
     * Generate CSV from statistics
     */
    private generateCSV(stats: WritingStats): string {
        const lines = ['Date,Words Written,Sessions,Total Duration (min)'];
        
        Object.values(stats.dailyStats).forEach(day => {
            const durationMin = Math.round(day.totalDuration / 60000);
            lines.push(`${day.date},${day.wordsWritten},${day.sessions},${durationMin}`);
        });

        return lines.join('\n');
    }

    /**
     * Dispose panel
     */
    public dispose(): void {
        StatsPanel.currentPanel = undefined;

        this.panel.dispose();

        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    /**
     * Generate HTML content for webview
     */
    private getHtmlContent(stats: WritingStats): string {
        if (!stats.enabled) {
            return this.getOptInHtml();
        }

        const totalSessions = stats.sessions.length;
        const avgWordsPerSession = totalSessions > 0 ? Math.round(stats.totalWords / totalSessions) : 0;
        const totalDuration = stats.sessions.reduce((sum, s) => sum + s.duration, 0);
        const avgDurationMin = totalSessions > 0 ? Math.round(totalDuration / totalSessions / 60000) : 0;

        // Prepare chart data
        const dailyData = this.prepareDailyChartData(stats);
        const timeOfDayData = this.prepareTimeOfDayData(stats);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Writing Statistics</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            line-height: 1.6;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
        }
        h1 {
            margin: 0;
            font-size: 24px;
        }
        .actions {
            display: flex;
            gap: 10px;
        }
        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            cursor: pointer;
            border-radius: 4px;
            font-size: 13px;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        button.secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        button.secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            padding: 20px;
            border-radius: 8px;
            border: 1px solid var(--vscode-panel-border);
        }
        .stat-value {
            font-size: 32px;
            font-weight: bold;
            margin: 10px 0;
        }
        .stat-label {
            font-size: 14px;
            opacity: 0.8;
        }
        .chart-container {
            margin-bottom: 30px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            padding: 20px;
            border-radius: 8px;
            border: 1px solid var(--vscode-panel-border);
        }
        .chart-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
        }
        canvas {
            max-height: 300px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Writing Statistics</h1>
        <div class="actions">
            <button onclick="exportCSV()">Export CSV</button>
            <button onclick="exportJSON()">Export JSON</button>
            <button class="secondary" onclick="clearStats()">Clear All</button>
        </div>
    </div>

    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-label">Total Words</div>
            <div class="stat-value">${stats.totalWords.toLocaleString()}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Writing Sessions</div>
            <div class="stat-value">${totalSessions}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Current Streak</div>
            <div class="stat-value">${stats.currentStreak} days</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Longest Streak</div>
            <div class="stat-value">${stats.longestStreak} days</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Avg Words/Session</div>
            <div class="stat-value">${avgWordsPerSession}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Avg Duration</div>
            <div class="stat-value">${avgDurationMin} min</div>
        </div>
    </div>

    <div class="chart-container">
        <div class="chart-title">Daily Word Count</div>
        <canvas id="dailyChart"></canvas>
    </div>

    <div class="chart-container">
        <div class="chart-title">Productivity by Time of Day</div>
        <canvas id="timeOfDayChart"></canvas>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        // Daily word count chart
        const dailyCtx = document.getElementById('dailyChart').getContext('2d');
        new Chart(dailyCtx, {
            type: 'line',
            data: {
                labels: ${JSON.stringify(dailyData.labels)},
                datasets: [{
                    label: 'Words Written',
                    data: ${JSON.stringify(dailyData.values)},
                    borderColor: '#007acc',
                    backgroundColor: 'rgba(0, 122, 204, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });

        // Time of day chart
        const timeCtx = document.getElementById('timeOfDayChart').getContext('2d');
        new Chart(timeCtx, {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(timeOfDayData.labels)},
                datasets: [{
                    label: 'Words Written',
                    data: ${JSON.stringify(timeOfDayData.values)},
                    backgroundColor: '#007acc'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });

        function exportCSV() {
            vscode.postMessage({ command: 'exportCSV' });
        }

        function exportJSON() {
            vscode.postMessage({ command: 'exportJSON' });
        }

        function clearStats() {
            vscode.postMessage({ command: 'clearStats' });
        }
    </script>
</body>
</html>`;
    }

    /**
     * Get opt-in HTML
     */
    private getOptInHtml(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Writing Statistics</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 40px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .opt-in-container {
            max-width: 600px;
            text-align: center;
        }
        h1 {
            font-size: 28px;
            margin-bottom: 20px;
        }
        p {
            font-size: 16px;
            line-height: 1.8;
            margin-bottom: 30px;
            opacity: 0.9;
        }
        .privacy-note {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            border: 1px solid var(--vscode-panel-border);
        }
    </style>
</head>
<body>
    <div class="opt-in-container">
        <h1>📊 Writing Statistics</h1>
        <p>Track your writing habits, productivity, and progress over time.</p>
        <div class="privacy-note">
            <strong>🔒 Privacy First</strong><br>
            All statistics are stored locally on your computer.<br>
            No data is ever sent to external servers.
        </div>
        <p>Enable statistics collection in settings:<br>
        <code>GitForWriter: Enable Statistics</code></p>
    </div>
</body>
</html>`;
    }

    /**
     * Prepare daily chart data
     */
    private prepareDailyChartData(stats: WritingStats): { labels: string[], values: number[] } {
        const sorted = Object.values(stats.dailyStats).sort((a, b) => a.date.localeCompare(b.date));
        return {
            labels: sorted.map(d => d.date),
            values: sorted.map(d => d.wordsWritten)
        };
    }

    /**
     * Prepare time of day data
     */
    private prepareTimeOfDayData(stats: WritingStats): { labels: string[], values: number[] } {
        const hourlyWords: number[] = new Array(24).fill(0);

        stats.sessions.forEach(session => {
            const hour = new Date(session.startTime).getHours();
            hourlyWords[hour] += session.wordsWritten;
        });

        return {
            labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
            values: hourlyWords
        };
    }
}

