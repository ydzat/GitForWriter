import { expect } from 'chai';
import * as dotenv from 'dotenv';
import { UnifiedProvider } from '../../ai/providers/unifiedProvider';
import { AIProviderError } from '../../ai/providers/aiProvider';

// Load environment variables
dotenv.config();

describe('UnifiedProvider Integration Tests', function() {
    // Increase timeout for API calls
    this.timeout(30000);

    const apiKey = process.env.API_KEY;
    const baseURL = process.env.BASE_URL;
    const model = process.env.MODEL || 'deepseek-chat';

    // Skip tests if no API key is available
    const describeOrSkip = apiKey ? describe : describe.skip;

    describeOrSkip('Real API Tests with DeepSeek', () => {
        let provider: UnifiedProvider;

        before(() => {
            if (!apiKey) {
                throw new Error('API_KEY not found in .env file');
            }

            provider = new UnifiedProvider({
                provider: 'openai', // DeepSeek is OpenAI-compatible
                model: model,
                apiKey: apiKey,
                baseURL: baseURL
            });
        });

        it('should validate API key successfully', async () => {
            const isValid = await provider.validate();
            expect(isValid).to.be.true;
        });

        it('should analyze diff successfully', async () => {
            const diff = `diff --git a/chapter1.md b/chapter1.md
index 1234567..abcdefg 100644
--- a/chapter1.md
+++ b/chapter1.md
@@ -1,3 +1,4 @@
 # Chapter 1
 
-This is the first chapter.
+This is the first chapter of my novel.
+It introduces the main character.`;

            const result = await provider.analyzeDiff(diff, {
                documentType: 'markdown',
                filePath: 'chapter1.md'
            });

            expect(result).to.have.property('data');
            expect(result.data).to.have.property('summary');
            expect(result.data).to.have.property('semanticChanges');
            expect(result.data.summary).to.be.a('string');
            expect(result.data.summary.length).to.be.greaterThan(0);

            // Check token usage
            expect(result).to.have.property('tokenUsage');
            if (result.tokenUsage) {
                expect(result.tokenUsage.totalTokens).to.be.greaterThan(0);
            }
            
            console.log('\n📊 Diff Analysis Result:');
            console.log('Summary:', result.data.summary);
            console.log('Token Usage:', result.tokenUsage);
        });

        it('should review text successfully', async () => {
            const text = `# 第一章

这是我小说的第一章。它介绍了主角张三，一个普通的程序员。

张三每天都在写代码，但他梦想着成为一名作家。`;

            const result = await provider.reviewText(text, {
                writingStyle: 'formal',
                targetAudience: 'general'
            });

            expect(result).to.have.property('data');
            expect(result.data).to.have.property('overall');
            expect(result.data).to.have.property('rating');
            expect(result.data.rating).to.be.within(0, 10);
            
            console.log('\n📝 Text Review Result:');
            console.log('Overall:', result.data.overall);
            console.log('Rating:', result.data.rating);
            console.log('Strengths:', result.data.strengths);
            console.log('Improvements:', result.data.improvements);
        });

        it('should generate suggestions successfully', async () => {
            const text = `这是一个测试文本。它有一些问题需要修复。`;
            const issues = [
                {
                    type: 'style' as const,
                    line: 1,
                    description: '句子过于简单',
                    severity: 'medium' as const
                }
            ];

            const result = await provider.generateSuggestions(text, issues);

            expect(result).to.have.property('data');
            expect(result.data).to.be.an('array');
            
            console.log('\n💡 Suggestions Result:');
            console.log('Number of suggestions:', result.data.length);
            if (result.data.length > 0) {
                console.log('First suggestion:', result.data[0]);
            }
        });

        it('should handle rate limiting gracefully', async () => {
            // This test makes multiple rapid requests to test retry logic
            const promises = [];
            for (let i = 0; i < 3; i++) {
                promises.push(
                    provider.analyzeDiff(`diff --git a/test${i}.md b/test${i}.md
index 1234567..abcdefg 100644
--- a/test${i}.md
+++ b/test${i}.md
@@ -1 +1 @@
-Old text ${i}
+New text ${i}`)
                );
            }

            const results = await Promise.all(promises);
            expect(results).to.have.lengthOf(3);
            results.forEach(result => {
                expect(result.data).to.have.property('summary');
            });
        });
    });

    describe('Error Handling', () => {
        it('should throw error for invalid API key', async () => {
            const invalidProvider = new UnifiedProvider({
                provider: 'openai',
                model: 'gpt-4',
                apiKey: 'invalid-key-12345',
                baseURL: baseURL
            });

            try {
                await invalidProvider.validate();
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error).to.be.instanceOf(AIProviderError);
            }
        });
    });
});

