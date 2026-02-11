import { Plus } from "lucide-react";
import { useThemeStore } from "../../store/themeStore";

interface Props {
  onClick: () => void;
}

export function NewAgentButton({ onClick }: Props) {
  const theme = useThemeStore((s) => s.current);

  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "10px 12px",
        background: theme.mintLight,
        border: `1px dashed ${theme.mint}`,
        borderRadius: 8,
        color: theme.textPrimary,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        fontSize: 13,
        fontWeight: 500,
        fontFamily: theme.fontHeading,
        transition: `all 0.2s ${theme.easeSpring}`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = theme.mint;
        e.currentTarget.style.color = "white";
        e.currentTarget.style.borderColor = theme.mint;
        e.currentTarget.style.transform = "scale(1.02)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = theme.mintLight;
        e.currentTarget.style.color = theme.textPrimary;
        e.currentTarget.style.borderColor = theme.mint;
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      <Plus size={16} />
      New Agent
    </button>
  );
}
