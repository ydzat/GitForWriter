import { LocaleStrings } from './locales';

export const zhCN: LocaleStrings = {
    welcome: {
        title: '🎉 欢迎使用 GitForWriter！',
        description: 'GitForWriter 是一个将软件开发工作流引入文学创作的 VSCode 扩展。它结合了版本控制、AI 驱动的审校和自动化发布，让写作更加结构化和智能化。',
        features: {
            git: {
                title: 'Git 版本管理',
                description: '通过自动差异检测和历史归档跟踪每一次更改'
            },
            ai: {
                title: 'AI 智能审校',
                description: '获取语法、风格、结构和内容方面的智能建议'
            },
            export: {
                title: '多格式导出',
                description: '使用专业模板导出为 Markdown、LaTeX 和 PDF'
            },
            analytics: {
                title: '写作分析',
                description: '跟踪您的生产力、字数和写作习惯'
            }
        },
        setupWizard: '这个快速设置向导将帮助您在几个步骤内配置 GitForWriter。',
        steps: {
            welcome: '欢迎',
            chooseProvider: '选择 AI 提供商',
            configureKey: '配置 API 密钥',
            testConfig: '测试配置',
            initProject: '初始化项目',
            tutorial: '快速教程'
        },
        buttons: {
            next: '下一步',
            previous: '上一步',
            skip: '跳过',
            finish: '完成',
            startTutorial: '开始交互式教程'
        }
    },

    review: {
        title: '🔍 AI 审校结果',
        overallAssessment: '总体评价：',
        strengths: '✨ 优点',
        improvements: '📋 需要改进',
        suggestions: '💡 修改建议',
        noSuggestions: '暂无具体建议',
        applySuggestion: '采纳建议',
        applyAll: '一键采纳所有建议',
        close: '关闭',
        line: '第',
        original: '原文：',
        suggested: '建议：',
        types: {
            grammar: '语法',
            style: '风格',
            structure: '结构',
            content: '内容',
            clarity: '清晰度'
        }
    },

    commands: {
        startProject: 'GitForWriter: 开始写作项目',
        aiReview: 'GitForWriter: AI 审校',
        exportDraft: 'GitForWriter: 导出草稿',
        configureProvider: 'GitForWriter: 配置 AI 提供商',
        setOpenAIKey: 'GitForWriter: 设置 OpenAI API 密钥',
        setClaudeKey: 'GitForWriter: 设置 Claude API 密钥',
        clearAPIKeys: 'GitForWriter: 清除 API 密钥',
        showConfig: 'GitForWriter: 显示配置',
        viewStatistics: 'GitForWriter: 查看统计',
        enableStatistics: 'GitForWriter: 启用统计',
        disableStatistics: 'GitForWriter: 禁用统计',
        viewPerformance: 'GitForWriter: 查看性能统计',
        clearCache: 'GitForWriter: 清除 AI 缓存',
        gettingStarted: 'GitForWriter: 入门指南'
    },

    messages: {
        welcomeToGitForWriter: '欢迎使用 GitForWriter！为了获得最佳体验，请打开一个文件夹以访问所有功能。',
        openFolder: '打开文件夹',
        noWorkspaceFolder: '未打开工作区文件夹',
        aiReviewCompleted: '✅ AI 审校完成',
        aiReviewFailed: 'AI 审校失败',
        viewLogs: '查看日志',
        statisticsEnabled: '写作统计已启用',
        statisticsDisabled: '写作统计已禁用',
        cacheCleared: 'AI 缓存已清除',
        configurationTestPassed: '✅ 配置测试通过！',
        configurationTestFailed: '❌ 配置测试失败',
        apiKeysCleared: '所有 API 密钥已清除'
    },

    statusBar: {
        stages: {
            ideation: '构思',
            writing: '撰写',
            review: '审校',
            publish: '发布'
        },
        writingStage: '写作阶段'
    },

    providers: {
        openai: {
            name: 'OpenAI / 兼容',
            description: 'GPT-4、DeepSeek、Qwen 等'
        },
        claude: {
            name: 'Anthropic Claude',
            description: 'Claude 3.5 Sonnet、Opus 等'
        },
        unified: {
            name: '统一提供商',
            description: '支持 100+ LLM 提供商'
        },
        local: {
            name: '本地 LLM',
            description: 'Ollama、LM Studio 等'
        }
    },

    config: {
        apiKey: 'API 密钥',
        baseURL: '基础 URL',
        model: '模型',
        provider: '提供商',
        optional: '可选',
        examples: '示例',
        saveConfiguration: '保存配置',
        testConfiguration: '测试配置'
    },

    common: {
        loading: '加载中...',
        error: '错误',
        success: '成功',
        cancel: '取消',
        confirm: '确认'
    }
};

