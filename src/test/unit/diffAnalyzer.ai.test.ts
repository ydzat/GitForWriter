import { expect } from 'chai';
import { DiffAnalyzer } from '../../ai/diff/diffAnalyzer';
import { ConfigManager } from '../../config/configManager';
import { SecretManager } from '../../config/secretManager';
import { AIProvider, AIResponse, DiffAnalysis, AnalysisContext } from '../../ai/providers/aiProvider';

describe('DiffAnalyzer AI Integration Tests', () => {
    let diffAnalyzer: DiffAnalyzer;
    let mockConfigManager: ConfigManager;
    let mockSecretManager: SecretManager;
    let mockAIProvider: AIProvider;

    beforeEach(() => {
        // Create mock AI provider
        mockAIProvider = {
            analyzeDiff: async (diff: string, context?: AnalysisContext): Promise<AIResponse<DiffAnalysis>> => {
                return {
                    data: {
                        summary: 'AI-generated summary: 添加了新内容',
                        additions: 1,
                        deletions: 0,
                        modifications: 0,
                        semanticChanges: [
                            {
                                type: 'addition',
                                description: 'AI detected: New paragraph added',
                                lineNumber: 1,
                                confidence: 0.95,
                                explanation: 'This is a new content addition',
                                impact: 'moderate'
                            }
                        ],
                        consistencyReport: {
                            score: 85,
                            issues: ['AI detected: Minor style inconsistency'],
                            suggestions: ['AI suggests: Consider using active voice']
                        },
                        impact: 'moderate',
                        structuralChanges: ['Added new section'],
                        toneChanges: ['More formal tone']
                    },
                    tokenUsage: {
                        promptTokens: 100,
                        completionTokens: 50,
                        totalTokens: 150,
                        estimatedCost: 0.001
                    },
                    model: 'gpt-4',
                    timestamp: new Date()
                };
            },
            reviewText: async () => {
                throw new Error('Not implemented');
            },
            generateSuggestions: async () => {
                throw new Error('Not implemented');
            },
            validate: async () => true
        };

        // Create mock ConfigManager
        mockConfigManager = {
            getConfig: () => ({
                provider: 'openai',
                openai: { model: 'gpt-4' },
                claude: { model: 'claude-3-sonnet' },
                local: { endpoint: 'http://localhost:11434', model: 'llama2' }
            }),
            getPerformanceConfig: () => ({
                debounceDelay: 2000,
                enableCache: true,
                cacheTTL: 3600000,
                cacheMaxSize: 104857600
            })
        } as any;

        // Create mock SecretManager with API key
        mockSecretManager = {
            getOpenAIKey: async () => 'mock-api-key',
            getClaudeKey: async () => undefined
        } as any;
    });

    describe('AI-powered analysis', () => {
        it('should use AI provider when available', async () => {
            diffAnalyzer = new DiffAnalyzer(mockConfigManager, mockSecretManager);
            
            // Inject mock provider
            (diffAnalyzer as any).aiProvider = mockAIProvider;
            (diffAnalyzer as any).initializationPromise = null;

            const diff = `@@ -1,0 +1,1 @@
+This is a new line`;
            const content = 'This is a new line';

            const analysis = await diffAnalyzer.analyze(diff, content);

            expect(analysis.summary).to.include('AI-generated');
            expect(analysis.semanticChanges[0].explanation).to.exist;
            expect(analysis.semanticChanges[0].impact).to.exist;
            expect(analysis.impact).to.equal('moderate');
            expect(analysis.structuralChanges).to.be.an('array');
            expect(analysis.toneChanges).to.be.an('array');
        });

        it('should fallback to rule-based analysis when AI fails', async () => {
            // Create failing AI provider
            const failingProvider: AIProvider = {
                analyzeDiff: async () => {
                    throw new Error('API error');
                },
                reviewText: async () => { throw new Error('Not implemented'); },
                generateSuggestions: async () => { throw new Error('Not implemented'); },
                validate: async () => false
            };

            diffAnalyzer = new DiffAnalyzer(mockConfigManager, mockSecretManager);
            (diffAnalyzer as any).aiProvider = failingProvider;
            (diffAnalyzer as any).initializationPromise = null;

            const diff = `@@ -1,0 +1,1 @@
+This is a new line`;
            const content = 'This is a new line';

            const analysis = await diffAnalyzer.analyze(diff, content);

            // Should still work with fallback
            expect(analysis.summary).to.exist;
            expect(analysis.additions).to.equal(1);
            expect(analysis.deletions).to.equal(0);
            // Fallback doesn't include AI-specific fields
            expect(analysis.summary).to.not.include('AI-generated');
        });

        it('should fallback when no API key is available', async () => {
            const noKeySecretManager = {
                getOpenAIKey: async () => undefined,
                getClaudeKey: async () => undefined
            } as any;

            diffAnalyzer = new DiffAnalyzer(mockConfigManager, noKeySecretManager);

            const diff = `@@ -1,0 +1,1 @@
+# New Heading`;
            const content = '# New Heading';

            const analysis = await diffAnalyzer.analyze(diff, content);

            // Should use fallback analysis
            expect(analysis.summary).to.exist;
            expect(analysis.additions).to.equal(1);
            expect(analysis.semanticChanges.some(c => c.description.includes('Heading'))).to.be.true;
        });
    });
});

