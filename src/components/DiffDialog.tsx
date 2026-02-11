import { useState, useEffect, useRef } from "react";
import { RefreshCw, Loader } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import diff from "react-syntax-highlighter/dist/esm/languages/prism/diff";
import { useThemeStore } from "../store/themeStore";
import { Dialog } from "./ui/Dialog";
import { Button } from "./ui/Button";
import type { ThemeColors } from "../lib/theme";

SyntaxHighlighter.registerLanguage("diff", diff);

const DIFF_TYPES = [
  { key: "unstaged", label: "Unstaged", command: "git diff --no-color" },
  { key: "staged", label: "Staged", command: "git diff --cached --no-color" },
  { key: "main", label: "vs Main", command: "git diff --no-color main...HEAD" },
] as const;

interface Props {
  cwd: string;
  onClose: () => void;
}

function buildDiffTheme(theme: ThemeColors): Record<string, React.CSSProperties> {
  return {
    'code[class*="language-"]': {
      color: theme.textPrimary,
      fontFamily: theme.fontCode,
      fontSize: "11px",
      lineHeight: "1.6",
    },
    'pre[class*="language-"]': {
      color: theme.textPrimary,
      fontFamily: theme.fontCode,
      fontSize: "11px",
      lineHeight: "1.6",
      margin: 0,
      padding: "12px",
      overflow: "auto",
      background: theme.bgBase,
    },
    comment: { color: theme.textMuted },
    punctuation: { color: theme.lavender },
    inserted: { color: theme.mint },
    deleted: { color: theme.peach },
    "attr-name": { color: theme.butter },
    string: { color: theme.mint },
    keyword: { color: theme.lavender },
    important: { color: theme.peach, fontWeight: "bold" },
  };
}

export function DiffDialog({ cwd, onClose }: Props) {
  const theme = useThemeStore((s) => s.current);
  const [diffType, setDiffType] = useState("unstaged");
  const [lines, setLines] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [exitCode, setExitCode] = useState<number | null | undefined>(undefined);
  const outputRef = useRef<HTMLDivElement>(null);
  const runIdRef = useRef(0);

  const syntaxTheme = buildDiffTheme(theme);

  const runDiff = (type: string) => {
    const config = DIFF_TYPES.find((d) => d.key === type);
    if (!config) return;

    const id = ++runIdRef.current;
    setLines([]);
    setRunning(true);
    setExitCode(undefined);

    invoke("run_command", {
      cwd,
      command: config.command,
      envVars: null,
    }).catch((err) => {
      if (runIdRef.current === id) {
        setLines([`Error: ${String(err)}`]);
        setRunning(false);
        setExitCode(1);
      }
    });
  };

  // Listen for output and done events, filtered to our cwd
  useEffect(() => {
    let unlistenOutput: (() => void) | null = null;
    let unlistenDone: (() => void) | null = null;

    async function setup() {
      unlistenOutput = await listen<{ cwd: string; line: string; stream: string }>(
        "command-output",
        (event) => {
          if (event.payload.cwd === cwd) {
            setLines((prev) => [...prev, event.payload.line]);
          }
        }
      );

      unlistenDone = await listen<{ cwd: string; exit_code: number | null }>(
        "command-done",
        (event) => {
          if (event.payload.cwd === cwd) {
            setRunning(false);
            setExitCode(event.payload.exit_code);
          }
        }
      );
    }

    setup();
    return () => {
      unlistenOutput?.();
      unlistenDone?.();
    };
  }, [cwd]);

  // Auto-run on mount
  useEffect(() => {
    runDiff(diffType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines.length]);

  const handleTypeChange = (type: string) => {
    setDiffType(type);
    runDiff(type);
  };

  const isDone = !running && exitCode !== undefined;
  const diffText = lines.join("\n");
  const dirName = cwd.split("/").pop() || cwd;

  return (
    <Dialog
      open={true}
      onClose={onClose}
      title="Diff"
      description={dirName}
      width={640}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            color={theme.lavender}
            onClick={() => runDiff(diffType)}
            disabled={running}
            icon={<RefreshCw size={14} />}
          >
            Refresh
          </Button>
        </>
      }
    >
      {/* Diff type tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        {DIFF_TYPES.map((dt) => (
          <button
            key={dt.key}
            onClick={() => handleTypeChange(dt.key)}
            disabled={running}
            style={{
              padding: "4px 12px",
              fontSize: 11,
              fontWeight: diffType === dt.key ? 600 : 400,
              fontFamily: theme.fontCode,
              background: diffType === dt.key ? theme.lavenderLight : "transparent",
              color: diffType === dt.key ? theme.lavender : theme.textSecondary,
              border: `1px solid ${diffType === dt.key ? theme.lavender : theme.borderColor}`,
              borderRadius: 6,
              cursor: running ? "not-allowed" : "pointer",
              opacity: running ? 0.5 : 1,
              transition: "all 0.15s ease",
            }}
          >
            {dt.label}
          </button>
        ))}
      </div>

      {/* Output container */}
      <div
        style={{
          background: theme.bgBase,
          borderRadius: 8,
          border: `1px solid ${running ? theme.lavender : theme.borderColor}`,
          overflow: "hidden",
        }}
      >
        {/* Status bar */}
        <div
          style={{
            padding: "6px 12px",
            borderBottom: `1px solid ${theme.borderColor}`,
            fontSize: 11,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: running
              ? theme.lavender
              : isDone && exitCode === 0 && lines.length === 0
              ? theme.textMuted
              : isDone && exitCode === 0
              ? theme.mint
              : isDone
              ? theme.peach
              : theme.textMuted,
          }}
        >
          {running && (
            <Loader size={11} style={{ animation: "spin 1s linear infinite" }} />
          )}
          <span>
            {running
              ? "Loading diff..."
              : isDone && exitCode === 0 && lines.length === 0
              ? "No changes"
              : isDone && exitCode === 0
              ? `${lines.length} lines`
              : isDone
              ? `git exited with code ${exitCode}`
              : ""}
          </span>
        </div>

        {/* Diff content */}
        <div
          ref={outputRef}
          style={{
            maxHeight: 400,
            overflow: "auto",
          }}
        >
          {lines.length > 0 ? (
            <SyntaxHighlighter
              style={syntaxTheme}
              language="diff"
              PreTag="div"
            >
              {diffText}
            </SyntaxHighlighter>
          ) : (
            <pre
              style={{
                padding: "12px",
                margin: 0,
                fontSize: 11,
                color: theme.textMuted,
                fontFamily: theme.fontCode,
              }}
            >
              {running ? "Waiting for output..." : "(no changes)"}
            </pre>
          )}
        </div>
      </div>
    </Dialog>
  );
}
