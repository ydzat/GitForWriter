# VSCode Settings

## Configuration Example

The `settings.example.json` file provides an example configuration for using OpenAI-compatible APIs like DeepSeek.

### Usage

1. Copy the example file:
   ```bash
   cp .vscode/settings.example.json .vscode/settings.json
   ```

2. Edit `.vscode/settings.json` with your preferred settings:
   - Change `aiProvider` if needed (openai, claude, local)
   - Update `openai.model` to your preferred model
   - Set `openai.baseURL` for OpenAI-compatible APIs

3. The `.vscode/settings.json` file is gitignored to prevent committing personal settings.

### Example Configurations

#### Using OpenAI
```json
{
  "gitforwriter.aiProvider": "openai",
  "gitforwriter.openai.model": "gpt-4"
}
```

#### Using DeepSeek
```json
{
  "gitforwriter.aiProvider": "openai",
  "gitforwriter.openai.model": "deepseek-chat",
  "gitforwriter.openai.baseURL": "https://api.deepseek.com"
}
```

#### Using Claude
```json
{
  "gitforwriter.aiProvider": "claude",
  "gitforwriter.claude.model": "claude-3-sonnet"
}
```

### Note

These settings are workspace-specific and override global VSCode settings for this project only.

