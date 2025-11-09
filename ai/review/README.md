# AI Review Engine

## 功能概述

审校引擎基于差异分析结果，生成全面的文本质量评估报告。

## 核心能力

### 1. 多维度评估
- **优点识别**：发现文本的亮点
- **问题诊断**：指出需要改进的地方
- **改进建议**：提供具体的修改方案

### 2. 评分系统
- 综合评分（0-10）
- 基于多个因素：
  - 一致性评分
  - 优点数量
  - 问题数量

### 3. 建议类型
- `grammar`: 语法问题
- `style`: 风格建议
- `structure`: 结构优化
- `content`: 内容改进

## 使用示例

```typescript
import { ReviewEngine } from './ai/review/reviewEngine';
import { DiffAnalyzer } from '../diff/diffAnalyzer';

const analyzer = new DiffAnalyzer();
const engine = new ReviewEngine();

const analysis = await analyzer.analyze(diff, content);
const review = await engine.generateReview(analysis);

console.log(review.overall);
console.log(review.rating);
```

## 输出结构

```typescript
interface Review {
    overall: string;              // 总体评价
    strengths: string[];          // 优点列表
    improvements: string[];       // 需要改进的地方
    suggestions: ReviewSuggestion[]; // 具体建议
    rating: number;               // 评分 (0-10)
}
```

## 扩展点

在此目录下可以添加：
- 集成外部 AI 模型（OpenAI, Claude 等）
- 自定义审校规则
- 特定文体的审校模板（学术、小说、技术等）
- 多语言支持
