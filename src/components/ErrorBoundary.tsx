import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Detect theme from body class to stay in sync
      const isDark = typeof document !== "undefined" && document.body.classList.contains("theme-dark");

      // Catppuccin Latte (light) / Mocha (dark) tokens
      const c = isDark
        ? { base: "#1e1e2e", surface: "#313244", surface1: "#45475a", text: "#cdd6f4", subtext: "#bac2de", red: "#f38ba8", peach: "#fab387", crust: "#11111b" }
        : { base: "#eff1f5", surface: "#e6e9ef", surface1: "#ccd0da", text: "#4c4f69", subtext: "#5c5f77", red: "#d20f39", peach: "#fe640b", crust: "#9ca0b0" };

      return (
        <div
          style={{
            width: "100vw",
            height: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: c.base,
            fontFamily: "'Nunito', sans-serif",
          }}
        >
          <div
            style={{
              background: c.surface,
              borderRadius: 16,
              padding: 32,
              maxWidth: 480,
              width: "90vw",
              border: `2px solid ${c.text}`,
              boxShadow: `4px 6px 0 ${c.crust}`,
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: c.surface1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                fontSize: 24,
                fontWeight: 700,
                color: c.red,
              }}
            >
              !
            </div>
            <h2
              style={{
                margin: "0 0 8px",
                fontSize: 18,
                fontWeight: 700,
                color: c.text,
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              Something went wrong
            </h2>
            <p
              style={{
                margin: "0 0 20px",
                fontSize: 13,
                color: c.subtext,
                lineHeight: 1.5,
                fontFamily: "'Nunito', sans-serif",
              }}
            >
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "8px 24px",
                background: c.peach,
                border: `2px solid ${c.text}`,
                borderRadius: 10,
                color: c.base,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "'Space Grotesk', sans-serif",
                boxShadow: `3px 3px 0 ${c.crust}`,
              }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
