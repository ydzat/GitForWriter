#!/usr/bin/env ts-node
/**
 * Debug script to test DeepSeek API directly
 */

import * as dotenv from 'dotenv';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText } from 'ai';

dotenv.config();

const apiKey = process.env.API_KEY;
const baseURL = process.env.BASE_URL;
const model = process.env.MODEL || 'deepseek-chat';

async function main() {
    console.log('🔍 Debugging DeepSeek API Connection\n');
    console.log('Configuration:');
    console.log(`  API Key: ${apiKey?.substring(0, 15)}...`);
    console.log(`  Base URL: ${baseURL}`);
    console.log(`  Model: ${model}\n`);

    if (!apiKey) {
        console.error('❌ API_KEY not found in .env');
        process.exit(1);
    }

    try {
        console.log('Creating OpenAI-compatible provider for DeepSeek...');
        // DeepSeek requires /v1 suffix for OpenAI compatibility
        const fullBaseURL = baseURL?.endsWith('/v1') ? baseURL : `${baseURL}/v1`;
        console.log(`  Full Base URL: ${fullBaseURL}\n`);

        const deepseek = createOpenAICompatible({
            name: 'deepseek',
            apiKey: apiKey!,
            baseURL: fullBaseURL
        });

        console.log('✅ Provider created\n');

        console.log('Testing simple text generation...');
        const result = await generateText({
            model: deepseek.chatModel(model),
            prompt: 'Say "Hello" in one word.',
            maxOutputTokens: 10,
            temperature: 0.3
        });

        console.log('✅ API call successful!\n');
        console.log('Response:');
        console.log(`  Text: ${result.text}`);
        console.log(`  Finish reason: ${result.finishReason}`);
        console.log(`  Token usage:`);
        console.log(`    Input: ${result.usage.inputTokens}`);
        console.log(`    Output: ${result.usage.outputTokens}`);
        console.log(`    Total: ${result.usage.totalTokens}`);

    } catch (error: any) {
        console.error('\n❌ API call failed:');
        console.error(`  Error type: ${error.constructor.name}`);
        console.error(`  Message: ${error.message}`);
        console.error(`  Status code: ${error.statusCode || 'N/A'}`);
        console.error(`  Response body: ${error.responseBody || 'N/A'}`);
        console.error('\nFull error:', error);
        process.exit(1);
    }
}

main();

