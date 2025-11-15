import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { GitManager } from './utils/gitManager';
import { StatusBarManager } from './utils/statusBarManager';
import { AIReviewPanel } from './webview/aiReviewPanel';
import { StatsPanel } from './webview/statsPanel';
import { WelcomePanel } from './webview/welcomePanel';
import { DiffAnalyzer } from './ai/diff/diffAnalyzer';
import { ReviewEngine } from './ai/review/reviewEngine';
import { ExportManager } from './ai/export/exportManager';
import { SecretManager } from './config/secretManager';
import { ConfigManager } from './config/configManager';
import { StatsCollector } from './analytics/statsCollector';
import { errorHandler } from './utils/errorHandlerUI';
import { GitError } from './utils/errorHandler';
import { debounce, PerformanceMonitor } from './utils/debounce';

export async function activate(context: vscode.ExtensionContext) {
    // Load .env file for development/testing ONLY
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder && context.extensionMode === vscode.ExtensionMode.Development) {
        const envPath = path.join(workspaceFolder.uri.fsPath, '.env');
        if (fs.existsSync(envPath)) {
            dotenv.config({ path: envPath });
            console.warn('⚠️ Loaded .env file from workspace (development mode only)');
        }
    }

    console.log('GitForWriter is now active');

    // Create output channel for performance logging
    const outputChannel = vscode.window.createOutputChannel('GitForWriter Performance');

    const gitManager = new GitManager();
    const statusBarManager = new StatusBarManager();
    const secretManager = new SecretManager(context.secrets);
    const configManager = new ConfigManager();
    const diffAnalyzer = new DiffAnalyzer(configManager, secretManager, outputChannel);
    const reviewEngine = new ReviewEngine(configManager, secretManager, outputChannel);
    const exportManager = new ExportManager();
    const performanceMonitor = new PerformanceMonitor(1000, outputChannel); // 1s threshold

    // Initialize StatsCollector
    let statsCollector: StatsCollector | undefined;
    const previousWordCounts = new Map<string, number>();
    if (workspaceFolder) {
        statsCollector = new StatsCollector(workspaceFolder.uri.fsPath);
    }

    // Cleanup previousWordCounts when documents are closed to prevent memory leaks
    context.subscriptions.push(
        vscode.workspace.onDidCloseTextDocument((doc) => {
            previousWordCounts.delete(doc.fileName);
        })
    );

    // Initialize error handler
    if (workspaceFolder) {
        errorHandler.initialize(workspaceFolder.uri.fsPath);
    }

    // Initialize GitManager with workspace path
    if (workspaceFolder) {
        try {
            await gitManager.initialize(workspaceFolder.uri.fsPath);
            console.log('GitManager initialized successfully');
        } catch (error: any) {
            const gitError = new GitError(
                'Failed to initialize Git repository',
                'GIT_INIT_FAILED',
                error
            );
            await errorHandler.handle(gitError);
        }
    }

    // Check if this is the first time the extension is activated
    const hasCompletedOnboarding = context.globalState.get(WelcomePanel.ONBOARDING_COMPLETED_KEY, false);
    if (!hasCompletedOnboarding) {
        // Show welcome panel for first-time users
        // Note: Some features (project initialization, tutorial) require a workspace folder
        // but users can still configure AI providers without one
        WelcomePanel.createOrShow(context.extensionUri, context, configManager, secretManager);

        // Show a friendly reminder if no workspace is open
        if (!workspaceFolder) {
            vscode.window.showInformationMessage(
                'Welcome to GitForWriter! For the best experience, open a folder to access all features.',
                'Open Folder'
            ).then(selection => {
                if (selection === 'Open Folder') {
                    vscode.commands.executeCommand('vscode.openFolder');
                }
            });
        }
    }

    // Register commands
    const startProjectCommand = vscode.commands.registerCommand('gitforwriter.startProject', async () => {
        await startWritingProject(gitManager, statusBarManager);
    });

    const aiReviewCommand = vscode.commands.registerCommand('gitforwriter.aiReview', async () => {
        await performAIReview(context, gitManager, diffAnalyzer, reviewEngine, performanceMonitor);
    });

    const exportDraftCommand = vscode.commands.registerCommand('gitforwriter.exportDraft', async () => {
        await exportDraft(exportManager);
    });

    // Configure AI Provider command
    const configureProviderCommand = vscode.commands.registerCommand('gitforwriter.configureProvider', async () => {
        await configureAIProvider(configManager);
    });

    // Set OpenAI API Key command
    const setOpenAIKeyCommand = vscode.commands.registerCommand('gitforwriter.setOpenAIKey', async () => {
        await setOpenAIAPIKey(secretManager);
    });

    // Set Claude API Key command
    const setClaudeKeyCommand = vscode.commands.registerCommand('gitforwriter.setClaudeKey', async () => {
        await setClaudeAPIKey(secretManager);
    });

    // Clear API Keys command
    const clearKeysCommand = vscode.commands.registerCommand('gitforwriter.clearAPIKeys', async () => {
        await clearAPIKeys(secretManager);
    });

    // Statistics commands
    const viewStatsCommand = vscode.commands.registerCommand('gitforwriter.viewStatistics', async () => {
        if (statsCollector) {
            StatsPanel.createOrShow(statsCollector);
        } else {
            vscode.window.showErrorMessage('No workspace folder open');
        }
    });

    const enableStatsCommand = vscode.commands.registerCommand('gitforwriter.enableStatistics', async () => {
        if (statsCollector) {
            statsCollector.enable();
            vscode.window.showInformationMessage('Writing statistics enabled');
        }
    });

    const disableStatsCommand = vscode.commands.registerCommand('gitforwriter.disableStatistics', async () => {
        if (statsCollector) {
            statsCollector.disable();
            vscode.window.showInformationMessage('Writing statistics disabled');
        }
    });

    // Performance statistics command
    const viewPerformanceCommand = vscode.commands.registerCommand('gitforwriter.viewPerformance', async () => {
        const stats = performanceMonitor.getAllStats();
        let message = '📊 Performance Statistics:\n\n';

        for (const [operation, stat] of stats) {
            if (stat) {
                message += `${operation}:\n`;
                message += `  Count: ${stat.count}\n`;
                message += `  Avg: ${stat.avg}ms\n`;
                message += `  Min: ${stat.min}ms\n`;
                message += `  Max: ${stat.max}ms\n\n`;
            }
        }

        if (stats.size === 0) {
            message = 'No performance data available yet.';
        }

        vscode.window.showInformationMessage(message, { modal: true });
    });

    // Getting Started command (re-open welcome panel)
    const gettingStartedCommand = vscode.commands.registerCommand('gitforwriter.gettingStarted', async () => {
        WelcomePanel.createOrShow(context.extensionUri, context, configManager, secretManager);
    });

    // Clear cache command
    const clearCacheCommand = vscode.commands.registerCommand('gitforwriter.clearCache', async () => {
        // Clear cache via DiffAnalyzer
        const cleared = diffAnalyzer.clearAICache();
        if (cleared) {
            vscode.window.showInformationMessage('✅ AI cache cleared successfully');
        } else {
            vscode.window.showWarningMessage('Cache clearing not available for current AI provider');
        }
    });

    // Get debounce delay from configuration
    const config = vscode.workspace.getConfiguration('gitforwriter');
    let debounceDelay = config.get<number>('performance.debounceDelay', 2000);

    // Create debounced document save handler
    let debouncedHandleDocumentSave = debounce(
        async (document: vscode.TextDocument) => {
            await handleDocumentSave(document, gitManager, diffAnalyzer, statsCollector, previousWordCounts, performanceMonitor);
        },
        debounceDelay
    );

    // Listen for configuration changes to update debounce delay
    const configChangeListener = vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('gitforwriter.performance.debounceDelay')) {
            const newConfig = vscode.workspace.getConfiguration('gitforwriter');
            const newDelay = newConfig.get<number>('performance.debounceDelay', 2000);
            if (newDelay !== debounceDelay) {
                debounceDelay = newDelay;
                // Recreate debounced handler with new delay
                debouncedHandleDocumentSave = debounce(
                    async (document: vscode.TextDocument) => {
                        await handleDocumentSave(document, gitManager, diffAnalyzer, statsCollector, previousWordCounts, performanceMonitor);
                    },
                    debounceDelay
                );
            }
        }
    });

    // Register document save handler with debouncing
    const saveHandler = vscode.workspace.onDidSaveTextDocument(async (document) => {
        // Show queued indicator (actual analysis starts after debounce delay)
        const statusBarDisposable = vscode.window.setStatusBarMessage(
            debounceDelay > 0
                ? '$(clock) Queued for analysis...'
                : '$(sync~spin) Analyzing changes...'
        );
        try {
            await debouncedHandleDocumentSave(document);
        } catch (err) {
            // Error handling is done inside handleDocumentSave
            // Log unexpected errors for debugging
            if (err) {
                console.error('Unexpected error in document save handler:', err);
                vscode.window.showErrorMessage('An unexpected error occurred during document analysis. See console for details.');
            }
        } finally {
            statusBarDisposable.dispose();
        }
    });

    context.subscriptions.push(
        startProjectCommand,
        aiReviewCommand,
        exportDraftCommand,
        configureProviderCommand,
        setOpenAIKeyCommand,
        setClaudeKeyCommand,
        clearKeysCommand,
        viewStatsCommand,
        enableStatsCommand,
        disableStatsCommand,
        viewPerformanceCommand,
        clearCacheCommand,
        gettingStartedCommand,
        configChangeListener,
        saveHandler,
        statusBarManager
    );

    // Initialize status bar
    statusBarManager.updateStage('ideation');

    // Store statsCollector for cleanup
    context.subscriptions.push({
        dispose: () => {
            if (statsCollector) {
                statsCollector.dispose();
            }
        }
    });
}

async function startWritingProject(gitManager: GitManager, statusBarManager: StatusBarManager) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('Please open a workspace folder first');
        return;
    }

    try {
        // Initialize Git repository if not exists
        await gitManager.initialize(workspaceFolder.uri.fsPath);

        // Create .gitforwriter directory
        const gitforwriterDir = path.join(workspaceFolder.uri.fsPath, '.gitforwriter');
        if (!fs.existsSync(gitforwriterDir)) {
            fs.mkdirSync(gitforwriterDir, { recursive: true });
            fs.mkdirSync(path.join(gitforwriterDir, 'diffs'), { recursive: true });
            fs.mkdirSync(path.join(gitforwriterDir, 'reviews'), { recursive: true });
        }

        // Create ai directory structure
        const aiDir = path.join(workspaceFolder.uri.fsPath, 'ai');
        if (!fs.existsSync(aiDir)) {
            fs.mkdirSync(path.join(aiDir, 'diff'), { recursive: true });
            fs.mkdirSync(path.join(aiDir, 'review'), { recursive: true });
            fs.mkdirSync(path.join(aiDir, 'export'), { recursive: true });
        }

        // Update status
        statusBarManager.updateStage('writing');

        vscode.window.showInformationMessage('✅ Writing project initialized successfully!');
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to initialize project: ${error}`);
    }
}

async function performAIReview(
    context: vscode.ExtensionContext,
    gitManager: GitManager,
    diffAnalyzer: DiffAnalyzer,
    reviewEngine: ReviewEngine,
    performanceMonitor: PerformanceMonitor
) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return;
    }

    const document = editor.document;
    if (!['markdown', 'latex'].includes(document.languageId)) {
        vscode.window.showErrorMessage('AI Review only supports Markdown and LaTeX files');
        return;
    }

    // Start performance monitoring after validation
    const endTiming = performanceMonitor.start('ai-review');

    try {
        vscode.window.showInformationMessage('🔍 Analyzing changes...');

        // Get git diff
        const endDiffTiming = performanceMonitor.start('git-diff');
        const diff = await gitManager.getDiff(document.fileName);
        endDiffTiming();

        // Get full content
        const fullContent = document.getText();

        // Analyze diff semantically
        const endAnalysisTiming = performanceMonitor.start('diff-analysis');
        const analysis = await diffAnalyzer.analyze(diff, fullContent);
        endAnalysisTiming();

        // Generate review with file path and content for precise suggestions
        const endReviewTiming = performanceMonitor.start('review-generation');
        const review = await reviewEngine.generateReview(analysis, document.fileName, fullContent);
        endReviewTiming();

        review.documentVersion = document.version;

        // Show review panel
        AIReviewPanel.createOrShow(context.extensionUri, review, document.fileName);

        vscode.window.showInformationMessage('✅ AI Review completed');
        endTiming();
    } catch (error) {
        endTiming();
        vscode.window.showErrorMessage(`AI Review failed: ${error}`);
    }
}

async function exportDraft(exportManager: ExportManager) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return;
    }

    const document = editor.document;
    const format = await vscode.window.showQuickPick(
        ['markdown', 'latex', 'pdf'],
        { placeHolder: 'Select export format' }
    );

    if (!format) {
        return;
    }

    try {
        const outputPath = await exportManager.export(document, format);
        vscode.window.showInformationMessage(`✅ Exported to: ${outputPath}`);
    } catch (error) {
        vscode.window.showErrorMessage(`Export failed: ${error}`);
    }
}

async function handleDocumentSave(
    document: vscode.TextDocument,
    gitManager: GitManager,
    diffAnalyzer: DiffAnalyzer,
    statsCollector: StatsCollector | undefined,
    previousWordCounts: Map<string, number>,
    performanceMonitor: PerformanceMonitor
) {
    // Only process Markdown and LaTeX files
    if (!['markdown', 'latex'].includes(document.languageId)) {
        return;
    }

    const config = vscode.workspace.getConfiguration('gitforwriter');
    if (!config.get('autoSave', true)) {
        return;
    }

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        return;
    }

    // Start performance monitoring after validation
    const endTiming = performanceMonitor.start('document-save');

    // Collect writing statistics
    if (statsCollector && statsCollector.isEnabled()) {
        const text = document.getText();
        const wordCount = StatsCollector.countWords(text);

        // Get previous word count from persistent map
        const previousWordCount = previousWordCounts.get(document.fileName) || 0;
        previousWordCounts.set(document.fileName, wordCount);

        statsCollector.recordWordsWritten(document.fileName, wordCount, previousWordCount);
    }

    try {
        // Get diff
        const endDiffTiming = performanceMonitor.start('git-diff');
        const diff = await gitManager.getDiff(document.fileName);
        endDiffTiming();

        if (!diff || diff.trim() === '') {
            endTiming();
            return;
        }

        // Save diff to .gitforwriter directory
        const gitforwriterDir = path.join(workspaceFolder.uri.fsPath, '.gitforwriter', 'diffs');
        if (!fs.existsSync(gitforwriterDir)) {
            fs.mkdirSync(gitforwriterDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = path.basename(document.fileName);
        const diffPath = path.join(gitforwriterDir, `${fileName}_${timestamp}.diff`);

        fs.writeFileSync(diffPath, diff);

        // Quick analysis
        const endAnalysisTiming = performanceMonitor.start('diff-analysis');
        const analysis = await diffAnalyzer.quickAnalyze(diff);
        endAnalysisTiming();

        // Save analysis
        const analysisPath = path.join(gitforwriterDir, `${fileName}_${timestamp}.json`);
        fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));

        console.log(`Diff saved: ${diffPath}`);
        endTiming();
    } catch (error: any) {
        endTiming();
        // Only use errorHandler if it's initialized (workspace folder exists)
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            errorHandler.handleSilent(error, { context: 'document_save' });
        } else {
            console.error('Error during document save:', error);
        }
    }
}

async function configureAIProvider(configManager: ConfigManager) {
    const provider = await vscode.window.showQuickPick(
        [
            { label: 'OpenAI', value: 'openai' as const, description: 'Use OpenAI GPT models' },
            { label: 'Claude (Anthropic)', value: 'claude' as const, description: 'Use Anthropic Claude models' },
            { label: 'Local LLM', value: 'local' as const, description: 'Use local LLM (e.g., Ollama)' }
        ],
        { placeHolder: 'Select AI provider' }
    );

    if (provider) {
        await configManager.setProvider(provider.value);
        vscode.window.showInformationMessage(`✅ AI provider set to: ${provider.label}`);
    }
}

async function setOpenAIAPIKey(secretManager: SecretManager) {
    const apiKey = await vscode.window.showInputBox({
        prompt: 'Enter your OpenAI API key',
        password: true,
        placeHolder: 'sk-...',
        validateInput: (value) => {
            if (!value || value.trim() === '') {
                return 'API key cannot be empty';
            }
            if (!value.trim().startsWith('sk-')) {
                return 'OpenAI API keys typically start with "sk-"';
            }
            if (value.trim().length <= 3) {
                return 'API key appears to be incomplete';
            }
            return undefined;
        }
    });

    if (apiKey) {
        await secretManager.setOpenAIKey(apiKey);
        vscode.window.showInformationMessage('✅ OpenAI API key saved securely');
    }
}

async function setClaudeAPIKey(secretManager: SecretManager) {
    const apiKey = await vscode.window.showInputBox({
        prompt: 'Enter your Claude API key',
        password: true,
        placeHolder: 'sk-ant-...',
        validateInput: (value) => {
            if (!value || value.trim() === '') {
                return 'API key cannot be empty';
            }
            if (!value.trim().startsWith('sk-ant-')) {
                return 'Claude API keys typically start with "sk-ant-"';
            }
            if (value.trim().length <= 7) {
                return 'API key appears to be incomplete';
            }
            return undefined;
        }
    });

    if (apiKey) {
        await secretManager.setClaudeKey(apiKey);
        vscode.window.showInformationMessage('✅ Claude API key saved securely');
    }
}

async function clearAPIKeys(secretManager: SecretManager) {
    const confirm = await vscode.window.showWarningMessage(
        'Are you sure you want to clear all API keys?',
        { modal: true },
        'Yes', 'No'
    );

    if (confirm === 'Yes') {
        await secretManager.clearAllKeys();
        vscode.window.showInformationMessage('✅ All API keys cleared');
    }
}

export function deactivate() {
    console.log('GitForWriter deactivated');
}
