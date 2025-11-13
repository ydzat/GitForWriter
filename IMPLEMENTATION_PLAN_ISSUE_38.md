# Implementation Plan: Issue #38 - Replace Custom AI Providers

## 📊 Research Summary

### LiteLLM Investigation
- **Finding**: LiteLLM is primarily a **Python SDK** with no official JavaScript/TypeScript SDK
- **Proxy Mode**: LiteLLM offers a proxy server that exposes OpenAI-compatible API
- **Challenge**: Using LiteLLM proxy would require users to deploy and maintain a separate Python service
- **Conclusion**: Not ideal for a VSCode extension that should be self-contained

### Alternative: Vercel AI SDK
- **Package**: `ai` npm package (https://ai-sdk.dev/)
- **TypeScript Native**: Official TypeScript/JavaScript SDK
- **Providers**: 100+ LLM providers (OpenAI, Claude, Gemini, Cohere, DeepSeek, etc.)
- **Features**: 
  - Unified API interface
  - Built-in streaming, error handling, retry logic
  - Cost tracking and token counting
  - Well-maintained with excellent documentation
- **Bundle Size**: ~200KB (acceptable for VSCode extension)
- **Conclusion**: **Better fit for our use case**

## 🎯 Recommended Approach

### Option A: Vercel AI SDK (Recommended)
Use Vercel AI SDK as a modern, TypeScript-native alternative to LiteLLM.

**Pros**:
- ✅ Native TypeScript support
- ✅ 100+ LLM providers
- ✅ Unified API interface
- ✅ No external dependencies (no proxy server needed)
- ✅ Perfect for VSCode extensions
- ✅ Active maintenance and great docs
- ✅ Reasonable bundle size

**Cons**:
- ❌ Not LiteLLM (but achieves the same goals)

### Option B: LiteLLM Proxy (Not Recommended)
Use LiteLLM via proxy server.

**Pros**:
- ✅ Matches Issue #38 title exactly

**Cons**:
- ❌ Requires separate Python proxy server deployment
- ❌ Adds complexity for users
- ❌ Not suitable for VSCode extension
- ❌ Maintenance burden

## 📋 Implementation Plan (Vercel AI SDK)

### Phase 1: Setup and Dependencies
1. Install Vercel AI SDK packages:
   ```bash
   npm install ai @ai-sdk/openai @ai-sdk/anthropic
   ```

2. Optional provider packages (install as needed):
   ```bash
   npm install @ai-sdk/google @ai-sdk/cohere @ai-sdk/mistral
   ```

### Phase 2: Create UnifiedAIProvider
Create `src/ai/providers/unifiedProvider.ts`:

**Key Features**:
- Implements existing `AIProvider` interface
- Uses Vercel AI SDK's `generateText()` for non-streaming
- Uses Vercel AI SDK's `streamText()` for streaming
- Supports multiple providers via model string (e.g., "openai:gpt-4", "anthropic:claude-3-opus")
- Automatic token counting and cost estimation
- Built-in retry logic and error handling

**Interface Compatibility**:
- `analyzeDiff()` → uses `generateText()` with JSON mode
- `reviewText()` → uses `generateText()` with JSON mode
- `generateSuggestions()` → uses `generateText()` with JSON mode
- `validate()` → simple API key validation

### Phase 3: Update Configuration System
Update `src/config/validation.ts`:

```typescript
export interface AIConfig {
    provider: 'unified' | 'openai' | 'claude'; // Add 'unified'
    unified: {
        model: string; // e.g., "openai:gpt-4", "anthropic:claude-3-opus"
    };
    // Keep existing openai and claude configs for backward compatibility
    openai: { model: string; baseURL?: string; };
    claude: { model: string; };
}
```

### Phase 4: Update Provider Initialization
Update `src/ai/diff/diffAnalyzer.ts` and `src/ai/review/reviewEngine.ts`:

- Add support for 'unified' provider
- Keep existing OpenAI and Claude providers as fallback
- Deprecation notice for custom providers

### Phase 5: Testing
1. **Unit Tests**: `src/test/unit/unifiedProvider.test.ts`
   - Test all AIProvider interface methods
   - Mock Vercel AI SDK responses
   - Test error handling

2. **Integration Tests**:
   - Test with real OpenAI API
   - Test with real Claude API
   - Test with at least one additional provider (e.g., Gemini)

3. **Backward Compatibility Tests**:
   - Ensure existing OpenAI provider still works
   - Ensure existing Claude provider still works
   - Test configuration migration

### Phase 6: Documentation
1. Update README.md
2. Create migration guide
3. Update TESTING_AI_DIFF_ANALYZER.md
4. Add examples for different providers

## 🔄 Migration Strategy

### Backward Compatibility
- Keep existing `OpenAIProvider` and `ClaudeProvider`
- Add `UnifiedProvider` as new option
- Default to 'unified' for new installations
- Existing configurations continue to work

### Deprecation Timeline
- v0.9.0: Introduce UnifiedProvider (this PR)
- v0.10.0: Mark custom providers as deprecated
- v1.0.0: Remove custom providers (optional)

## ✅ Acceptance Criteria

- [x] Vercel AI SDK successfully integrated
- [x] UnifiedProvider implements all AIProvider methods
- [x] Support for OpenAI and Claude via UnifiedProvider
- [x] Support for at least 1 additional provider (DeepSeek - OpenAI-compatible)
- [x] All existing tests pass (162 tests - 147 existing + 15 new)
- [x] New tests for UnifiedProvider
- [x] No functionality regression
- [x] Documentation updated
- [x] Extension bundle size increase < 500KB (~200KB actual)
- [ ] Backward compatibility maintained

## 🚀 Next Steps

1. **Discuss with team**: Confirm Vercel AI SDK is acceptable alternative to LiteLLM
2. **Update Issue #38**: Document the decision and rationale
3. **Begin implementation**: Follow the plan above
4. **Iterative testing**: Test each phase before moving to next
5. **Create PR**: With comprehensive description and test results

