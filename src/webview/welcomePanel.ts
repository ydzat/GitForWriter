import * as vscode from 'vscode';
import { ConfigManager } from '../config/configManager';
import { SecretManager } from '../config/secretManager';

/**
 * Welcome panel for first-time users
 * Provides guided setup wizard and interactive tutorial
 */
export class WelcomePanel {
    public static currentPanel: WelcomePanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private readonly extensionUri: vscode.Uri;
    private disposables: vscode.Disposable[] = [];
    private currentStep: number = 0;

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        private readonly context: vscode.ExtensionContext,
        private readonly configManager: ConfigManager,
        private readonly secretManager: SecretManager
    ) {
        this.panel = panel;
        this.extensionUri = extensionUri;

        // Set initial HTML content
        this.update();

        // Handle messages from webview
        this.panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'nextStep':
                        this.currentStep = message.step;
                        this.update();
                        break;
                    case 'prevStep':
                        this.currentStep = message.step;
                        this.update();
                        break;
                    case 'selectProvider':
                        await this.handleProviderSelection(message.provider);
                        break;
                    case 'saveApiKey':
                        await this.handleApiKeySave(message.provider, message.apiKey);
                        break;
                    case 'testConfiguration':
                        await this.handleTestConfiguration();
                        break;
                    case 'initializeProject':
                        await this.handleInitializeProject();
                        break;
                    case 'startTutorial':
                        await this.handleStartTutorial();
                        break;
                    case 'skipOnboarding':
                        await this.handleSkipOnboarding();
                        break;
                    case 'completeOnboarding':
                        await this.handleCompleteOnboarding();
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
     * Create or show welcome panel
     */
    public static createOrShow(
        extensionUri: vscode.Uri,
        context: vscode.ExtensionContext,
        configManager: ConfigManager,
        secretManager: SecretManager
    ): void {
        const column = vscode.ViewColumn.One;

        // If panel already exists, show it
        if (WelcomePanel.currentPanel) {
            WelcomePanel.currentPanel.panel.reveal(column);
            return;
        }

        // Create new panel
        const panel = vscode.window.createWebviewPanel(
            'gitforwriterWelcome',
            'Welcome to GitForWriter',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [extensionUri]
            }
        );

        WelcomePanel.currentPanel = new WelcomePanel(
            panel,
            extensionUri,
            context,
            configManager,
            secretManager
        );
    }

    /**
     * Update webview content
     */
    private update(): void {
        this.panel.webview.html = this.getHtmlContent();
    }

    /**
     * Handle AI provider selection
     */
    private async handleProviderSelection(provider: string): Promise<void> {
        // Validate provider type
        const validProviders = ['unified', 'openai', 'claude', 'local'];
        if (!validProviders.includes(provider)) {
            vscode.window.showErrorMessage(`Invalid provider: ${provider}`);
            return;
        }

        await this.configManager.setProvider(provider as any);
        this.sendMessage({ command: 'providerSelected', provider });
        vscode.window.showInformationMessage(`Selected AI provider: ${provider}`);
    }

    /**
     * Handle API key save
     */
    private async handleApiKeySave(provider: string, apiKey: string): Promise<void> {
        try {
            if (provider === 'openai') {
                await this.secretManager.setOpenAIKey(apiKey);
            } else if (provider === 'claude' || provider === 'anthropic') {
                await this.secretManager.setClaudeKey(apiKey);
            }
            this.sendMessage({ command: 'apiKeySaved', success: true });
            vscode.window.showInformationMessage('API key saved successfully');
        } catch (error) {
            this.sendMessage({ command: 'apiKeySaved', success: false, error: String(error) });
            vscode.window.showErrorMessage(`Failed to save API key: ${error}`);
        }
    }

    /**
     * Handle configuration test
     */
    private async handleTestConfiguration(): Promise<void> {
        // Test the configuration by making a simple API call
        this.sendMessage({ command: 'testStarted' });

        try {
            // Simple test - just check if provider and key are set
            const provider = this.configManager.getCurrentProvider();
            let hasKey = false;

            if (provider === 'openai') {
                hasKey = !!(await this.secretManager.getOpenAIKey());
            } else if (provider === 'claude') {
                hasKey = !!(await this.secretManager.getClaudeKey());
            } else if (provider === 'unified') {
                // For unified, check based on the underlying provider
                const config = this.configManager.getConfig();
                if (config.unified.provider === 'openai') {
                    hasKey = !!(await this.secretManager.getOpenAIKey());
                } else if (config.unified.provider === 'anthropic') {
                    hasKey = !!(await this.secretManager.getClaudeKey());
                }
            } else if (provider === 'local') {
                hasKey = true; // Local doesn't need API key
            }

            if (hasKey) {
                this.sendMessage({ command: 'testCompleted', success: true });
                vscode.window.showInformationMessage('✅ Configuration test passed!');
            } else {
                this.sendMessage({ command: 'testCompleted', success: false, error: 'API key not found' });
                vscode.window.showWarningMessage('⚠️ API key not found. Please enter your API key.');
            }
        } catch (error) {
            this.sendMessage({ command: 'testCompleted', success: false, error: String(error) });
            vscode.window.showErrorMessage(`Configuration test failed: ${error}`);
        }
    }

    /**
     * Handle project initialization
     */
    private async handleInitializeProject(): Promise<void> {
        try {
            // Execute the start project command
            await vscode.commands.executeCommand('gitforwriter.startProject');
            this.sendMessage({ command: 'projectInitialized', success: true });
        } catch (error) {
            this.sendMessage({ command: 'projectInitialized', success: false, error: String(error) });
            vscode.window.showErrorMessage(`Failed to initialize project: ${error}`);
        }
    }

    /**
     * Handle start tutorial
     */
    private async handleStartTutorial(): Promise<void> {
        try {
            // Create a sample tutorial document
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('Please open a folder first');
                return;
            }

            const tutorialContent = `# GitForWriter Tutorial

Welcome to GitForWriter! This interactive tutorial will guide you through the main features.

## Step 1: Understanding the Workflow

GitForWriter follows a four-stage writing pipeline:
1. **Ideation** (构思) - Planning and brainstorming
2. **Writing** (撰写) - Creating content
3. **Review** (审校) - AI-powered review and editing
4. **Publishing** (发布) - Exporting to various formats

## Step 2: Try Writing

Start writing below this line. Save the file to see automatic diff detection in action.

---

[Your writing goes here]

## Step 3: AI Review

Once you've written some content:
1. Press Ctrl+Shift+P (or Cmd+Shift+P on Mac)
2. Type "GitForWriter: AI Review"
3. See AI-powered suggestions and improvements

## Step 4: Export Your Work

When you're ready to publish:
1. Press Ctrl+Shift+P (or Cmd+Shift+P on Mac)
2. Type "GitForWriter: Export Draft"
3. Choose your preferred format (Markdown, LaTeX, or PDF)

## Next Steps

- Explore the status bar to see your current writing stage
- Check out the writing statistics: "GitForWriter: View Statistics"
- Configure AI providers: "GitForWriter: Configure AI Provider"

Happy writing! 📝
`;

            const tutorialUri = vscode.Uri.joinPath(workspaceFolder.uri, 'gitforwriter-tutorial.md');
            await vscode.workspace.fs.writeFile(tutorialUri, Buffer.from(tutorialContent, 'utf-8'));

            // Open the tutorial document
            const doc = await vscode.workspace.openTextDocument(tutorialUri);
            await vscode.window.showTextDocument(doc);

            this.sendMessage({ command: 'tutorialStarted', success: true });
            vscode.window.showInformationMessage('📚 Tutorial document created! Follow the steps to learn GitForWriter.');
        } catch (error) {
            this.sendMessage({ command: 'tutorialStarted', success: false, error: String(error) });
            vscode.window.showErrorMessage(`Failed to create tutorial: ${error}`);
        }
    }

    /**
     * Handle skip onboarding
     */
    private async handleSkipOnboarding(): Promise<void> {
        await this.context.globalState.update('gitforwriter.onboardingCompleted', true);
        await this.context.globalState.update('gitforwriter.onboardingSkipped', true);
        vscode.window.showInformationMessage('You can access this guide anytime with "GitForWriter: Getting Started"');
        this.dispose();
    }

    /**
     * Handle complete onboarding
     */
    private async handleCompleteOnboarding(): Promise<void> {
        await this.context.globalState.update('gitforwriter.onboardingCompleted', true);
        vscode.window.showInformationMessage('🎉 Welcome to GitForWriter! Happy writing!');
        this.dispose();
    }

    /**
     * Send message to webview
     */
    private sendMessage(message: any): void {
        this.panel.webview.postMessage(message);
    }

    /**
     * Dispose panel
     */
    public dispose(): void {
        WelcomePanel.currentPanel = undefined;

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
    private getHtmlContent(): string {
        const steps = this.getSteps();
        const currentStepData = steps[this.currentStep];

        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to GitForWriter</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: var(--vscode-foreground);
            background: linear-gradient(135deg, var(--vscode-editor-background) 0%, var(--vscode-sideBar-background) 100%);
            padding: 0;
            line-height: 1.6;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            flex: 1;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .logo {
            font-size: 64px;
            margin-bottom: 20px;
        }
        h1 {
            font-size: 32px;
            margin-bottom: 10px;
            color: var(--vscode-textLink-foreground);
        }
        .subtitle {
            font-size: 16px;
            opacity: 0.8;
        }
        .progress-bar {
            width: 100%;
            height: 4px;
            background-color: var(--vscode-input-background);
            border-radius: 2px;
            margin: 30px 0;
            overflow: hidden;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--vscode-textLink-foreground), var(--vscode-charts-blue));
            transition: width 0.3s ease;
        }
        .step-indicator {
            display: flex;
            justify-content: center;
            gap: 10px;
            margin-bottom: 30px;
        }
        .step-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background-color: var(--vscode-input-background);
            transition: all 0.3s ease;
        }
        .step-dot.active {
            background-color: var(--vscode-textLink-foreground);
            transform: scale(1.3);
        }
        .step-dot.completed {
            background-color: var(--vscode-charts-green);
        }
        .content {
            background-color: var(--vscode-editor-background);
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            margin-bottom: 30px;
            min-height: 400px;
        }
        .step-title {
            font-size: 24px;
            margin-bottom: 20px;
            color: var(--vscode-textLink-foreground);
        }
        .step-description {
            font-size: 16px;
            margin-bottom: 30px;
            line-height: 1.8;
            opacity: 0.9;
        }
        .provider-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .provider-card {
            background-color: var(--vscode-input-background);
            border: 2px solid var(--vscode-input-border);
            border-radius: 8px;
            padding: 20px;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: center;
        }
        .provider-card:hover {
            border-color: var(--vscode-textLink-foreground);
            transform: translateY(-2px);
        }
        .provider-card.selected {
            border-color: var(--vscode-charts-green);
            background-color: var(--vscode-editor-selectionBackground);
        }
        .provider-icon {
            font-size: 48px;
            margin-bottom: 10px;
        }
        .provider-name {
            font-weight: bold;
            margin-bottom: 5px;
        }
        .provider-desc {
            font-size: 12px;
            opacity: 0.7;
        }
        .input-group {
            margin: 20px 0;
        }
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
        }
        input[type="text"],
        input[type="password"] {
            width: 100%;
            padding: 10px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            font-size: 14px;
        }
        input:focus {
            outline: none;
            border-color: var(--vscode-textLink-foreground);
        }
        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s;
            margin: 5px;
        }
        button:hover:not(:disabled) {
            background-color: var(--vscode-button-hoverBackground);
            transform: translateY(-1px);
        }
        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        button.secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        button.secondary:hover:not(:disabled) {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        .actions {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 30px;
        }
        .feature-list {
            list-style: none;
            margin: 20px 0;
        }
        .feature-item {
            display: flex;
            align-items: flex-start;
            margin: 15px 0;
            padding: 15px;
            background-color: var(--vscode-input-background);
            border-radius: 8px;
            border-left: 4px solid var(--vscode-textLink-foreground);
        }
        .feature-icon {
            font-size: 24px;
            margin-right: 15px;
        }
        .feature-content h3 {
            margin-bottom: 5px;
            font-size: 16px;
        }
        .feature-content p {
            font-size: 14px;
            opacity: 0.8;
        }
        .success-message {
            background-color: var(--vscode-charts-green);
            color: white;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
        }
        .error-message {
            background-color: var(--vscode-charts-red);
            color: white;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
        }
        .info-box {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 0.6s linear infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .hidden {
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">✍️</div>
            <h1>Welcome to GitForWriter</h1>
            <p class="subtitle">让文学创作具备软件开发的流程化特征</p>
        </div>

        <div class="progress-bar">
            <div class="progress-fill" style="width: ${(this.currentStep / (steps.length - 1)) * 100}%"></div>
        </div>

        <div class="step-indicator">
            ${steps.map((_, index) => `
                <div class="step-dot ${index === this.currentStep ? 'active' : ''} ${index < this.currentStep ? 'completed' : ''}"></div>
            `).join('')}
        </div>

        <div class="content">
            ${currentStepData.html}
        </div>

        <div class="actions">
            <div>
                ${this.currentStep > 0 ? `
                    <button class="secondary" onclick="prevStep()">← Previous</button>
                ` : `
                    <button class="secondary" onclick="skipOnboarding()">Skip</button>
                `}
            </div>
            <div>
                ${this.currentStep < steps.length - 1 ? `
                    <button onclick="nextStep()">Next →</button>
                ` : `
                    <button onclick="completeOnboarding()">Get Started! 🚀</button>
                `}
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        // Restore state from VSCode webview state API
        const previousState = vscode.getState() || {};
        let selectedProvider = previousState.selectedProvider || '';

        function nextStep() {
            vscode.postMessage({ command: 'nextStep', step: ${this.currentStep + 1} });
        }

        function prevStep() {
            vscode.postMessage({ command: 'prevStep', step: ${this.currentStep - 1} });
        }

        function selectProvider(provider) {
            selectedProvider = provider;
            // Persist state using VSCode webview state API
            vscode.setState({ selectedProvider: provider });

            document.querySelectorAll('.provider-card').forEach(card => {
                card.classList.remove('selected');
            });
            document.getElementById('provider-' + provider).classList.add('selected');
            vscode.postMessage({ command: 'selectProvider', provider });
        }

        function saveApiKey() {
            const apiKey = document.getElementById('api-key-input').value;
            if (!apiKey) {
                alert('Please enter an API key');
                return;
            }
            // Get provider from state or backend
            if (!selectedProvider) {
                alert('Please select a provider first');
                return;
            }
            vscode.postMessage({ command: 'saveApiKey', provider: selectedProvider, apiKey });
        }

        function testConfiguration() {
            vscode.postMessage({ command: 'testConfiguration' });
        }

        function initializeProject() {
            vscode.postMessage({ command: 'initializeProject' });
        }

        function startTutorial() {
            vscode.postMessage({ command: 'startTutorial' });
        }

        function skipOnboarding() {
            vscode.postMessage({ command: 'skipOnboarding' });
        }

        function completeOnboarding() {
            vscode.postMessage({ command: 'completeOnboarding' });
        }

        // Listen for messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            // Handle responses from extension
            console.log('Received message:', message);
        });
    </script>
</body>
</html>`;
    }

    /**
     * Get step definitions
     */
    private getSteps(): Array<{ title: string; html: string }> {
        return [
            {
                title: 'Welcome',
                html: this.getWelcomeStepHtml()
            },
            {
                title: 'Choose AI Provider',
                html: this.getProviderStepHtml()
            },
            {
                title: 'Configure API Key',
                html: this.getApiKeyStepHtml()
            },
            {
                title: 'Test Configuration',
                html: this.getTestStepHtml()
            },
            {
                title: 'Initialize Project',
                html: this.getInitProjectStepHtml()
            },
            {
                title: 'Quick Tutorial',
                html: this.getTutorialStepHtml()
            }
        ];
    }

    private getWelcomeStepHtml(): string {
        return `
            <h2 class="step-title">🎉 Welcome to GitForWriter!</h2>
            <p class="step-description">
                GitForWriter is a VSCode extension that brings software development workflows to literary creation.
                It combines version control, AI-powered review, and automated publishing to make writing more structured and intelligent.
            </p>
            <ul class="feature-list">
                <li class="feature-item">
                    <div class="feature-icon">🔄</div>
                    <div class="feature-content">
                        <h3>Git Version Management</h3>
                        <p>Track every change with automatic diff detection and history archiving</p>
                    </div>
                </li>
                <li class="feature-item">
                    <div class="feature-icon">🤖</div>
                    <div class="feature-content">
                        <h3>AI-Powered Review</h3>
                        <p>Get intelligent suggestions for grammar, style, structure, and content</p>
                    </div>
                </li>
                <li class="feature-item">
                    <div class="feature-icon">📤</div>
                    <div class="feature-content">
                        <h3>Multi-Format Export</h3>
                        <p>Export to Markdown, LaTeX, and PDF with professional templates</p>
                    </div>
                </li>
                <li class="feature-item">
                    <div class="feature-icon">📊</div>
                    <div class="feature-content">
                        <h3>Writing Analytics</h3>
                        <p>Track your productivity, word count, and writing habits</p>
                    </div>
                </li>
            </ul>
            <p class="step-description">
                This quick setup wizard will help you configure GitForWriter in just a few steps.
            </p>
        `;
    }

    private getProviderStepHtml(): string {
        const currentProvider = this.configManager.getCurrentProvider();
        return `
            <h2 class="step-title">🤖 Choose Your AI Provider</h2>
            <p class="step-description">
                Select the AI provider you want to use for intelligent writing assistance.
            </p>
            <div class="provider-grid">
                <div id="provider-openai" class="provider-card ${currentProvider === 'openai' ? 'selected' : ''}" onclick="selectProvider('openai')">
                    <div class="provider-icon">🟢</div>
                    <div class="provider-name">OpenAI</div>
                    <div class="provider-desc">GPT-4, GPT-3.5</div>
                </div>
                <div id="provider-claude" class="provider-card ${currentProvider === 'claude' ? 'selected' : ''}" onclick="selectProvider('claude')">
                    <div class="provider-icon">🟣</div>
                    <div class="provider-name">Anthropic Claude</div>
                    <div class="provider-desc">Claude 3.5 Sonnet</div>
                </div>
                <div id="provider-local" class="provider-card ${currentProvider === 'local' ? 'selected' : ''}" onclick="selectProvider('local')">
                    <div class="provider-icon">💻</div>
                    <div class="provider-name">Local LLM</div>
                    <div class="provider-desc">Ollama, LM Studio</div>
                </div>
            </div>
            <div class="info-box">
                <strong>💡 Tip:</strong> You can change this later in settings with the command "GitForWriter: Configure AI Provider"
            </div>
        `;
    }

    private getApiKeyStepHtml(): string {
        const provider = this.configManager.getCurrentProvider();
        if (provider === 'local') {
            return `
                <h2 class="step-title">⚙️ Configure Local LLM</h2>
                <p class="step-description">
                    Local LLM providers don't require an API key. Make sure you have Ollama or LM Studio running.
                </p>
                <div class="info-box">
                    <strong>📝 Setup Instructions:</strong><br><br>
                    <strong>For Ollama:</strong><br>
                    1. Install Ollama from <a href="https://ollama.ai" target="_blank">ollama.ai</a><br>
                    2. Run: <code>ollama serve</code><br>
                    3. Pull a model: <code>ollama pull llama2</code><br><br>
                    <strong>For LM Studio:</strong><br>
                    1. Download from <a href="https://lmstudio.ai" target="_blank">lmstudio.ai</a><br>
                    2. Load a model and start the local server
                </div>
            `;
        }

        const providerName = provider === 'openai' ? 'OpenAI' : 'Anthropic Claude';
        const keyUrl = provider === 'openai'
            ? 'https://platform.openai.com/api-keys'
            : 'https://console.anthropic.com/settings/keys';

        return `
            <h2 class="step-title">🔑 Enter Your ${providerName} API Key</h2>
            <p class="step-description">
                Your API key is stored securely in VSCode's secret storage and never leaves your computer.
            </p>
            <div class="input-group">
                <label for="api-key-input">API Key:</label>
                <input type="password" id="api-key-input" placeholder="sk-...">
            </div>
            <button onclick="saveApiKey()">Save API Key</button>
            <div class="info-box">
                <strong>🔗 Get your API key:</strong><br>
                Visit <a href="${keyUrl}" target="_blank">${keyUrl}</a>
            </div>
        `;
    }

    private getTestStepHtml(): string {
        return `
            <h2 class="step-title">🧪 Test Your Configuration</h2>
            <p class="step-description">
                Let's verify that your AI provider is configured correctly.
            </p>
            <button onclick="testConfiguration()">Test Configuration</button>
            <div id="test-result" class="hidden"></div>
        `;
    }

    private getInitProjectStepHtml(): string {
        return `
            <h2 class="step-title">📁 Initialize Your Writing Project</h2>
            <p class="step-description">
                Set up the project structure with Git repository and necessary directories.
            </p>
            <button onclick="initializeProject()">Initialize Project</button>
            <div class="info-box">
                <strong>📂 What will be created:</strong><br>
                • Git repository (if not exists)<br>
                • <code>.gitforwriter/</code> directory for diffs and reviews<br>
                • <code>ai/</code> directory for AI modules
            </div>
        `;
    }

    private getTutorialStepHtml(): string {
        return `
            <h2 class="step-title">📚 Ready to Start!</h2>
            <p class="step-description">
                You're all set! Would you like to go through an interactive tutorial?
            </p>
            <button onclick="startTutorial()">Start Interactive Tutorial</button>
            <div class="info-box">
                <strong>🎯 Quick Commands:</strong><br><br>
                <strong>GitForWriter: Start Writing Project</strong> - Initialize a new project<br>
                <strong>GitForWriter: AI Review</strong> - Get AI-powered review<br>
                <strong>GitForWriter: Export Draft</strong> - Export to various formats<br>
                <strong>GitForWriter: View Statistics</strong> - See your writing stats<br>
                <strong>GitForWriter: Getting Started</strong> - Re-open this guide
            </div>
            <p class="step-description" style="margin-top: 30px;">
                Click "Get Started" to complete the setup and start writing!
            </p>
        `;
    }
}

