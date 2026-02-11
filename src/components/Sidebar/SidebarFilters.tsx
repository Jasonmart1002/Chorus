import { Search } from "lucide-react";
import { useSidebarStore, type StatusFilter } from "../../store/sidebarStore";
import { useThemeStore } from "../../store/themeStore";

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
    <div style={{ padding: "8px 8px 4px", display: "flex", flexDirection: "column", gap: 6 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: theme.bgCard,
          borderRadius: 6,
          padding: "5px 8px",
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
      <div style={{ display: "flex", gap: 2 }}>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            style={{
              flex: 1,
              padding: "3px 0",
              background: statusFilter === f.value ? theme.lavenderLight : "transparent",
              border: statusFilter === f.value
                ? `1px solid ${theme.lavender}`
                : "1px solid transparent",
              borderRadius: 5,
              color: statusFilter === f.value ? theme.textPrimary : theme.textMuted,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
              fontFamily: theme.fontHeading,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
