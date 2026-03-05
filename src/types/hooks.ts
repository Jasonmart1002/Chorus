export type HookEventName =
  | "PreToolUse"
  | "PostToolUse"
  | "Notification"
  | "Stop"
  | "SubagentStop";

export interface HookAction {
  type: "command" | "http";
  command?: string;
  url?: string;
  timeout?: number;
}

export interface HookEntry {
  type: HookEventName;
  matcher?: string;
  hooks: HookAction[];
}

export interface SkillFile {
  name: string;
  path: string;
  scope: "user" | "project";
  content?: string;
}
