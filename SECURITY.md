# Security Policy

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Security Features

GitForWriter implements several security measures to protect your data and API keys:

### API Key Protection

- **Secure Storage**: All API keys are stored using VSCode's SecretStorage API, which provides encrypted storage
- **Never Logged**: API keys are never written to log files or console output
- **Masked in UI**: API keys are displayed with only the last 4 characters visible (e.g., `sk-...xyz`)
- **Input Validation**: API key format is validated before storage
- **No Hardcoded Secrets**: No API keys or secrets are hardcoded in the source code

### Input Validation

- **File Path Sanitization**: All file paths are validated to prevent path traversal attacks
- **Git Command Validation**: Git commands are executed through the `simple-git` library with proper escaping
- **AI Response Validation**: All AI responses are validated and sanitized before use
- **HTML Escaping**: All user-generated content displayed in webviews is properly escaped to prevent XSS attacks

### Data Privacy

- **Local Storage Only**: All writing statistics and data are stored locally on your computer
- **No Telemetry**: GitForWriter does not collect or send any telemetry data
- **Explicit AI Provider Communication**: Data is only sent to AI providers (OpenAI, Anthropic, etc.) when you explicitly use AI features
- **User Control**: You have full control over what data is sent to AI providers

### Dependency Security

- **Regular Updates**: Dependencies are regularly updated to patch security vulnerabilities
- **Automated Scanning**: We use `npm audit` to detect and fix security issues
- **Minimal Dependencies**: We keep dependencies to a minimum to reduce attack surface

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly:

### How to Report

1. **DO NOT** open a public GitHub issue for security vulnerabilities
2. Email the maintainer at: ydzat@live.com
3. Include the following information:
   - Description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment**: We will acknowledge receipt of your report within 48 hours
- **Investigation**: We will investigate the issue and determine its severity
- **Fix Timeline**: 
  - Critical vulnerabilities: Patch within 7 days
  - High severity: Patch within 14 days
  - Medium/Low severity: Patch in next release
- **Credit**: We will credit you in the release notes (unless you prefer to remain anonymous)
- **Disclosure**: We will coordinate disclosure timing with you

## Security Best Practices for Users

### API Key Management

1. **Never Share API Keys**: Do not share your API keys with others
2. **Use Separate Keys**: Use different API keys for different projects/environments
3. **Rotate Keys Regularly**: Periodically rotate your API keys
4. **Monitor Usage**: Regularly check your AI provider's usage dashboard for unexpected activity
5. **Revoke Compromised Keys**: If you suspect a key has been compromised, revoke it immediately

### Safe Usage

1. **Review AI Suggestions**: Always review AI-generated suggestions before applying them
2. **Backup Your Work**: Regularly commit your work to Git
3. **Verify Sources**: Only install GitForWriter from official sources (VSCode Marketplace or GitHub releases)
4. **Keep Updated**: Keep the extension updated to receive security patches
5. **Review Permissions**: Understand what permissions the extension requires

### Data Protection

1. **Sensitive Content**: Be cautious when using AI features with sensitive or confidential content
2. **Local Storage**: Understand that writing statistics are stored locally in `.gitforwriter` directory
3. **Git History**: Remember that all changes are tracked in Git history
4. **Export Security**: Be careful when exporting documents to ensure they don't contain sensitive information

## Known Limitations

### AI Provider Security

- **Third-Party Services**: When using AI features, your content is sent to third-party AI providers (OpenAI, Anthropic, etc.)
- **Provider Policies**: You are subject to the privacy policies and terms of service of your chosen AI provider
- **Data Retention**: AI providers may retain your data according to their policies
- **Network Security**: Data is transmitted over HTTPS, but network security depends on your environment

### Local LLM Security

- **Self-Hosted Risk**: When using local LLM endpoints, you are responsible for securing the endpoint
- **Network Exposure**: Ensure local LLM endpoints are not exposed to untrusted networks
- **Model Security**: Verify the integrity and source of local LLM models

## Security Audit History

- **2025-11-15**: Initial security audit completed for v1.0.0
  - Fixed js-yaml vulnerability (CVE-2023-XXXX)
  - Implemented API key masking
  - Added input validation for file paths and LaTeX compilation
  - Created SECURITY.md and PRIVACY.md

## Compliance

### GDPR Compliance

GitForWriter is designed with privacy in mind:

- **Data Minimization**: We only collect data necessary for functionality
- **User Control**: Users have full control over their data
- **Right to Deletion**: Users can delete all data by removing the `.gitforwriter` directory
- **No Profiling**: We do not profile users or their writing habits
- **Transparency**: This document and PRIVACY.md explain all data handling

### Additional Compliance

- **No PII Collection**: GitForWriter does not collect personally identifiable information
- **Local Processing**: All processing happens locally except for AI API calls
- **Open Source**: Source code is publicly available for audit

## Contact

For security-related questions or concerns:

- **Email**: ydzat@live.com
- **GitHub Issues**: For non-security bugs and feature requests only
- **GitHub Security Advisories**: For coordinated vulnerability disclosure

## Acknowledgments

We thank the security researchers and community members who help keep GitForWriter secure.

---

**Last Updated**: 2025-11-15
**Version**: 1.0.0

