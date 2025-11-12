# Testing AI-Powered DiffAnalyzer

This document provides instructions for manually testing the AI-powered DiffAnalyzer implementation.

## Prerequisites

1. **API Keys**: You need either an OpenAI or Claude API key
2. **VSCode Extension**: The GitForWriter extension must be installed

## Setup

### 1. Configure AI Provider

Open VSCode Command Palette (`Cmd+Shift+P` or `Ctrl+Shift+P`) and run:

```
GitForWriter: Configure AI Provider
```

Select either:
- OpenAI (GPT-4, GPT-3.5-turbo)
- Claude (Claude-3-Opus, Claude-3-Sonnet, Claude-3-Haiku)

### 2. Set API Key

#### For OpenAI:
```
GitForWriter: Set OpenAI API Key
```

#### For Claude:
```
GitForWriter: Set Claude API Key
```

## Test Scenarios

### Test 1: Simple Text Addition

1. Create a new markdown file: `test-simple.md`
2. Add initial content:
   ```markdown
   # My Document
   
   This is the first paragraph.
   ```
3. Save and commit the file
4. Add new content:
   ```markdown
   # My Document
   
   This is the first paragraph.
   
   This is a new paragraph with additional information.
   ```
5. Save the file
6. Run `GitForWriter: AI Review`

**Expected Result**: 
- AI should detect the addition of a new paragraph
- Should provide semantic analysis (not just line counts)
- Should include consistency report with AI-generated suggestions

### Test 2: Structural Changes

1. Create `test-structure.md`:
   ```markdown
   # Introduction
   
   Some content here.
   ```
2. Save and commit
3. Modify to add sections:
   ```markdown
   # Introduction
   
   Some content here.
   
   ## Background
   
   Historical context goes here.
   
   ## Methodology
   
   Our approach is described here.
   ```
4. Save and run AI Review

**Expected Result**:
- AI should detect structural changes (new sections)
- Should identify the organizational improvements
- Should provide impact assessment

### Test 3: Tone and Style Changes

1. Create `test-tone.md`:
   ```markdown
   # Report
   
   We did some experiments. The results were good.
   ```
2. Save and commit
3. Change to more formal tone:
   ```markdown
   # Report
   
   A comprehensive series of experiments was conducted. The results demonstrated significant positive outcomes.
   ```
4. Save and run AI Review

**Expected Result**:
- AI should detect tone changes (casual → formal)
- Should identify style improvements
- Should provide feedback on writing quality

### Test 4: Fallback Mechanism

1. Clear your API key:
   ```
   GitForWriter: Clear API Keys
   ```
2. Make changes to any markdown file
3. Save and run AI Review

**Expected Result**:
- Should see console warning: "OpenAI API key not found, will use fallback analysis"
- Should still get analysis results (using rule-based fallback)
- Results will be simpler (no AI-specific insights)

## Verification Checklist

- [ ] AI analysis provides semantic insights (not just line counts)
- [ ] Consistency report includes AI-generated suggestions
- [ ] Analysis includes impact assessment (minor/moderate/major)
- [ ] Structural changes are detected and described
- [ ] Tone/style changes are identified
- [ ] Fallback mechanism works when API key is missing
- [ ] Fallback mechanism works when API call fails
- [ ] Both OpenAI and Claude providers work correctly
- [ ] Token usage and cost are tracked (check console logs)

## Debugging

### Check Console Logs

Open VSCode Developer Tools:
- `Help > Toggle Developer Tools`
- Check Console tab for logs:
  - "AI analysis completed successfully" (AI working)
  - "AI analysis failed, falling back..." (Fallback triggered)
  - "OpenAI API key not found..." (No API key)

### Common Issues

1. **"Invalid API key" error**
   - Verify your API key is correct
   - Check if the key has proper permissions
   - Try regenerating the key

2. **"Rate limit exceeded"**
   - Wait a few minutes and try again
   - The provider has built-in retry logic with exponential backoff

3. **No AI insights in results**
   - Check if fallback was triggered (console logs)
   - Verify API key is set correctly
   - Check network connectivity

## Expected Differences: AI vs Fallback

### AI-Powered Analysis
```json
{
  "summary": "添加了新的方法论章节，增强了文档的学术性和结构性",
  "semanticChanges": [
    {
      "type": "addition",
      "description": "Added methodology section",
      "explanation": "Introduces systematic approach description",
      "impact": "major",
      "confidence": 0.95
    }
  ],
  "impact": "major",
  "structuralChanges": ["Added new section: Methodology"],
  "toneChanges": ["More academic and formal"],
  "consistencyReport": {
    "score": 85,
    "issues": ["Consider adding more examples"],
    "suggestions": ["Expand on the methodology details"]
  }
}
```

### Fallback Analysis
```json
{
  "summary": "添加了 5 行。涉及 1 个标题、3 段文本。",
  "semanticChanges": [
    {
      "type": "addition",
      "description": "Heading change: \"## Methodology\"",
      "confidence": 0.85
    }
  ],
  "consistencyReport": {
    "score": 95,
    "issues": [],
    "suggestions": []
  }
}
```

## Success Criteria

✅ All test scenarios pass
✅ AI provides meaningful semantic insights
✅ Fallback works reliably when AI is unavailable
✅ No errors in console
✅ All 111 unit tests pass

