# Testing Guide

This document describes the testing framework and how to run tests for GitForWriter.

## Testing Framework

GitForWriter uses the following testing tools:

- **Mocha**: Test framework
- **Chai**: Assertion library
- **NYC (Istanbul)**: Code coverage tool
- **@vscode/test-electron**: VSCode extension integration testing
- **ts-node**: TypeScript execution for tests

## Test Structure

```
src/test/
├── unit/                    # Unit tests (no VSCode runtime required)
│   ├── diffAnalyzer.test.ts
│   ├── reviewEngine.test.ts
│   └── gitManager.test.ts
├── suite/                   # Integration tests (requires VSCode runtime)
│   ├── index.ts
│   ├── diffAnalyzer.test.ts
│   ├── reviewEngine.test.ts
│   ├── gitManager.test.ts
│   ├── statusBarManager.test.ts
│   └── exportManager.test.ts
└── runTest.ts              # Test runner for integration tests
```

## Running Tests

### Unit Tests (Recommended)

Unit tests run without VSCode runtime and are faster:

```bash
npm test
# or
npm run test:unit
```

### Integration Tests

Integration tests require VSCode runtime (may need GUI environment):

```bash
npm run test:integration
```

### Coverage Report

Generate code coverage report:

```bash
npm run test:coverage
```

Coverage reports are generated in:
- Console output (text format)
- `coverage/` directory (HTML format)

## Coverage Requirements

The project maintains the following coverage thresholds:

- **Lines**: ≥ 60%
- **Statements**: ≥ 60%
- **Functions**: ≥ 60%
- **Branches**: ≥ 50%

Current coverage: **65.73%** (exceeds requirements ✅)

## Test Modules

### Core Modules Tested

1. **DiffAnalyzer** (98% coverage)
   - Diff parsing and analysis
   - Semantic change detection
   - Consistency reporting

2. **ReviewEngine** (96.77% coverage)
   - Review generation
   - Rating calculation
   - Suggestion creation

3. **GitManager** (92.5% coverage)
   - Git repository initialization
   - Diff retrieval
   - Commit management
   - History tracking

## Writing New Tests

### Unit Test Example

```typescript
import { expect } from 'chai';
import { YourModule } from '../../path/to/module';

describe('YourModule Unit Tests', () => {
    let instance: YourModule;

    beforeEach(() => {
        instance = new YourModule();
    });

    it('should do something', () => {
        const result = instance.doSomething();
        expect(result).to.equal(expectedValue);
    });
});
```

### Integration Test Example

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('YourModule Integration Tests', () => {
    test('should work with VSCode API', () => {
        // Test code using VSCode API
        assert.ok(true);
    });
});
```

## CI/CD Integration

Tests are designed to run in CI environments:

- Unit tests run without GUI
- Coverage reports can be uploaded to coverage services
- Exit codes indicate test success/failure

### GitHub Actions Example

```yaml
- name: Run tests
  run: npm test

- name: Generate coverage
  run: npm run test:coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

## Troubleshooting

### Tests fail with "Cannot find module"

Run `npm install` to ensure all dependencies are installed.

### Integration tests fail with library errors

Integration tests require a GUI environment. Use unit tests for CI/CD pipelines.

### Coverage below threshold

Run `npm run test:coverage` to see which files need more test coverage.

## Best Practices

1. **Write unit tests first**: They're faster and don't require VSCode runtime
2. **Test edge cases**: Empty inputs, null values, error conditions
3. **Use descriptive test names**: Clearly state what is being tested
4. **Keep tests isolated**: Each test should be independent
5. **Mock external dependencies**: Use stubs/mocks for file system, network calls
6. **Maintain coverage**: Aim for >60% coverage on all new code

## Resources

- [Mocha Documentation](https://mochajs.org/)
- [Chai Assertion Library](https://www.chaijs.com/)
- [VSCode Extension Testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [NYC Coverage Tool](https://github.com/istanbuljs/nyc)

