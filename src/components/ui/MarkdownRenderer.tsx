import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { useThemeStore } from "../../store/themeStore";
import { CODE_BG, CODE_MANTLE, CODE_BORDER, CODE_SUBTEXT, buildCodeSyntaxTheme } from "../../lib/codeTheme";

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

interface Props {
  content: string;
}

export function MarkdownRenderer({ content }: Props) {
  const theme = useThemeStore((s) => s.current);
  const syntaxTheme = buildCodeSyntaxTheme(theme.fontCode);

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
              textShadow: "1px 1px 0px rgba(0,0,0,0.08)",
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
              textShadow: "1px 1px 0px rgba(0,0,0,0.08)",
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
              textShadow: "1px 1px 0px rgba(0,0,0,0.08)",
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
              textShadow: "1px 1px 0px rgba(0,0,0,0.08)",
            }}
          >
            {children}
          </h4>
        ),
        p: ({ children }) => (
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.7,
              color: theme.textPrimary,
              fontFamily: theme.fontBody,
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
              color: theme.pink,
              textDecoration: "underline",
              fontWeight: 600,
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
                  borderRadius: theme.borderRadiusSm,
                  overflow: "hidden",
                  margin: "8px 0",
                  border: `2px solid ${CODE_BORDER}`,
                  background: CODE_BG,
                }}
              >
                {lang && (
                  <div
                    style={{
                      padding: "4px 12px",
                      fontSize: 10,
                      fontFamily: theme.fontCode,
                      color: CODE_SUBTEXT,
                      background: CODE_MANTLE,
                      borderBottom: `1px solid ${CODE_BORDER}`,
                      fontWeight: 700,
                      letterSpacing: "0.02em",
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
                background: theme.bgCard,
                borderRadius: 6,
                padding: "1px 6px",
                color: theme.textPrimary,
                border: `1px solid ${theme.borderColor}`,
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
              lineHeight: 1.7,
              color: theme.textPrimary,
              fontFamily: theme.fontBody,
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
              lineHeight: 1.7,
              color: theme.textPrimary,
              fontFamily: theme.fontBody,
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
              borderLeft: `3px solid ${theme.pink}`,
              background: theme.bgCard,
              margin: "8px 0",
              padding: "8px 12px",
              borderRadius: `0 ${theme.borderRadiusSm}px ${theme.borderRadiusSm}px 0`,
              color: theme.textSecondary,
              fontSize: 13,
              fontFamily: theme.fontBody,
            }}
          >
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div
            style={{
              overflowX: "auto",
              margin: "8px 0",
              borderRadius: theme.borderRadiusSm,
              border: `2px solid ${theme.borderStrong}`,
              overflow: "hidden",
            }}
          >
            <table
              style={{
                borderCollapse: "collapse",
                width: "100%",
                fontSize: 12,
                color: theme.textPrimary,
                fontFamily: theme.fontBody,
              }}
            >
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead style={{ background: theme.bgCard }}>{children}</thead>
        ),
        th: ({ children }) => (
          <th
            style={{
              border: `1px solid ${theme.borderColor}`,
              padding: "6px 10px",
              textAlign: "left",
              fontWeight: 700,
              fontSize: 12,
              fontFamily: theme.fontHeading,
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
              borderTop: `2px solid ${theme.borderColor}`,
              margin: "12px 0",
            }}
          />
        ),
        strong: ({ children }) => (
          <strong style={{ fontWeight: 700, color: theme.textPrimary }}>
            {children}
          </strong>
        ),
        em: ({ children }) => (
          <em style={{ color: theme.textSecondary, fontStyle: "italic" }}>
            {children}
          </em>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
