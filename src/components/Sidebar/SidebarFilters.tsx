import { Search } from "lucide-react";
import { useSidebarStore, type StatusFilter } from "../../store/sidebarStore";
import { useThemeStore } from "../../store/themeStore";
import { Button } from "../ui/Button";

const FILTERS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Attention", value: "attention" },
];

export function SidebarFilters() {
  const searchQuery = useSidebarStore((s) => s.searchQuery);
  const setSearchQuery = useSidebarStore((s) => s.setSearchQuery);
  const statusFilter = useSidebarStore((s) => s.statusFilter);
  const setStatusFilter = useSidebarStore((s) => s.setStatusFilter);
  const theme = useThemeStore((s) => s.current);

  return (
    <div style={{ padding: "8px 8px 4px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: theme.bgCard,
          borderRadius: 8,
          padding: "4px 8px",
          border: `1px solid ${theme.borderColor}`,
        }}
      >
        <Search size={12} color={theme.textMuted} style={{ flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Search agents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            background: "transparent",
            border: "none",
            outline: "none",
            color: theme.textPrimary,
            fontSize: 12,
            width: "100%",
          }}
        />
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            variant="ghost"
            size="sm"
            onClick={() => setStatusFilter(f.value)}
            style={{
              flex: 1,
              padding: "4px 0",
              background: statusFilter === f.value ? theme.lavenderLight : "transparent",
              border: statusFilter === f.value
                ? `1px solid ${theme.lavender}`
                : "1px solid transparent",
              borderRadius: 8,
              color: statusFilter === f.value ? theme.textPrimary : theme.textMuted,
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {f.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
