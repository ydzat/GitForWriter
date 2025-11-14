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

