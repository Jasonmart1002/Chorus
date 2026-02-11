import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import type { CSSProperties } from "react";
import { useThemeStore } from "../../store/themeStore";
import type { ThemeColors } from "../../lib/theme";

// Register common languages
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import rust from "react-syntax-highlighter/dist/esm/languages/prism/rust";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
import markdown from "react-syntax-highlighter/dist/esm/languages/prism/markdown";
import toml from "react-syntax-highlighter/dist/esm/languages/prism/toml";
import yaml from "react-syntax-highlighter/dist/esm/languages/prism/yaml";
import diff from "react-syntax-highlighter/dist/esm/languages/prism/diff";

SyntaxHighlighter.registerLanguage("tsx", tsx);
SyntaxHighlighter.registerLanguage("typescript", typescript);
SyntaxHighlighter.registerLanguage("ts", typescript);
SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("js", javascript);
SyntaxHighlighter.registerLanguage("jsx", tsx);
SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("sh", bash);
SyntaxHighlighter.registerLanguage("shell", bash);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("py", python);
SyntaxHighlighter.registerLanguage("rust", rust);
SyntaxHighlighter.registerLanguage("rs", rust);
SyntaxHighlighter.registerLanguage("css", css);
SyntaxHighlighter.registerLanguage("markdown", markdown);
SyntaxHighlighter.registerLanguage("md", markdown);
SyntaxHighlighter.registerLanguage("toml", toml);
SyntaxHighlighter.registerLanguage("yaml", yaml);
SyntaxHighlighter.registerLanguage("yml", yaml);
SyntaxHighlighter.registerLanguage("diff", diff);

function buildSyntaxTheme(theme: ThemeColors): Record<string, CSSProperties> {
  return {
    'code[class*="language-"]': {
      color: theme.textPrimary,
      fontFamily: theme.fontCode,
      fontSize: "12px",
      lineHeight: "1.5",
    },
    'pre[class*="language-"]': {
      color: theme.textPrimary,
      fontFamily: theme.fontCode,
      fontSize: "12px",
      lineHeight: "1.5",
      margin: 0,
      padding: "12px",
      overflow: "auto",
      background: theme.bgSurface,
    },
    comment: { color: theme.textMuted },
    prolog: { color: theme.textMuted },
    doctype: { color: theme.textMuted },
    cdata: { color: theme.textMuted },
    punctuation: { color: theme.textSecondary },
    property: { color: theme.peach },
    tag: { color: theme.peach },
    boolean: { color: theme.peach },
    number: { color: theme.peach },
    constant: { color: theme.peach },
    symbol: { color: theme.peach },
    deleted: { color: theme.peach },
    selector: { color: theme.mint },
    "attr-name": { color: theme.butter },
    string: { color: theme.mint },
    char: { color: theme.mint },
    builtin: { color: theme.mint },
    inserted: { color: theme.mint },
    operator: { color: theme.textSecondary },
    entity: { color: theme.textSecondary },
    url: { color: theme.textSecondary },
    atrule: { color: theme.lavender },
    "attr-value": { color: theme.lavender },
    keyword: { color: theme.lavender },
    function: { color: theme.lavender },
    "class-name": { color: theme.butter },
    regex: { color: theme.mint },
    important: { color: theme.peach, fontWeight: "bold" },
    variable: { color: theme.textPrimary },
  };
}

interface Props {
  content: string;
}

export function MarkdownRenderer({ content }: Props) {
  const theme = useThemeStore((s) => s.current);
  const syntaxTheme = buildSyntaxTheme(theme);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1
            style={{
              fontSize: 20,
              fontWeight: 700,
              fontFamily: theme.fontHeading,
              color: theme.textPrimary,
              margin: "16px 0 8px",
              lineHeight: 1.3,
            }}
          >
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2
            style={{
              fontSize: 17,
              fontWeight: 700,
              fontFamily: theme.fontHeading,
              color: theme.textPrimary,
              margin: "14px 0 6px",
              lineHeight: 1.3,
            }}
          >
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3
            style={{
              fontSize: 15,
              fontWeight: 600,
              fontFamily: theme.fontHeading,
              color: theme.textPrimary,
              margin: "12px 0 4px",
              lineHeight: 1.4,
            }}
          >
            {children}
          </h3>
        ),
        h4: ({ children }) => (
          <h4
            style={{
              fontSize: 14,
              fontWeight: 600,
              fontFamily: theme.fontHeading,
              color: theme.textPrimary,
              margin: "10px 0 4px",
              lineHeight: 1.4,
            }}
          >
            {children}
          </h4>
        ),
        p: ({ children }) => (
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.6,
              color: theme.textPrimary,
              margin: "6px 0",
            }}
          >
            {children}
          </p>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: theme.lavender,
              textDecoration: "underline",
            }}
          >
            {children}
          </a>
        ),
        code: ({ className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || "");
          const isBlock =
            typeof children === "string" && children.includes("\n");

          if (match || isBlock) {
            const lang = match?.[1] || "";
            return (
              <div
                style={{
                  borderRadius: 6,
                  overflow: "hidden",
                  margin: "8px 0",
                  border: `1px solid ${theme.borderColor}`,
                }}
              >
                {lang && (
                  <div
                    style={{
                      padding: "4px 12px",
                      fontSize: 10,
                      fontFamily: theme.fontCode,
                      color: theme.textMuted,
                      background: theme.bgSurface,
                      borderBottom: `1px solid ${theme.borderColor}`,
                    }}
                  >
                    {lang}
                  </div>
                )}
                <SyntaxHighlighter
                  style={syntaxTheme}
                  language={lang || "text"}
                  PreTag="div"
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              </div>
            );
          }

          return (
            <code
              {...props}
              style={{
                fontFamily: theme.fontCode,
                fontSize: 12,
                background: theme.bgSurface,
                borderRadius: 4,
                padding: "1px 5px",
                color: theme.textPrimary,
              }}
            >
              {children}
            </code>
          );
        },
        pre: ({ children }) => <>{children}</>,
        ul: ({ children }) => (
          <ul
            style={{
              paddingLeft: 20,
              margin: "6px 0",
              fontSize: 13,
              lineHeight: 1.6,
              color: theme.textPrimary,
            }}
          >
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol
            style={{
              paddingLeft: 20,
              margin: "6px 0",
              fontSize: 13,
              lineHeight: 1.6,
              color: theme.textPrimary,
            }}
          >
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li style={{ marginBottom: 2 }}>{children}</li>
        ),
        blockquote: ({ children }) => (
          <blockquote
            style={{
              borderLeft: `3px solid ${theme.lavender}`,
              background: theme.bgSurface,
              margin: "8px 0",
              padding: "8px 12px",
              borderRadius: "0 6px 6px 0",
              color: theme.textSecondary,
              fontSize: 13,
            }}
          >
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div style={{ overflowX: "auto", margin: "8px 0" }}>
            <table
              style={{
                borderCollapse: "collapse",
                width: "100%",
                fontSize: 12,
                color: theme.textPrimary,
              }}
            >
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead style={{ background: theme.bgSurface }}>{children}</thead>
        ),
        th: ({ children }) => (
          <th
            style={{
              border: `1px solid ${theme.borderColor}`,
              padding: "6px 10px",
              textAlign: "left",
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td
            style={{
              border: `1px solid ${theme.borderColor}`,
              padding: "6px 10px",
              fontSize: 12,
            }}
          >
            {children}
          </td>
        ),
        hr: () => (
          <hr
            style={{
              border: "none",
              borderTop: `1px solid ${theme.borderColor}`,
              margin: "12px 0",
            }}
          />
        ),
        strong: ({ children }) => (
          <strong style={{ fontWeight: 600, color: theme.textPrimary }}>
            {children}
          </strong>
        ),
        em: ({ children }) => (
          <em style={{ color: theme.textSecondary }}>{children}</em>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
