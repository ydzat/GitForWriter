import { LocaleStrings } from './locales';

export const en: LocaleStrings = {
    welcome: {
        title: '🎉 Welcome to GitForWriter!',
        description: 'GitForWriter is a VSCode extension that brings software development workflows to literary creation. It combines version control, AI-powered review, and automated publishing to make writing more structured and intelligent.',
        features: {
            git: {
                title: 'Git Version Management',
                description: 'Track every change with automatic diff detection and history archiving'
            },
            ai: {
                title: 'AI-Powered Review',
                description: 'Get intelligent suggestions for grammar, style, structure, and content'
            },
            export: {
                title: 'Multi-Format Export',
                description: 'Export to Markdown, LaTeX, and PDF with professional templates'
            },
            analytics: {
                title: 'Writing Analytics',
                description: 'Track your productivity, word count, and writing habits'
            }
        },
        setupWizard: 'This quick setup wizard will help you configure GitForWriter in just a few steps.',
        steps: {
            welcome: 'Welcome',
            chooseProvider: 'Choose AI Provider',
            configureKey: 'Configure API Key',
            testConfig: 'Test Configuration',
            initProject: 'Initialize Project',
            tutorial: 'Quick Tutorial'
        },
        buttons: {
            next: 'Next',
            previous: 'Previous',
            skip: 'Skip',
            finish: 'Finish',
            startTutorial: 'Start Interactive Tutorial'
        }
    },

    review: {
        title: '🔍 AI Review Results',
        overallAssessment: 'Overall Assessment:',
        strengths: '✨ Strengths',
        improvements: '📋 Areas for Improvement',
        suggestions: '💡 Suggestions',
        noSuggestions: 'No specific suggestions',
        applySuggestion: 'Apply Suggestion',
        applyAll: 'Apply All Suggestions',
        close: 'Close',
        line: 'Line',
        original: 'Original:',
        suggested: 'Suggested:',
        types: {
            grammar: 'Grammar',
            style: 'Style',
            structure: 'Structure',
            content: 'Content',
            clarity: 'Clarity'
        }
    },

    commands: {
        startProject: 'GitForWriter: Start Writing Project',
        aiReview: 'GitForWriter: AI Review',
        exportDraft: 'GitForWriter: Export Draft',
        configureProvider: 'GitForWriter: Configure AI Provider',
        setOpenAIKey: 'GitForWriter: Set OpenAI API Key',
        setClaudeKey: 'GitForWriter: Set Claude API Key',
        clearAPIKeys: 'GitForWriter: Clear API Keys',
        showConfig: 'GitForWriter: Show Configuration',
        viewStatistics: 'GitForWriter: View Statistics',
        enableStatistics: 'GitForWriter: Enable Statistics',
        disableStatistics: 'GitForWriter: Disable Statistics',
        viewPerformance: 'GitForWriter: View Performance Statistics',
        clearCache: 'GitForWriter: Clear AI Cache',
        gettingStarted: 'GitForWriter: Getting Started'
    },

    messages: {
        welcomeToGitForWriter: 'Welcome to GitForWriter! For the best experience, open a folder to access all features.',
        openFolder: 'Open Folder',
        noWorkspaceFolder: 'No workspace folder open',
        aiReviewCompleted: '✅ AI Review completed',
        aiReviewFailed: 'AI Review failed',
        viewLogs: 'View Logs',
        statisticsEnabled: 'Writing statistics enabled',
        statisticsDisabled: 'Writing statistics disabled',
        cacheCleared: 'AI cache cleared',
        configurationTestPassed: '✅ Configuration test passed!',
        configurationTestFailed: '❌ Configuration test failed',
        apiKeysCleared: 'All API keys cleared'
    },

    statusBar: {
        stages: {
            ideation: 'Ideation',
            writing: 'Writing',
            review: 'Review',
            publish: 'Publish'
        },
        writingStage: 'Writing Stage'
    },

    providers: {
        openai: {
            name: 'OpenAI / Compatible',
            description: 'GPT-4, DeepSeek, Qwen, etc.'
        },
        claude: {
            name: 'Anthropic Claude',
            description: 'Claude 3.5 Sonnet, Opus, etc.'
        },
        unified: {
            name: 'Unified Provider',
            description: 'Support 100+ LLM providers'
        },
        local: {
            name: 'Local LLM',
            description: 'Ollama, LM Studio, etc.'
        }
    },

    config: {
        apiKey: 'API Key',
        baseURL: 'Base URL',
        model: 'Model',
        provider: 'Provider',
        optional: 'optional',
        examples: 'Examples',
        saveConfiguration: 'Save Configuration',
        testConfiguration: 'Test Configuration'
    },

    common: {
        loading: 'Loading...',
        error: 'Error',
        success: 'Success',
        cancel: 'Cancel',
        confirm: 'Confirm'
    }
};

