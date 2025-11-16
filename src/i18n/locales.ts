/**
 * Internationalization (i18n) support for GitForWriter
 * Supports multiple languages based on VSCode's display language
 */

export type SupportedLocale = 'en' | 'zh-cn' | 'zh-tw' | 'ja' | 'ko';

export interface LocaleStrings {
    // Welcome Panel
    welcome: {
        title: string;
        description: string;
        features: {
            git: { title: string; description: string };
            ai: { title: string; description: string };
            export: { title: string; description: string };
            analytics: { title: string; description: string };
        };
        setupWizard: string;
        steps: {
            welcome: string;
            chooseProvider: string;
            configureKey: string;
            testConfig: string;
            initProject: string;
            tutorial: string;
        };
        buttons: {
            next: string;
            previous: string;
            skip: string;
            finish: string;
            startTutorial: string;
        };
    };

    // AI Review Panel
    review: {
        title: string;
        overallAssessment: string;
        strengths: string;
        improvements: string;
        suggestions: string;
        noSuggestions: string;
        applySuggestion: string;
        applyAll: string;
        close: string;
        line: string;
        original: string;
        suggested: string;
        types: {
            grammar: string;
            style: string;
            structure: string;
            content: string;
            clarity: string;
        };
    };

    // Commands
    commands: {
        startProject: string;
        aiReview: string;
        exportDraft: string;
        configureProvider: string;
        setOpenAIKey: string;
        setClaudeKey: string;
        clearAPIKeys: string;
        showConfig: string;
        viewStatistics: string;
        enableStatistics: string;
        disableStatistics: string;
        viewPerformance: string;
        clearCache: string;
        gettingStarted: string;
    };

    // Messages
    messages: {
        welcomeToGitForWriter: string;
        openFolder: string;
        noWorkspaceFolder: string;
        aiReviewCompleted: string;
        aiReviewFailed: string;
        viewLogs: string;
        statisticsEnabled: string;
        statisticsDisabled: string;
        cacheCleared: string;
        configurationTestPassed: string;
        configurationTestFailed: string;
        apiKeysCleared: string;
    };

    // Status Bar
    statusBar: {
        stages: {
            ideation: string;
            writing: string;
            review: string;
            publish: string;
        };
        writingStage: string;
    };

    // Provider Configuration
    providers: {
        openai: {
            name: string;
            description: string;
        };
        claude: {
            name: string;
            description: string;
        };
        unified: {
            name: string;
            description: string;
        };
        local: {
            name: string;
            description: string;
        };
    };

    // Configuration
    config: {
        apiKey: string;
        baseURL: string;
        model: string;
        provider: string;
        optional: string;
        examples: string;
        saveConfiguration: string;
        testConfiguration: string;
    };

    // Common
    common: {
        loading: string;
        error: string;
        success: string;
        cancel: string;
        confirm: string;
    };
}

