import { Plus } from "lucide-react";
import { useThemeStore } from "../../store/themeStore";
import { Button } from "../ui/Button";

interface Props {
  onClick: () => void;
}

export function NewAgentButton({ onClick }: Props) {
  const theme = useThemeStore((s) => s.current);

  return (
    <Button
      variant="primary"
      color={theme.mint}
      fullWidth
      onClick={onClick}
      icon={<Plus size={16} />}
      style={{
        padding: "10px 12px",
        fontSize: 13,
        fontWeight: 500,
        fontFamily: theme.fontHeading,
      }}
    >
      New Agent
    </Button>
  );
}
