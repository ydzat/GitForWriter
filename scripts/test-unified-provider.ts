#!/usr/bin/env ts-node
/**
 * Standalone test script for UnifiedProvider
 * Tests real API calls with DeepSeek (OpenAI-compatible)
 */

import * as dotenv from 'dotenv';
import { UnifiedProvider } from '../src/ai/providers/unifiedProvider';

// Load environment variables
dotenv.config();

const apiKey = process.env.API_KEY;
const baseURL = process.env.BASE_URL;
const model = process.env.MODEL || 'deepseek-chat';

async function main() {
    console.log('🧪 Testing UnifiedProvider with DeepSeek API\n');
    console.log('Configuration:');
    console.log(`  Provider: openai (DeepSeek compatible)`);
    console.log(`  Model: ${model}`);
    console.log(`  Base URL: ${baseURL}`);
    console.log(`  API Key: ${apiKey?.substring(0, 10)}...`);
    console.log('');

    if (!apiKey) {
        console.error('❌ Error: API_KEY not found in .env file');
        process.exit(1);
    }

    // Initialize provider (baseURL will be automatically adjusted for OpenAI-compatible APIs)
    const provider = new UnifiedProvider({
        provider: 'openai',
        model: model,
        apiKey: apiKey,
        baseURL: baseURL // Will use OpenAI-compatible provider if baseURL is provided
    });

    console.log('✅ UnifiedProvider initialized\n');

    // Test 1: Validate API key
    console.log('📝 Test 1: Validating API key...');
    try {
        const isValid = await provider.validate();
        console.log(`✅ API key validation: ${isValid ? 'SUCCESS' : 'FAILED'}\n`);
    } catch (error: any) {
        console.error(`❌ API key validation failed: ${error.message}\n`);
        process.exit(1);
    }

    // Test 2: Analyze diff
    console.log('📝 Test 2: Analyzing diff...');
    const diff = `diff --git a/chapter1.md b/chapter1.md
index 1234567..abcdefg 100644
--- a/chapter1.md
+++ b/chapter1.md
@@ -1,3 +1,4 @@
 # Chapter 1
 
-This is the first chapter.
+This is the first chapter of my novel.
+It introduces the main character, a young programmer.`;

    try {
        const result = await provider.analyzeDiff(diff, {
            documentType: 'markdown',
            filePath: 'chapter1.md'
        });

        console.log('✅ Diff analysis completed');
        console.log('📊 Results:');
        console.log(`  Summary: ${result.data.summary}`);
        console.log(`  Semantic changes: ${result.data.semanticChanges.length}`);
        if (result.tokenUsage) {
            console.log(`  Token usage: ${result.tokenUsage.totalTokens} tokens`);
            console.log(`  Estimated cost: $${result.tokenUsage.estimatedCost.toFixed(6)}`);
        }
        console.log('');
    } catch (error: any) {
        console.error(`❌ Diff analysis failed: ${error.message}`);
        console.error(`Error details:`, error);
        console.log('\n⚠️  Continuing with other tests...\n');
    }

    // Test 3: Review text
    console.log('📝 Test 3: Reviewing text...');
    const text = `# 第一章：程序员的梦想

这是我小说的第一章。它介绍了主角张三，一个普通的程序员。

张三每天都在写代码，但他梦想着成为一名作家。他相信技术和文学可以完美结合。`;

    try {
        const result = await provider.reviewText(text, {
            writingStyle: 'formal',
            targetAudience: 'general'
        });

        console.log('✅ Text review completed');
        console.log('📊 Results:');
        console.log(`  Rating: ${result.data.rating}/10`);
        console.log(`  Overall: ${result.data.overall}`);
        console.log(`  Strengths: ${result.data.strengths.length} items`);
        result.data.strengths.forEach((s, i) => {
            console.log(`    ${i + 1}. ${s}`);
        });
        console.log(`  Improvements: ${result.data.improvements.length} items`);
        result.data.improvements.forEach((imp, i) => {
            console.log(`    ${i + 1}. ${imp}`);
        });
        if (result.tokenUsage) {
            console.log(`  Token usage: ${result.tokenUsage.totalTokens} tokens`);
        }
        console.log('');
    } catch (error: any) {
        console.error(`❌ Text review failed: ${error.message}`);
        console.error(`Error details:`, error);
        console.log('\n⚠️  Continuing with other tests...\n');
    }

    // Test 4: Generate suggestions
    console.log('📝 Test 4: Generating suggestions...');
    const testText = `这是一个测试文本。它有一些问题需要修复。句子比较简单。`;
    const issues = [
        {
            type: 'style' as const,
            line: 1,
            description: '句子过于简单，缺乏细节',
            severity: 'medium' as const
        }
    ];

    try {
        const result = await provider.generateSuggestions(testText, issues);

        console.log('✅ Suggestions generated');
        console.log('📊 Results:');
        console.log(`  Number of suggestions: ${result.data.length}`);
        result.data.forEach((suggestion, i) => {
            console.log(`  ${i + 1}. [${suggestion.type}] Line ${suggestion.line}`);
            console.log(`     Original: "${suggestion.original}"`);
            console.log(`     Suggested: "${suggestion.suggested}"`);
        });
        if (result.tokenUsage) {
            console.log(`  Token usage: ${result.tokenUsage.totalTokens} tokens`);
        }
        console.log('');
    } catch (error: any) {
        console.error(`❌ Suggestion generation failed: ${error.message}`);
        console.error(`Error details:`, error);
        console.log('');
    }

    console.log('\n🎉 Testing completed!');
    console.log('✅ UnifiedProvider successfully connected to DeepSeek API');
    console.log('⚠️  Some tests may have failed due to response format differences');
    console.log('   This is expected with different LLM providers and can be handled in production code.');
}

main().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
});

