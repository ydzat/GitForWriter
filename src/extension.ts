import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { GitManager } from './utils/gitManager';
import { StatusBarManager } from './utils/statusBarManager';
import { AIReviewPanel } from './webview/aiReviewPanel';
import { DiffAnalyzer } from './ai/diff/diffAnalyzer';
import { ReviewEngine } from './ai/review/reviewEngine';
import { ExportManager } from './ai/export/exportManager';
import { SecretManager } from './config/secretManager';
import { ConfigManager } from './config/configManager';
import { errorHandler } from './utils/errorHandlerUI';
import { GitError } from './utils/errorHandler';

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

    const gitManager = new GitManager();
    const statusBarManager = new StatusBarManager();
    const secretManager = new SecretManager(context.secrets);
    const configManager = new ConfigManager();
    const diffAnalyzer = new DiffAnalyzer(configManager, secretManager);
    const reviewEngine = new ReviewEngine(configManager, secretManager);
    const exportManager = new ExportManager();

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

    // Register commands
    const startProjectCommand = vscode.commands.registerCommand('gitforwriter.startProject', async () => {
        await startWritingProject(gitManager, statusBarManager);
    });

    const aiReviewCommand = vscode.commands.registerCommand('gitforwriter.aiReview', async () => {
        await performAIReview(context, gitManager, diffAnalyzer, reviewEngine);
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

    // Register document save handler
    const saveHandler = vscode.workspace.onDidSaveTextDocument(async (document) => {
        await handleDocumentSave(document, gitManager, diffAnalyzer);
    });

    context.subscriptions.push(
        startProjectCommand,
        aiReviewCommand,
        exportDraftCommand,
        configureProviderCommand,
        setOpenAIKeyCommand,
        setClaudeKeyCommand,
        clearKeysCommand,
        saveHandler,
        statusBarManager
    );

    // Initialize status bar
    statusBarManager.updateStage('ideation');
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
    reviewEngine: ReviewEngine
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

    try {
        vscode.window.showInformationMessage('🔍 Analyzing changes...');

        // Get git diff
        const diff = await gitManager.getDiff(document.fileName);

        // Get full content
        const fullContent = document.getText();

        // Analyze diff semantically
        const analysis = await diffAnalyzer.analyze(diff, fullContent);

        // Generate review with file path and content for precise suggestions
        const review = await reviewEngine.generateReview(analysis, document.fileName, fullContent);
        review.documentVersion = document.version;

        // Show review panel
        AIReviewPanel.createOrShow(context.extensionUri, review, document.fileName);

        vscode.window.showInformationMessage('✅ AI Review completed');
    } catch (error) {
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
    diffAnalyzer: DiffAnalyzer
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

    try {
        // Get diff
        const diff = await gitManager.getDiff(document.fileName);
        
        if (!diff || diff.trim() === '') {
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
        const analysis = await diffAnalyzer.quickAnalyze(diff);
        
        // Save analysis
        const analysisPath = path.join(gitforwriterDir, `${fileName}_${timestamp}.json`);
        fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));

        console.log(`Diff saved: ${diffPath}`);
    } catch (error: any) {
        errorHandler.handleSilent(error, { context: 'document_save' });
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
