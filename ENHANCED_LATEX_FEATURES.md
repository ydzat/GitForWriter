# Enhanced LaTeX Conversion Features

This document describes the enhanced Markdown to LaTeX conversion features added in Issue #15.

## Overview

The enhanced LaTeX conversion now supports advanced Markdown features including:
- Tables
- Code blocks with syntax highlighting
- Images with captions
- Footnotes
- Math equations (inline and display)
- Citations
- Raw LaTeX passthrough
- Blockquotes
- Horizontal rules
- Ordered and unordered lists

## ⚠️ Security Warning

**Raw LaTeX Passthrough**: This feature allows arbitrary LaTeX commands to be preserved and executed during compilation. If you process untrusted Markdown content, this poses a security risk:

- Malicious users could inject LaTeX commands that write to the filesystem
- Commands like `\input` could include sensitive files
- Shell commands could be executed if shell-escape is enabled

**Recommendations**:
- Only process trusted Markdown content
- Disable shell-escape in LaTeX compilation for untrusted content
- Consider adding a configuration option to disable raw LaTeX passthrough when processing user-submitted content
- Be especially cautious in web applications or shared editing environments

## Known Limitations

1. **Special Character Escaping**: All user content (headings, table cells, footnotes, etc.) is automatically escaped for LaTeX special characters. However, content within math equations and raw LaTeX blocks is preserved as-is.

2. **Nested Lists**: The list conversion does not currently support nested lists with indentation. Lists like:
   ```markdown
   - Item 1
     - Subitem 1.1
   ```
   will be treated as flat lists. Nested list support may be added in future versions.

3. **Nested Structures**: Complex nested structures (e.g., lists within blockquotes, tables within lists) may not be fully supported.

4. **Image Width**: Image width is currently hardcoded to `0.8\textwidth`. This may be made configurable in future versions.

5. **Multi-line Footnotes**: Footnotes support multi-line content when indented with 4 spaces or a tab, but complex formatting within footnotes may not work as expected.

6. **Bold/Italic in Headings**: Formatting markers within headings are processed, but complex nested formatting may not work as expected.

7. **Citation Format**: Only supports basic `[@ref]` and `[@ref1; @ref2]` citation formats. Advanced citation features may require manual LaTeX editing.

## Future Improvements

1. **Modular Architecture**: The current `convertMarkdownToLatex()` method contains a 15-step conversion pipeline. Future versions may refactor this into separate, testable converter classes following the Single Responsibility Principle.

2. **Configurable Conversions**: Allow users to enable/disable specific conversion features through configuration.

3. **Nested List Support**: Add proper handling of indented nested lists with multiple levels.

4. **Configurable Image Width**: Make image width configurable per-image or globally.

## Feature Details

### 1. Tables

Markdown tables are converted to LaTeX `tabular` environments with proper alignment.

**Markdown:**
```markdown
| Name | Age | City |
|------|-----|------|
| Alice | 30 | New York |
| Bob | 25 | London |
```

**LaTeX Output:**
```latex
\begin{table}[h]
\centering
\begin{tabular}{|l|l|l|}
\hline
Name & Age & City \\
\hline
Alice & 30 & New York \\
Bob & 25 & London \\
\hline
\end{tabular}
\end{table}
```

**Alignment Support:**
- `:---` = left-aligned
- `:---:` = center-aligned
- `---:` = right-aligned

### 2. Code Blocks with Syntax Highlighting

Code blocks are converted using the `listings` package with language-specific syntax highlighting.

**Markdown:**
````markdown
```javascript
function hello() {
    console.log("Hello, World!");
}
```
````

**LaTeX Output:**
```latex
\begin{lstlisting}[language=JavaScript]
function hello() {
    console.log("Hello, World!");
}
\end{lstlisting}
```

**Supported Languages:**
- JavaScript/TypeScript
- Python
- Java, C, C++, C#
- Ruby, Go, Rust, PHP
- SQL, Bash
- HTML, XML, JSON, YAML

### 3. Images

Images are converted to `figure` environments with optional captions.

**Markdown:**
```markdown
![Alt Text](./path/to/image.png "Caption Text")
```

**LaTeX Output:**
```latex
\begin{figure}[h]
\centering
\includegraphics[width=0.8\textwidth]{./path/to/image.png}
\caption{Caption Text}
\label{fig:alt-text}
\end{figure}
```

### 4. Footnotes

Markdown footnotes are converted to LaTeX `\footnote` commands.

**Markdown:**
```markdown
This is a sentence with a footnote[^1].

[^1]: This is the footnote text.
```

**LaTeX Output:**
```latex
This is a sentence with a footnote\footnote{This is the footnote text.}.
```

### 5. Math Equations

Both inline and display math equations are supported.

**Inline Math:**
```markdown
The equation is $E = mc^2$.
```

**Display Math:**
```markdown
$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$
```

**LaTeX Output:**
```latex
The equation is $E = mc^2$.

\[
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
\]
```

### 6. Citations

Markdown citations are converted to LaTeX `\cite` commands.

**Markdown:**
```markdown
According to Smith [@smith2020], this is important.
Multiple sources [@jones2019; @brown2021] agree.
```

**LaTeX Output:**
```latex
According to Smith \cite{smith2020}, this is important.
Multiple sources \cite{jones2019,brown2021} agree.
```

**Note:** You'll need to provide a `.bib` file and configure bibliography in your template.

### 7. Raw LaTeX Passthrough

Raw LaTeX environments are preserved as-is.

**Markdown:**
```markdown
\begin{theorem}
For any real number $x$, we have $e^{ix} = \cos(x) + i\sin(x)$.
\end{theorem}
```

This will be preserved exactly in the LaTeX output.

### 8. Blockquotes

Blockquotes are converted to `quote` environments.

**Markdown:**
```markdown
> This is a quote.
> It spans multiple lines.
```

### 9. Horizontal Rules

Horizontal rules are converted to `\hrule` commands.

**Markdown:**
```markdown
---
```

**LaTeX Output:**
```latex
\hrule
```

## Required LaTeX Packages

The enhanced templates now include these packages:
- `listings` - Code syntax highlighting
- `xcolor` - Color support for code
- `amsmath` - Math equations
- `array` - Enhanced tables
- `longtable` - Multi-page tables
- `graphicx` - Image support

## Testing

Run the test suite to verify all features:
```bash
npm test
```

The test suite includes comprehensive tests for all enhanced features.

## Examples

See `test-documents/complex-markdown.md` for a comprehensive example using all features.

