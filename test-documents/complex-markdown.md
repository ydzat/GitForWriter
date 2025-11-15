# Complex Markdown Test Document

This document tests all advanced Markdown features for LaTeX conversion.

## Tables

### Simple Table

| Name | Age | City |
|------|-----|------|
| Alice | 30 | New York |
| Bob | 25 | London |
| Charlie | 35 | Tokyo |

### Table with Alignment

| Left | Center | Right |
|:-----|:------:|------:|
| A | B | C |
| 1 | 2 | 3 |

## Code Blocks

### JavaScript Code

```javascript
function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}
```

### Python Code

```python
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)
```

## Images

![Sample Image](./images/sample.png)

![Image with Alt Text](https://example.com/image.jpg "This is a caption")

## Footnotes

This is a sentence with a footnote[^1].

Here's another footnote reference[^note].

[^1]: This is the first footnote.
[^note]: This is a named footnote with more details.

## Math Equations

### Inline Math

The quadratic formula is $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$.

Einstein's famous equation: $E = mc^2$.

### Display Math

$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$

## Citations

According to Smith et al. [@smith2020], this is an important finding.

Multiple citations can be grouped [@jones2019; @brown2021].

## Mixed Content

This paragraph contains **bold text**, *italic text*, `inline code`, and a [link](https://example.com).

### Nested Lists

- Item 1
  - Subitem 1.1
  - Subitem 1.2
- Item 2
  - Subitem 2.1
    - Sub-subitem 2.1.1

### Ordered Lists

1. First item
2. Second item
   1. Nested item 2.1
   2. Nested item 2.2
3. Third item

## Raw LaTeX Passthrough

\begin{theorem}
For any real number $x$, we have $e^{ix} = \cos(x) + i\sin(x)$.
\end{theorem}

## Blockquotes

> This is a blockquote.
> It can span multiple lines.
>
> And multiple paragraphs.

## Horizontal Rules

---

## Special Characters

Testing special characters: & % $ # _ { } ~ ^

These should be properly escaped in LaTeX output.

