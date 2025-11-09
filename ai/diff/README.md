# AI Diff Analyzer

## 功能概述

差异分析器负责将 Git diff 转换为语义层面的理解，生成自然语言的修改摘要。

## 核心能力

### 1. 语义变更识别
- 识别添加、删除、修改的具体内容
- 分类变更类型（标题、段落、列表项等）
- 提供置信度评分

### 2. 一致性检查
- 句子长度分析
- 段落结构检查
- 重复词汇检测
- 生成一致性评分（0-100）

### 3. 智能摘要
- 统计性摘要（+X 行，-Y 行）
- 语义化描述（涉及 N 个标题，M 段文本）
- 中文友好的自然语言输出

## 使用示例

```typescript
import { DiffAnalyzer } from './ai/diff/diffAnalyzer';

const analyzer = new DiffAnalyzer();

// 完整分析
const analysis = await analyzer.analyze(gitDiff, fullContent);
console.log(analysis.summary);
console.log(analysis.consistencyReport);

// 快速分析
const quick = await analyzer.quickAnalyze(gitDiff);
console.log(quick.summary); // "+10 -5 lines"
```

## 输出结构

```typescript
interface DiffAnalysis {
    summary: string;              // 总体摘要
    additions: number;            // 添加行数
    deletions: number;            // 删除行数
    modifications: number;        // 修改处数
    semanticChanges: SemanticChange[];  // 语义变更列表
    consistencyReport: ConsistencyReport; // 一致性报告
}
```

## 扩展点

在此目录下可以添加：
- 自定义语义识别规则
- 特定领域的术语检测
- 更复杂的文本分析算法
