# GitForWriter

**让文学创作具备软件开发的流程化特征**

GitForWriter 是一个 VSCode 插件，旨在探索 AI 与版本控制在创作流程中的融合，使写作过程具备工业级可控性与智能化特征。它为 Markdown 与 LaTeX 写作提供版本管理、AI 审校与自动化发布功能，让写作像 Git 工程一样可回溯、可对比、可发布。

## 🌟 核心特性

### 1. 智能写作流程管理
- **四阶段写作流水线**：构思 → 撰写 → 审校 → 发布
- **状态栏实时显示**：随时掌握当前写作阶段
- **自动化项目初始化**：一键创建完整的写作项目结构

### 2. Git 版本管理集成
- **自动差异检测**：每次保存文档时自动检测 Git 差异
- **历史记录归档**：所有修改记录保存到 `.gitforwriter` 目录
- **可追溯的创作过程**：回顾每一次文本演进

### 3. AI 语义 Diff 分析
- **自然语言修改摘要**：将代码式 diff 转换为易读的修改描述
- **逻辑一致性报告**：自动检测文本结构、风格、语法问题
- **语义变更识别**：智能分析内容的增删改，理解修改意图

### 4. AI 智能审校
- **综合评分系统**：0-10 分评价修改质量
- **多维度分析**：
  - ✨ 优点识别：发现文本的亮点
  - 📋 改进建议：指出需要优化的地方
  - 💡 具体修改建议：提供可操作的改进方案
- **WebView 可视化面板**：清晰展示审校结果
- **一键采纳修改**：快速应用 AI 建议

### 5. 多格式导出
- **Markdown 导出**：保持原始格式，添加元数据
- **LaTeX 导出**：自动转换或直接导出 LaTeX 文档，支持多种模板（学术论文、书籍、文章）
- **PDF 导出**：✨ **完整 PDF 生成功能**
  - 自动检测 LaTeX 编译器（pdflatex、xelatex、lualatex）
  - 多次编译支持（解析引用和目录）
  - 自动清理辅助文件
  - 编译进度显示和取消功能
  - 编译完成后自动打开 PDF
  - 友好的错误提示和解决建议

## 📦 安装

### 从 VSIX 文件安装
1. 下载 `.vsix` 文件
2. 在 VSCode 中打开扩展面板
3. 点击 `...` 菜单，选择"从 VSIX 安装..."
4. 选择下载的文件

### 从源码构建
```bash
git clone https://github.com/ydzat/GitForWriter.git
cd GitForWriter
npm install
npm run compile
```

## 🚀 快速开始

### 1. 开始写作项目
1. 打开 VSCode 命令面板 (`Ctrl+Shift+P` 或 `Cmd+Shift+P`)
2. 输入 "GitForWriter: Start Writing Project"
3. 插件将自动初始化：
   - Git 仓库（如果不存在）
   - `.gitforwriter` 目录结构
   - `ai` 模块目录

### 2. 日常写作
- 正常编辑 Markdown 或 LaTeX 文件
- 每次保存时，插件会自动：
  - 检测文件变化
  - 生成 diff 记录
  - 保存到 `.gitforwriter/diffs` 目录
  - 进行快速语义分析

### 3. AI 审校
1. 打开命令面板
2. 运行 "GitForWriter: AI Review"
3. 查看审校结果：
   - 总体评分和评价
   - 优点列表
   - 需要改进的地方
   - 具体修改建议
4. 可选：一键采纳建议

### 4. 导出作品
1. 打开命令面板
2. 运行 "GitForWriter: Export Draft"
3. 选择导出格式：
   - **Markdown**：保持原始格式
   - **LaTeX**：使用配置的模板（default/academic/book/article）
   - **PDF**：自动编译 LaTeX 生成 PDF
4. 导出文件保存在 `exports` 目录

**PDF 导出要求**：
- 需要安装 LaTeX 发行版（MiKTeX、MacTeX 或 TeX Live）
- 详细配置和使用说明请参考 [PDF_EXPORT_GUIDE.md](PDF_EXPORT_GUIDE.md)

## 📁 项目结构

```
your-writing-project/
├── .gitforwriter/           # 插件数据目录
│   ├── diffs/               # Git diff 记录
│   │   ├── chapter1.md_2024-01-01.diff
│   │   └── chapter1.md_2024-01-01.json
│   └── reviews/             # AI 审校记录
├── ai/                      # AI 模块扩展目录
│   ├── diff/                # 差异分析模块
│   ├── review/              # 审校引擎模块
│   └── export/              # 导出管理模块
├── exports/                 # 导出文件目录
├── chapters/                # 你的写作内容
│   ├── chapter1.md
│   └── chapter2.md
└── README.md
```

## 🎯 设计理念：AI 辅助写作流水线

### 为什么需要 GitForWriter？

传统的文学创作通常是线性的、混乱的过程：
- ❌ 难以追踪修改历史
- ❌ 缺乏系统化的审校流程
- ❌ 版本管理混乱（final.docx, final_v2.docx, final_final.docx...）
- ❌ 协作困难

**GitForWriter 的解决方案：**

将软件工程的最佳实践应用到文学创作：

1. **版本控制**（来自 Git）
   - 每次修改都有记录
   - 可以回退到任何历史版本
   - 支持分支（不同的情节走向）

2. **持续集成**（来自 CI/CD）
   - 自动化的质量检查
   - 实时的写作反馈
   - 标准化的发布流程

3. **代码审查**（来自 Code Review）
   - AI 扮演"审稿人"角色
   - 系统化的改进建议
   - 可追踪的修改采纳

### AI 辅助写作流水线

```
┌─────────────┐
│   构思阶段   │  💡 灵感与大纲
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   撰写阶段   │  ✍️  创作内容
└──────┬──────┘
       │
       ▼  (自动触发)
┌─────────────┐
│  Diff 分析  │  🔍 语义差异检测
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   审校阶段   │  🤖 AI 智能审校
└──────┬──────┘
       │
       ▼  (采纳建议)
┌─────────────┐
│   修改优化   │  🔧 应用改进建议
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   发布阶段   │  🚀 多格式导出
└─────────────┘
```

### 核心组件

#### 1. GitManager（版本管理）
负责与 Git 仓库交互：
- 初始化仓库
- 获取文件差异
- 管理提交历史

#### 2. DiffAnalyzer（差异分析）
将技术性的 Git diff 转换为人类可读的语义描述：
- 识别添加、删除、修改
- 分类变更（标题、段落、列表等）
- 生成自然语言摘要

#### 3. ReviewEngine（审校引擎）
基于差异分析生成智能审校报告：
- 评估修改质量
- 识别优点和问题
- 提供改进建议

#### 4. ExportManager（导出管理）
将创作成果导出为各种格式：
- 保留源格式（Markdown）
- 转换为学术格式（LaTeX，支持多种模板）
- 生成出版格式（PDF，完整编译流程）
- 自动检测和使用可用的 LaTeX 编译器
- 智能错误处理和用户友好的提示

#### 5. StatusBarManager（状态管理）
在 VSCode 状态栏实时显示：
- 当前写作阶段
- 进度信息
- 快速状态概览

### AI 的角色

在 GitForWriter 中，AI 不是"代写"，而是"助手"：

1. **分析师**：理解你的修改，提供语义层面的洞察
2. **审稿人**：从多个维度评估文本质量
3. **顾问**：提供具体、可操作的改进建议
4. **助手**：自动化繁琐的格式转换工作

## 🔧 配置选项

### AI Provider 配置

GitForWriter 支持多种 AI 提供商，通过 Vercel AI SDK 提供统一接口访问 100+ LLM 模型。

#### 推荐：使用 Unified Provider（默认）

Unified Provider 通过 Vercel AI SDK 提供对多个 LLM 提供商的统一访问：

```json
{
  "gitforwriter.aiProvider": "unified",
  "gitforwriter.unified.provider": "openai",  // 或 "anthropic"
  "gitforwriter.unified.model": "gpt-4",      // 或 "claude-3-opus-20240229"
  "gitforwriter.unified.baseURL": ""          // 可选：OpenAI 兼容 API 的自定义 URL
}
```

**支持的模型示例：**
- **OpenAI**: `gpt-4`, `gpt-4-turbo`, `gpt-3.5-turbo`
- **Anthropic**: `claude-3-opus-20240229`, `claude-3-sonnet-20240229`, `claude-3-haiku-20240307`
- **OpenAI 兼容 API**: DeepSeek, Qwen, 等（通过 `baseURL` 配置）

**配置 API Key：**
1. 打开命令面板 (`Ctrl+Shift+P` 或 `Cmd+Shift+P`)
2. 根据选择的 provider 运行相应命令：
   - OpenAI: "GitForWriter: Set OpenAI API Key"
   - Anthropic: "GitForWriter: Set Claude API Key"

#### 传统 Provider（向后兼容）

仍然支持直接使用 OpenAI 或 Claude provider：

**OpenAI Provider:**
```json
{
  "gitforwriter.aiProvider": "openai",
  "gitforwriter.openai.model": "gpt-4",
  "gitforwriter.openai.baseURL": ""  // 可选：用于 DeepSeek 等兼容 API
}
```

**Claude Provider:**
```json
{
  "gitforwriter.aiProvider": "claude",
  "gitforwriter.claude.model": "claude-3-sonnet"
}
```

### 其他配置选项

```json
{
  "gitforwriter.autoSave": true,          // 自动保存时检测 diff
  "gitforwriter.exportFormat": "markdown" // 默认导出格式
}
```

### LaTeX/PDF 导出配置

```json
{
  "gitforwriter.latex.template": "default",        // 模板: default/academic/book/article
  "gitforwriter.latex.compiler": "pdflatex",       // 编译器: pdflatex/xelatex/lualatex
  "gitforwriter.latex.multiPass": true,            // 多次编译以解析引用
  "gitforwriter.latex.cleanAuxFiles": true,        // 编译后清理辅助文件
  "gitforwriter.latex.openAfterCompile": true      // 编译完成后自动打开 PDF
}
```

详细配置说明请参考 [PDF_EXPORT_GUIDE.md](PDF_EXPORT_GUIDE.md)

## 🛠️ 技术栈

- **TypeScript**：类型安全的开发体验
- **VSCode Extension API**：深度集成 VSCode
- **simple-git**：Git 操作封装
- **Webview API**：美观的审校结果展示

## 🎨 命令列表

| 命令 | 功能 | 快捷键 |
|------|------|--------|
| `GitForWriter: Start Writing Project` | 初始化写作项目 | - |
| `GitForWriter: AI Review` | 执行 AI 审校 | - |
| `GitForWriter: Export Draft` | 导出作品 | - |

## 📚 使用场景

### 小说创作
- 追踪情节发展
- 管理角色设定的演变
- 对比不同版本的章节

### 学术写作
- 论文多次修改的版本管理
- LaTeX 文档的智能审校
- 导出符合期刊要求的格式

### 技术文档
- Markdown 文档的持续改进
- 自动检测文档一致性
- 生成多种格式的发布版本

### 博客写作
- 文章草稿的迭代优化
- 自动化的质量检查
- 快速导出发布格式

## 🤝 贡献

欢迎贡献代码、报告问题或提出建议！

```bash
# 克隆仓库
git clone https://github.com/ydzat/GitForWriter.git

# 安装依赖
npm install

# 编译
npm run compile

# 运行 linter
npm run lint

# 调试
按 F5 启动扩展开发主机
```

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🔮 未来规划

- [ ] 支持更多语言（目前主要针对中文和英文）
- [x] ~~集成更强大的 AI 模型（GPT-4, Claude 等）~~ ✅ 已完成（v1.0.0）
- [x] ~~统一 LLM 接口支持 100+ 模型~~ ✅ 已完成（v1.0.0 - Vercel AI SDK）
- [ ] 协作功能（多人写作、评论、讨论）
- [ ] 写作统计和分析（字数、进度、习惯分析）
- [ ] 自定义审校规则
- [ ] 插件市场和模板库

## 💬 反馈

- 提交 Issue：[GitHub Issues](https://github.com/ydzat/GitForWriter/issues)
- 功能建议：欢迎在 Issues 中讨论

---

**GitForWriter** - 让写作像编程一样严谨，像艺术一样自由。

Made with ❤️ for writers who code and coders who write.
