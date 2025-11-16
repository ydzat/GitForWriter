# GitForWriter

<div align="center">

[![CI](https://github.com/ydzat/GitForWriter/actions/workflows/ci.yml/badge.svg)](https://github.com/ydzat/GitForWriter/actions/workflows/ci.yml)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Version](https://img.shields.io/visual-studio-marketplace/v/ydzat.gitforwriter)](https://marketplace.visualstudio.com/items?itemName=ydzat.gitforwriter)

**Make writing as rigorous as programming, as free as art**

English | [简体中文](./README.md)

</div>

---

## 📖 Introduction

GitForWriter is a VSCode extension that perfectly combines **AI-powered review** with **Git version control**, providing professional workflow support for Markdown and LaTeX writing.

### Core Philosophy

Apply software engineering best practices to literary creation:
- 🔄 **Version Control** - Every modification is recorded, can revert to any historical version
- 🤖 **AI Review** - Intelligently analyze text quality and provide professional improvement suggestions
- 📊 **Visual Feedback** - Clearly display modification history and review results
- 🚀 **One-Click Export** - Support Markdown, LaTeX, PDF formats

### Why Choose GitForWriter?

Traditional writing pain points:
- ❌ Chaotic version management (final.docx, final_v2.docx, final_final.docx...)
- ❌ Difficult to track modification history
- ❌ Lack of systematic review process
- ❌ Difficult collaboration

GitForWriter's solutions:
- ✅ Git version control, every modification is recorded
- ✅ AI intelligent review, automatically discover issues and provide suggestions
- ✅ Visual interface, clearly display review results
- ✅ Multi-format export, meet different publishing needs

---

## ✨ Key Features

### 🤖 AI-Powered Review

Support multiple AI providers:
- **OpenAI** (GPT-4, GPT-3.5-turbo)
- **Anthropic** (Claude 3 series)
- **OpenAI-Compatible APIs** (DeepSeek, Qwen, etc.)
- **Local LLM** (Ollama, LM Studio)

Review features:
- 📊 **Comprehensive Scoring** - 0-10 rating for text quality with transparent scoring criteria
- ✨ **Strength Recognition** - Discover highlights in the text
- 📋 **Improvement Suggestions** - Point out areas that need optimization
- 💡 **Specific Modification Suggestions** - Provide actionable improvement plans (Note: Auto-apply feature is temporarily disabled, please manually copy suggestions)

### 🌍 Internationalization Support

- Automatically detect VSCode language settings
- Support Chinese and English interfaces
- AI review results automatically match document language

### 📝 Git Version Management

- Automatically detect file changes
- Generate diff records
- Save modification history to `.gitforwriter` directory
- Traceable creative process

### 📤 Multi-Format Export

- **Markdown** - Maintain original format
- **LaTeX** - Support multiple templates (default/academic/book/article)
- **PDF** - Complete LaTeX compilation process
  - Auto-detect compiler (pdflatex/xelatex/lualatex)
  - Multi-pass compilation support (resolve references and TOC)
  - Auto-clean auxiliary files
  - Auto-open PDF after compilation

### ⚡ Performance Optimization

- **AI Response Caching** - Reduce duplicate API calls, lower costs
- **Document Save Debouncing** - Avoid duplicate analysis on frequent saves
- **Performance Monitoring** - Real-time tracking of operation performance


---

## 📸 Screenshots

### Chinese Interface
![Chinese Interface Example](./eg-cn.png)

### English Interface
![English Interface Example](./eg-en.png)

---

## 🚀 Quick Start

### Installation

1. Search for "GitForWriter" in VSCode Extension Marketplace
2. Click Install
3. Reload VSCode

Or install from VSIX file:
```bash
code --install-extension gitforwriter-1.0.0.vsix
```

### Configure AI Provider

1. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Run `GitForWriter: Configure AI Provider`
3. Select your AI provider and configure API Key

Supported providers:
- **OpenAI** - Requires OpenAI API Key
- **Anthropic** - Requires Claude API Key  
- **OpenAI-Compatible** - Supports DeepSeek, Qwen, etc. (requires baseURL and API Key configuration)
- **Local LLM** - Supports Ollama, LM Studio, etc.

### Basic Usage

1. **Initialize Project**
   ```
   Command Palette → GitForWriter: Start Writing Project
   ```

2. **Write Documents**
   - Create or edit Markdown/LaTeX files
   - Changes are automatically detected on each save

3. **AI Review**
   ```
   Command Palette → GitForWriter: AI Review
   ```

4. **Export Documents**
   ```
   Command Palette → GitForWriter: Export Draft
   ```

---

## ⚙️ Configuration Options

### AI Provider Configuration

```json
{
  "gitforwriter.aiProvider": "openai",
  "gitforwriter.openai.model": "gpt-4",
  "gitforwriter.openai.baseURL": ""  // Optional: for DeepSeek and other compatible APIs
}
```

### LaTeX/PDF Export Configuration

```json
{
  "gitforwriter.latex.template": "default",
  "gitforwriter.latex.compiler": "pdflatex",
  "gitforwriter.latex.multiPass": true,
  "gitforwriter.latex.cleanAuxFiles": true,
  "gitforwriter.latex.openAfterCompile": true
}
```

### Performance Optimization Configuration

```json
{
  "gitforwriter.performance.debounceDelay": 2000,
  "gitforwriter.performance.enableCache": true,
  "gitforwriter.performance.cacheTTL": 3600000,
  "gitforwriter.performance.cacheMaxSize": 104857600
}
```

For detailed configuration instructions, please refer to [INSTALL.md](./INSTALL.md)

---

## 📚 Use Cases

- **Novel Writing** - Track plot development, manage character evolution
- **Academic Writing** - Version management for multiple paper revisions, export formats that meet journal requirements
- **Technical Documentation** - Continuous improvement of Markdown documents, automatic consistency checking
- **Blog Writing** - Iterative optimization of article drafts, quick export to publishing formats

---

## 🛠️ Tech Stack

- **TypeScript** - Type-safe development experience
- **VSCode Extension API** - Deep integration with VSCode
- **Vercel AI SDK** - Unified access to 100+ LLM models
- **OpenAI SDK** - OpenAI and compatible API support
- **Anthropic SDK** - Claude model support
- **simple-git** - Git operation wrapper

---

## 🤝 Contributing

Contributions, bug reports, and feature requests are welcome!

For details, please refer to [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 📄 License

This project is licensed under the [AGPL-3.0 License](./LICENSE)

---

## 🔗 Related Links

- [GitHub Repository](https://github.com/ydzat/GitForWriter)
- [Issue Tracker](https://github.com/ydzat/GitForWriter/issues)
- [Changelog](./CHANGELOG.md)
- [Installation Guide](./INSTALL.md)
- [Usage Examples](./EXAMPLE.md)
- [Privacy Policy](./PRIVACY.md)
- [Security Policy](./SECURITY.md)

---

## 💬 Feedback & Support

- Submit Issues: [GitHub Issues](https://github.com/ydzat/GitForWriter/issues)
- Feature Requests: Welcome to discuss in Issues

---

**GitForWriter** - Make writing as rigorous as programming, as free as art.

Made with ❤️ for writers who code and coders who write.
