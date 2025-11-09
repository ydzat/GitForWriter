# Changelog

All notable changes to the GitForWriter extension will be documented in this file.

## [1.0.0] - 2024-01-01

### Added
- ✨ 初始版本发布
- 🎯 三大核心命令：
  - "Start Writing Project" - 初始化写作项目
  - "AI Review" - AI 智能审校
  - "Export Draft" - 多格式导出
- 🔍 自动 Git diff 检测和记录
- 🤖 AI 语义 Diff 分析模块
  - 自然语言修改摘要
  - 逻辑一致性报告
- 📊 WebView 审校结果面板
  - 可视化展示审校结果
  - 一键采纳修改建议
- 📈 状态栏写作阶段显示
  - 构思 → 撰写 → 审校 → 发布
- 📁 自动创建项目结构
  - `.gitforwriter` 目录用于存储 diff 和审校记录
  - `ai` 目录用于扩展 AI 模块
- 📤 多格式导出支持
  - Markdown
  - LaTeX
  - PDF（需要外部工具）
- 📚 完整的中文文档和 README
- 🎨 支持 Markdown 和 LaTeX 文件

### Technical
- TypeScript 实现，类型安全
- ESLint 代码质量检查
- 集成 simple-git 进行 Git 操作
- VSCode Extension API 深度集成

## [Unreleased]

### Planned
- 集成外部 AI 模型（GPT-4, Claude 等）
- 多人协作功能
- 写作统计和分析
- 自定义审校规则
- 更多导出格式支持
