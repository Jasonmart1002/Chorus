export type ScheduleFrequency = "daily" | "weekly" | "monthly" | "custom";

export type DayOfWeek = "Mo" | "Tu" | "We" | "Th" | "Fr" | "Sa" | "Su";

export interface AutomationSchedule {
  frequency: ScheduleFrequency;
  days: DayOfWeek[];
  time: string; // HH:MM (24h)
  custom_interval_minutes?: number;
}

export interface AutomationTarget {
  agent_id?: string;
  agent_name?: string;
  agent_cwd?: string;
}

export interface Automation {
  id: string;
  name: string;
  prompt: string;
  schedule: AutomationSchedule;
  target: AutomationTarget;
  enabled: boolean;
  created_at: string;
  last_run_at?: string;
  next_run_at?: string;
  last_run_status?: "success" | "error";
  run_count: number;
  skip_permissions: boolean;
}

export interface RunningAutomation {
  automation_id: string;
  automation_name: string;
  agent_id: string;
  started_at: string;
}
