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

- Malicious users could inject LaTeX commands that write to the filesystem, execute shell commands, or read sensitive files.
- **Example of a malicious LaTeX command**:
  ```latex
  \immediate\write18{rm -rf /}
  ```
  This command would attempt to delete all files on the system if shell-escape is enabled.
- Commands like `\input{../../etc/passwd}` could include sensitive files.
- Shell commands could be executed if shell-escape is enabled.

**Mitigation Strategies**:

1. **Only process trusted Markdown content** - Never compile LaTeX from untrusted sources without sanitization.

2. **Disable shell-escape** in LaTeX compilation for untrusted content. Use the `-no-shell-escape` flag:
   ```bash
   pdflatex -no-shell-escape document.tex
   xelatex -no-shell-escape document.tex
   ```

   **Note:** This extension does *not* currently enforce `-no-shell-escape` by default for all compilations. Users should manually ensure this flag is set for secure compilation. Those who need shell-escape for specific use cases can enable it manually in their settings.

3. **Avoid or allowlist safe LaTeX packages**. Dangerous packages include:
   - `shellesc` - Enables shell command execution
   - `write18` - Allows writing to arbitrary files
   - `catchfile` - Can read arbitrary files
   - `filecontents` - Can write arbitrary files

4. **Consider adding a configuration option** to disable raw LaTeX passthrough when processing user-submitted content.

5. **Be especially cautious** in web applications or shared editing environments.

**Example: Sanitizing Raw LaTeX Blocks**

Before passing raw LaTeX to the compiler, you can filter out dangerous commands:

```typescript
function sanitizeLatex(latexStr: string): string {
    // Block dangerous commands
    const forbidden = [
        /\\write18/,
        /\\input/,        // Note: \input and \include are commonly needed for legitimate documents
        /\\include/,      // Consider using a whitelist approach or restricting to safe directories
        /\\openout/,
        /\\read/,
        /\\usepackage\{shellesc\}/
    ];

    for (const pattern of forbidden) {
        if (pattern.test(latexStr)) {
            throw new Error("Dangerous LaTeX command detected!");
        }
    }
    return latexStr;
}
```

> **Note**: The above example blocks `\input` and `\include` commands completely, but these are commonly needed for legitimate LaTeX documents (e.g., including bibliography files, splitting large documents into chapters). For production use, consider a more nuanced approach such as:
> - Restricting file paths to a safe directory
> - Using a whitelist of allowed files
> - Validating file paths to prevent directory traversal attacks

## Known Limitations

1. **Special Character Escaping**: All user content (headings, table cells, footnotes, etc.) is automatically escaped for LaTeX special characters. However, content within math equations and raw LaTeX blocks is preserved as-is.

2. **Nested Lists**: The list conversion does not currently support nested lists with indentation. Lists like:
   ```markdown
   - Item 1
     - Subitem 1.1
   ```
   will be treated as flat lists. For example, the above Markdown will be converted to LaTeX as:
   ```latex
   \begin{itemize}
     \item Item 1
     \item Subitem 1.1
   \end{itemize}
   ```
   Nested list support may be added in future versions.

3. **Nested Structures**: Complex nested structures (e.g., lists within blockquotes, tables within lists) may not be fully supported.

4. **Image Width**: Image width is currently hardcoded to `0.8\textwidth`. This may be made configurable in future versions.

5. **Multi-line Footnotes**: Footnotes support multi-line content when indented with 4 spaces or a tab. Footnote IDs can contain alphanumeric characters, hyphens, and underscores (e.g., `[^my-note]`, `[^note_1]`).

6. **Bold/Italic in Headings**: Formatting markers within headings are processed, but complex nested formatting may not work as expected.

7. **Citation Format**: Only supports basic `[@ref]` and `[@ref1; @ref2]` citation formats. Advanced citation features may require manual LaTeX editing.

8. **Performance**: For very large documents (e.g., books with hundreds of pages), the conversion process may take longer due to multiple regex passes. For typical literary documents, performance is acceptable.

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

> **Note**: The LaTeX `listings` package does not natively support Go or Rust. To use syntax highlighting for these languages, you must provide custom language definitions in your LaTeX preamble. Otherwise, compilation may fail or produce incorrect output for Go and Rust code blocks. See the [listings package documentation](https://ctan.org/pkg/listings) for details on defining custom languages.

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

