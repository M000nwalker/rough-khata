import React, { useMemo } from 'react';
import { renderLatexToHtml } from '../utils/mathHelper';

interface MathMarkdownRendererProps {
  content: string;
}

/**
 * High-performance, streaming-safe Markdown and KaTeX math renderer.
 * Formats equations ($inline$ and $$display$$) and structural markdown.
 */
export const MathMarkdownRenderer: React.FC<MathMarkdownRendererProps> = ({ content }) => {
  const renderedElements = useMemo(() => {
    if (!content) return null;

    // Split content by paragraphs or block math $$...$$
    const blocks: React.ReactNode[] = [];
    const lines = content.split('\n');
    let inCodeBlock = false;
    let codeLanguage = '';
    let codeBuffer: string[] = [];
    let paragraphBuffer: string[] = [];

    const flushParagraph = () => {
      if (paragraphBuffer.length === 0) return;
      const text = paragraphBuffer.join('\n').trim();
      paragraphBuffer = [];
      if (!text) return;

      blocks.push(
        <div key={`p-${blocks.length}`} className="peer-markdown-paragraph">
          {renderInlineMathAndMarkdown(text)}
        </div>
      );
    };

    const flushCodeBlock = () => {
      const codeText = codeBuffer.join('\n');
      blocks.push(
        <div key={`code-${blocks.length}`} className="peer-markdown-codeblock">
          {codeLanguage && <div className="codeblock-lang-tag">{codeLanguage}</div>}
          <pre>
            <code>{codeText}</code>
          </pre>
        </div>
      );
      codeBuffer = [];
      inCodeBlock = false;
      codeLanguage = '';
    };

    let idx = 0;
    while (idx < lines.length) {
      const line = lines[idx];

      // Code fence
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          flushCodeBlock();
        } else {
          flushParagraph();
          inCodeBlock = true;
          codeLanguage = line.slice(3).trim();
        }
        idx++;
        continue;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        idx++;
        continue;
      }

      // Display math $$ ... $$ on a single line or multi-line
      if (line.trim().startsWith('$$')) {
        flushParagraph();
        let mathText = line.trim();
        if (mathText.endsWith('$$') && mathText.length > 2) {
          // Single line $$ ... $$
          const formula = mathText.slice(2, -2).trim();
          blocks.push(
            <div
              key={`math-${blocks.length}`}
              className="peer-display-math"
              dangerouslySetInnerHTML={{ __html: renderLatexToHtml(formula, true) }}
            />
          );
        } else {
          // Multiline $$
          const mathLines: string[] = [line.slice(line.indexOf('$$') + 2)];
          idx++;
          while (idx < lines.length && !lines[idx].includes('$$')) {
            mathLines.push(lines[idx]);
            idx++;
          }
          if (idx < lines.length) {
            const endLine = lines[idx];
            mathLines.push(endLine.slice(0, endLine.indexOf('$$')));
          }
          const formula = mathLines.join('\n').trim();
          blocks.push(
            <div
              key={`math-${blocks.length}`}
              className="peer-display-math"
              dangerouslySetInnerHTML={{ __html: renderLatexToHtml(formula, true) }}
            />
          );
        }
        idx++;
        continue;
      }

      // Headers (### Header)
      if (line.startsWith('### ')) {
        flushParagraph();
        blocks.push(
          <h4 key={`h-${blocks.length}`} className="peer-markdown-h4">
            {renderInlineMathAndMarkdown(line.slice(4))}
          </h4>
        );
        idx++;
        continue;
      }
      if (line.startsWith('## ')) {
        flushParagraph();
        blocks.push(
          <h3 key={`h-${blocks.length}`} className="peer-markdown-h3">
            {renderInlineMathAndMarkdown(line.slice(3))}
          </h3>
        );
        idx++;
        continue;
      }

      // Bullet lists
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        flushParagraph();
        const bulletText = line.trim().slice(2);
        blocks.push(
          <div key={`li-${blocks.length}`} className="peer-markdown-list-item">
            <span className="bullet-dot">•</span>
            <div className="bullet-content">{renderInlineMathAndMarkdown(bulletText)}</div>
          </div>
        );
        idx++;
        continue;
      }

      // Empty line -> flush paragraph
      if (!line.trim()) {
        flushParagraph();
        idx++;
        continue;
      }

      paragraphBuffer.push(line);
      idx++;
    }

    if (inCodeBlock) flushCodeBlock();
    flushParagraph();

    return blocks;
  }, [content]);

  return <div className="peer-response-markdown-flow">{renderedElements}</div>;
};

/**
 * Parses inline `$latex$` and basic markdown `**bold**`, `*italic*`, `code`
 */
function renderInlineMathAndMarkdown(text: string): React.ReactNode {
  // Regex to split by inline math `$ ... $` while ignoring escaped `\$`
  const parts = text.split(/(\$[^\$\n]+\$)/g);

  return parts.map((part, index) => {
    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      const latex = part.slice(1, -1);
      return (
        <span
          key={`math-inline-${index}`}
          className="peer-inline-math"
          dangerouslySetInnerHTML={{ __html: renderLatexToHtml(latex, false) }}
        />
      );
    }

    // Process markdown formatting for plain text segment
    return <span key={`txt-${index}`}>{formatInlineMarkdown(part)}</span>;
  });
}

function formatInlineMarkdown(text: string): React.ReactNode {
  // Split on bold **bold**
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g);
  return boldParts.map((bPart, bIdx) => {
    if (bPart.startsWith('**') && bPart.endsWith('**') && bPart.length > 4) {
      return <strong key={bIdx}>{bPart.slice(2, -2)}</strong>;
    }
    // Code ticks `code`
    const codeParts = bPart.split(/(`[^`]+`)/g);
    return codeParts.map((cPart, cIdx) => {
      if (cPart.startsWith('`') && cPart.endsWith('`') && cPart.length > 2) {
        return (
          <code key={`${bIdx}-${cIdx}`} className="peer-inline-code">
            {cPart.slice(1, -1)}
          </code>
        );
      }
      return cPart;
    });
  });
}
