# PDF Export Guide

## Overview

GitForWriter now supports complete PDF export functionality with automatic LaTeX compilation. This guide explains how to use the PDF export feature and configure it for your needs.

## Prerequisites

To use PDF export, you need to install a LaTeX distribution on your system:

### Windows
- **MiKTeX**: https://miktex.org/
- Download and install the complete distribution

### macOS
- **MacTeX**: https://www.tug.org/mactex/
- Install via Homebrew: `brew install --cask mactex`

### Linux
- **TeX Live**: 
  ```bash
  # Ubuntu/Debian
  sudo apt-get install texlive-full
  
  # Fedora
  sudo dnf install texlive-scheme-full
  
  # Arch Linux
  sudo pacman -S texlive-most
  ```

## Quick Start

1. Open a Markdown or LaTeX document in VSCode
2. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
3. Run "GitForWriter: Export Draft"
4. Select "pdf" format
5. Wait for compilation to complete
6. PDF will open automatically (if configured)

## Configuration

### LaTeX Compiler

Choose which LaTeX compiler to use:

```json
{
  "gitforwriter.latex.compiler": "pdflatex"  // or "xelatex", "lualatex"
}
```

**Compiler Options:**
- `pdflatex`: Default, best compatibility
- `xelatex`: Better Unicode and font support
- `lualatex`: Modern, supports Lua scripting

### Templates

Select a document template:

```json
{
  "gitforwriter.latex.template": "default"  // or "academic", "book", "article"
}
```

**Available Templates:**
- `default`: Simple article format
- `academic`: Academic paper with abstract, citations
- `book`: Book format with chapters, front/back matter
- `article`: Clean article format with hyperlinks

### Compilation Options

```json
{
  "gitforwriter.latex.multiPass": true,        // Run compiler multiple times for references
  "gitforwriter.latex.cleanAuxFiles": true,    // Clean .aux, .log files after compilation
  "gitforwriter.latex.openAfterCompile": true, // Open PDF automatically
  "gitforwriter.latex.author": "Your Name"     // Author name for documents (optional)
}
```

## Features

### Automatic Compiler Detection

GitForWriter automatically detects available LaTeX compilers on your system. If no compiler is found, you'll see a helpful message with installation instructions.

### Multi-Pass Compilation

For documents with cross-references, citations, or table of contents, the compiler runs multiple times to resolve all references correctly.

### Progress Indication

During compilation, you'll see a progress notification showing:
- Current compilation pass
- Auxiliary file cleaning status
- Completion status

You can cancel compilation at any time by clicking the cancel button.

### Error Handling

If compilation fails, GitForWriter:
- Parses LaTeX error messages
- Shows user-friendly error descriptions
- Provides suggestions for fixing common errors
- Keeps the .tex file for manual debugging

### Auxiliary File Cleanup

After successful compilation, GitForWriter automatically removes temporary files:
- `.aux` - Auxiliary file
- `.log` - Compilation log
- `.out` - Hyperref output
- `.toc` - Table of contents
- `.lof` - List of figures
- `.lot` - List of tables
- `.fls` - File list
- `.fdb_latexmk` - Latexmk database
- `.synctex.gz` - SyncTeX file

## Templates

### Academic Template

Perfect for research papers and academic writing:
- Abstract environment
- Citation support (BibTeX)
- Theorem environments
- Professional formatting
- 1-inch margins
- 1.5 line spacing

### Book Template

Ideal for longer documents:
- Chapter structure
- Front matter (title, TOC)
- Main matter (chapters)
- Back matter (appendices)
- Custom chapter formatting
- A5 paper size

### Article Template

Clean and simple:
- Minimal packages
- Hyperlinked references
- Paragraph spacing
- A4 paper size

## Troubleshooting

### "LaTeX not found" Error

**Solution:** Install a LaTeX distribution (see Prerequisites above)

### Compilation Timeout

**Solution:** Increase timeout or simplify document
- Default timeout: 60 seconds
- Check for infinite loops in LaTeX code

### Missing Packages

**Solution:** Install required LaTeX packages
```bash
# MiKTeX (Windows)
mpm --install <package-name>

# TeX Live (Linux/macOS)
tlmgr install <package-name>
```

### Unicode Characters Not Displaying

**Solution:** Use XeLaTeX or LuaLaTeX compiler
```json
{
  "gitforwriter.latex.compiler": "xelatex"
}
```

## Advanced Usage

### Custom Templates

**Note:** Custom templates are intended for development or forking purposes only. If you wish to create or modify templates, please fork the extension and refer to the developer documentation for guidance. Template customization is not officially supported in the standard extension.

### Manual Compilation

If automatic compilation fails, you can compile manually:

1. Export to LaTeX format first
2. Open terminal in exports directory
3. Run: `pdflatex filename.tex`
4. For references: Run 2-3 times

## Examples

### Export with Academic Template

```json
{
  "gitforwriter.latex.template": "academic",
  "gitforwriter.latex.compiler": "pdflatex",
  "gitforwriter.latex.multiPass": true
}
```

### Export for Book

```json
{
  "gitforwriter.latex.template": "book",
  "gitforwriter.latex.compiler": "xelatex"
}
```

## See Also

- [LaTeX Project](https://www.latex-project.org/)
- [Overleaf Documentation](https://www.overleaf.com/learn)
- [CTAN Package Archive](https://ctan.org/)

