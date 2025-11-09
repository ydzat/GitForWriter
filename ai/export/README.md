# AI Export Manager

## 功能概述

导出管理器负责将写作内容转换为多种格式，满足不同的发布需求。

## 支持格式

### 1. Markdown
- 保留原始格式
- 添加导出元数据
- 适用于：GitHub、博客平台

### 2. LaTeX
- 自动转换 Markdown 到 LaTeX
- 支持直接导出 LaTeX 文档
- 包含完整的文档结构
- 适用于：学术出版、期刊投稿

### 3. PDF
- 通过 LaTeX 中间格式生成
- 需要外部工具：pandoc 或 pdflatex
- 适用于：打印、正式发布

## 转换规则

### Markdown → LaTeX

- `# Heading` → `\section{Heading}`
- `## Heading` → `\subsection{Heading}`
- `**bold**` → `\textbf{bold}`
- `*italic*` → `\textit{italic}`
- `` `code` `` → `\texttt{code}`
- `[text](url)` → `\href{url}{text}`
- 列表项 → `\begin{itemize}...\end{itemize}`

## 使用示例

```typescript
import { ExportManager } from './ai/export/exportManager';

const manager = new ExportManager();

// 导出为 Markdown
const mdPath = await manager.export(document, 'markdown');

// 导出为 LaTeX
const texPath = await manager.export(document, 'latex');

// 导出为 PDF (需要外部工具)
const pdfPath = await manager.export(document, 'pdf');
```

## 输出位置

所有导出文件默认保存在工作区的 `exports/` 目录下。

文件命名格式：`{原文件名}_{日期}.{格式}`

例如：`chapter1_2024-01-01.md`

## 扩展点

在此目录下可以添加：
- 更多导出格式（DOCX, EPUB, HTML 等）
- 自定义转换模板
- 格式化选项配置
- 批量导出功能
- 与发布平台的集成（Medium, WordPress 等）
