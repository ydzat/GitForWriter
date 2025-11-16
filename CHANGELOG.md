# Changelog

All notable changes to the GitForWriter extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-16

### 🎉 Initial Release

GitForWriter v1.0.0 is now available! This is the first stable release of GitForWriter, a VSCode extension that combines AI-powered writing assistance with Git version control for Markdown and LaTeX documents.

### ✨ Core Features

#### 🤖 AI-Powered Review
- **Multiple AI Provider Support**
  - OpenAI (GPT-4, GPT-3.5-turbo)
  - Anthropic (Claude 3 series)
  - OpenAI-compatible APIs (DeepSeek, Qwen, etc.)
  - Local LLM support (Ollama, LM Studio)
- **Intelligent Review Features**
  - Comprehensive scoring (0-10) with transparent criteria
  - Strength recognition
  - Improvement suggestions
  - Specific modification suggestions
- **Language Auto-Detection**
  - AI automatically detects document language
  - Review results match document language (Chinese/English)

#### 🌍 Internationalization (i18n)
- Auto-detect VSCode display language
- Full UI translation for Chinese and English
- Seamless language switching

#### 📝 Git Version Control
- Automatic file change detection
- Diff generation and storage
- Modification history tracking in `.gitforwriter` directory
- Traceable creative process

#### 📤 Multi-Format Export
- **Markdown** - Preserve original formatting
- **LaTeX** - Multiple templates (default/academic/book/article)
- **PDF** - Complete LaTeX compilation workflow
  - Auto-detect compiler (pdflatex/xelatex/lualatex)
  - Multi-pass compilation support
  - Auto-clean auxiliary files
  - Auto-open PDF after compilation

#### ⚡ Performance Optimization
- **AI Response Caching**
  - LRU cache strategy with automatic memory management
  - Configurable cache size and TTL
  - Significantly reduce API costs and response time
- **Document Save Debouncing**
  - Configurable delay (default 2 seconds)
  - Intelligent merging of consecutive save operations
- **Git Operation Caching**
  - Cache Git status and diff results
  - Reduce disk I/O operations
- **Performance Monitoring**
  - Real-time operation performance tracking
  - Detailed performance metrics logging

### 🎯 Core Commands

- `GitForWriter: Start Writing Project` - Initialize writing project
- `GitForWriter: AI Review` - Run AI review on current document
- `GitForWriter: Export Draft` - Export document to various formats
- `GitForWriter: Configure AI Provider` - Configure AI provider settings
- `GitForWriter: Show Config` - Display current configuration (for debugging)

### 📊 User Interface

- **Status Bar Integration**
  - Writing stage indicator (Ideation → Writing → Review → Publishing)
  - Quick access to core commands
- **AI Review Panel**
  - Visual display of review results
  - Comprehensive scoring with explanations
  - Strengths and improvement suggestions
  - Specific modification suggestions (manual copy required)
- **Welcome Panel**
  - Quick start guide
  - AI provider configuration
  - Feature overview

### 🔧 Configuration Options

Extensive configuration support for:
- AI provider selection and API keys
- LaTeX/PDF export settings
- Performance optimization parameters
- Cache management
- Debounce delays

### 📚 Documentation

- Complete Chinese and English README files
- Installation guide (INSTALL.md)
- Usage examples (EXAMPLE.md)
- Contributing guidelines (CONTRIBUTING.md)
- Privacy policy (PRIVACY.md)
- Security policy (SECURITY.md)

### 🐛 Known Issues

- **Auto-Apply Suggestion Feature** (Issue #48)
  - Temporarily disabled due to position accuracy issues
  - Users need to manually copy suggested text
  - Will be improved in future releases

### 📄 License

- Changed from MIT to **AGPL-3.0** license

### 🙏 Acknowledgments

- Built with TypeScript for type safety
- Powered by Vercel AI SDK for unified LLM access
- Integrated with VSCode Extension API
- Uses simple-git for Git operations

---

## [Unreleased]

### Planned
- Fix auto-apply suggestion feature (Issue #48)
- Multi-user collaboration features
- Custom review rules
- More export format support
- Enhanced LaTeX template system
