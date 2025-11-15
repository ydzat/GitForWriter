# Privacy Policy

**Last Updated**: 2025-11-15  
**Effective Date**: 2025-11-15  
**Version**: 1.0.0

## Introduction

GitForWriter ("we", "our", or "the extension") is committed to protecting your privacy. This Privacy Policy explains how we handle data when you use the GitForWriter VSCode extension.

**Key Principle**: GitForWriter is a privacy-first extension. We do not collect, store, or transmit your personal data to our servers because we don't have any servers. All data processing happens locally on your computer.

## Data We Do NOT Collect

GitForWriter does **NOT** collect, store, or transmit:

- ❌ Personal information (name, email, address, etc.)
- ❌ Usage analytics or telemetry
- ❌ Crash reports
- ❌ User behavior tracking
- ❌ Device information
- ❌ IP addresses
- ❌ Cookies or tracking pixels
- ❌ Your writing content (except when you use AI features - see below)

## Data Stored Locally

The following data is stored **locally on your computer only**:

### 1. API Keys (Encrypted)

- **What**: API keys for OpenAI, Anthropic Claude, or other AI providers
- **Where**: VSCode SecretStorage (encrypted by VSCode)
- **Why**: Required to authenticate with AI providers when you use AI features
- **Access**: Only accessible by GitForWriter extension
- **Deletion**: Use command "GitForWriter: Clear API Keys" or uninstall the extension

### 2. Configuration Settings

- **What**: Your preferences (AI provider, export format, performance settings, etc.)
- **Where**: VSCode settings (`.vscode/settings.json` or global settings)
- **Why**: To remember your preferences
- **Access**: Stored in plain text in VSCode settings
- **Deletion**: Modify through VSCode settings or uninstall the extension

### 3. Writing Statistics (Optional)

- **What**: Word counts, writing sessions, productivity metrics
- **Where**: `.gitforwriter/stats/` directory in your workspace
- **Why**: To help you track your writing progress
- **Access**: Stored in JSON files, readable by you
- **Deletion**: Use command "GitForWriter: Disable Statistics" or delete the directory
- **Note**: Statistics collection is **opt-in** and disabled by default

### 4. Git Diff History

- **What**: Git diffs and AI analysis results
- **Where**: `.gitforwriter/diffs/` and `.gitforwriter/reviews/` directories
- **Why**: To track changes and provide AI review history
- **Access**: Stored in plain text files, readable by you
- **Deletion**: Delete the `.gitforwriter` directory

### 5. Export Files

- **What**: Exported documents (Markdown, LaTeX, PDF)
- **Where**: `exports/` directory in your workspace
- **Why**: To save your exported documents
- **Access**: Regular files, readable by you
- **Deletion**: Delete the files manually

## Data Sent to Third Parties

### AI Provider Services (When You Use AI Features)

When you explicitly use AI features (AI Review, Diff Analysis, Suggestions), your content is sent to third-party AI providers:

#### What is Sent

- **Your document content**: The text you're analyzing or reviewing
- **Git diffs**: Changes you've made to documents
- **Context**: File names, metadata needed for analysis

#### Which Providers

Depending on your configuration:
- **OpenAI** (if using OpenAI or unified provider with OpenAI)
- **Anthropic** (if using Claude or unified provider with Anthropic)
- **Local LLM** (if using local provider - data stays on your network)
- **Custom API** (if using OpenAI-compatible API with custom baseURL)

#### When is Data Sent

- Only when you explicitly trigger AI features:
  - "GitForWriter: AI Review" command
  - Automatic diff analysis on document save (if enabled)
  - Applying AI suggestions

#### Provider Privacy Policies

Your data sent to AI providers is subject to their privacy policies:

- **OpenAI**: https://openai.com/privacy
- **Anthropic**: https://www.anthropic.com/privacy
- **Custom Providers**: Check with your provider

#### Data Retention by Providers

- **OpenAI**: May retain data for 30 days for abuse monitoring (as of 2024)
- **Anthropic**: May retain data for trust & safety purposes (as of 2024)
- **Local LLM**: Data stays on your local network

**Important**: We have no control over how third-party AI providers handle your data. Please review their privacy policies.

### No Other Third Parties

GitForWriter does **NOT** send data to:
- ❌ Analytics services (Google Analytics, etc.)
- ❌ Crash reporting services
- ❌ Advertising networks
- ❌ Social media platforms
- ❌ Our own servers (we don't have any)

## Your Rights and Control

### Right to Access

All your data is stored locally on your computer. You can access it anytime:
- API keys: Stored in VSCode SecretStorage (encrypted)
- Settings: `.vscode/settings.json` or VSCode global settings
- Statistics: `.gitforwriter/stats/` directory
- Diffs and reviews: `.gitforwriter/diffs/` and `.gitforwriter/reviews/`

### Right to Deletion

You can delete your data anytime:
- **API Keys**: Command "GitForWriter: Clear API Keys"
- **Statistics**: Command "GitForWriter: Disable Statistics" or delete `.gitforwriter/stats/`
- **All Extension Data**: Delete `.gitforwriter` directory
- **Complete Removal**: Uninstall the extension

### Right to Opt-Out

- **Statistics**: Disabled by default. Enable with "GitForWriter: Enable Statistics"
- **AI Features**: Don't use AI commands if you don't want to send data to AI providers
- **Automatic Diff Analysis**: Disable with `"gitforwriter.autoSave": false`

## Data Security

### Local Data Protection

- **API Keys**: Encrypted using VSCode SecretStorage API
- **File Permissions**: Standard file system permissions apply
- **No Network Transmission**: Except for AI API calls

### AI API Communication

- **HTTPS Only**: All AI API calls use HTTPS encryption
- **API Key Security**: API keys are never logged or displayed in full
- **Input Validation**: All inputs are validated before sending to AI providers

## Children's Privacy

GitForWriter does not knowingly collect data from children under 13. The extension is designed for general writing purposes and does not target children.

## Changes to This Privacy Policy

We may update this Privacy Policy from time to time. Changes will be:
- Documented in this file with updated "Last Updated" date
- Announced in release notes
- Available in the extension's GitHub repository

## GDPR Compliance

For users in the European Union:

- **Data Controller**: You are the data controller of your own data
- **Data Processor**: AI providers (OpenAI, Anthropic, etc.) act as data processors when you use AI features
- **Legal Basis**: Your consent (by using AI features)
- **Data Minimization**: We only process data necessary for functionality
- **Right to Erasure**: You can delete all data anytime
- **Data Portability**: All data is in standard formats (JSON, text files)

## Contact

For privacy-related questions:

- **GitHub Issues**: https://github.com/ydzat/GitForWriter/issues
- **Email**: ydzat@live.com

## Transparency

GitForWriter is open source. You can review the source code to verify our privacy claims:

- **GitHub Repository**: https://github.com/ydzat/GitForWriter
- **License**: MIT License

---

**Summary**: GitForWriter respects your privacy. We don't collect your data. Your writing stays on your computer. AI features send data to AI providers only when you use them. You have full control over your data.

