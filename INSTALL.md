# Installation Guide

## Prerequisites

- Visual Studio Code 1.80.0 or higher
- Git installed on your system
- Node.js (for development only)

## Installation Options

### Option 1: Install from VSIX (Recommended)

1. Download the latest `.vsix` file from the releases page
2. Open VSCode
3. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
4. Type "Extensions: Install from VSIX..."
5. Select the downloaded `.vsix` file
6. Restart VSCode

### Option 2: Build from Source

```bash
# Clone the repository
git clone https://github.com/ydzat/GitForWriter.git
cd GitForWriter

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Package the extension (optional)
npm install -g vsce
vsce package
```

After building, you can install the generated `.vsix` file using Option 1.

## First Time Setup

1. **Open or Create a Writing Project**
   - Open an existing folder in VSCode, or
   - Create a new folder for your writing project

2. **Initialize GitForWriter**
   - Press `Ctrl+Shift+P` / `Cmd+Shift+P`
   - Type: `GitForWriter: Start Writing Project`
   - Press Enter

3. **Create Your First Document**
   - Create a new `.md` (Markdown) or `.tex` (LaTeX) file
   - Start writing!

## Verification

After installation, verify that GitForWriter is working:

1. Open the Command Palette
2. Type "GitForWriter" - you should see three commands:
   - GitForWriter: Start Writing Project
   - GitForWriter: AI Review
   - GitForWriter: Export Draft

3. Check the status bar (bottom left) - you should see the writing stage indicator

## Troubleshooting

### Extension Not Showing in Command Palette

- Restart VSCode
- Check that the extension is enabled in the Extensions panel
- Look for error messages in the Output panel (View → Output → GitForWriter)

### Git Not Found

- Install Git from https://git-scm.com/
- Restart VSCode after installation

### Commands Not Working

- Make sure you have a workspace folder open
- Check that you're working with a `.md` or `.tex` file
- Look at the VSCode Developer Console (Help → Toggle Developer Tools)

## Configuration

After installation, you can configure GitForWriter in VSCode settings:

1. Go to Settings (`Ctrl+,` / `Cmd+,`)
2. Search for "GitForWriter"
3. Adjust settings:
   - `gitforwriter.autoSave`: Enable/disable auto-save detection
   - `gitforwriter.exportFormat`: Default export format

## Updating

To update to a new version:

1. Download the new `.vsix` file
2. Install it (it will replace the old version)
3. Restart VSCode

## Uninstallation

1. Open the Extensions panel
2. Find GitForWriter
3. Click the gear icon → Uninstall
4. Restart VSCode

## Getting Help

- Read the [README.md](README.md) for usage guide
- Check [EXAMPLE.md](EXAMPLE.md) for practical examples
- Report issues on GitHub: https://github.com/ydzat/GitForWriter/issues

Enjoy writing with GitForWriter! 🚀
