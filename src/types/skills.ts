export interface SkillInfo {
  name: string;
  description: string;
  file_path: string;
}

export interface CommandInfo {
  name: string;
  description: string;
  argument_hint: string | null;
  allowed_tools: string[];
  file_path: string;
}

export interface PluginAuthor {
  name: string;
  email: string | null;
}

export interface PluginInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  author: PluginAuthor | null;
  enabled: boolean;
  install_path: string;
  installed_at: string | null;
  last_updated: string | null;
  skills: SkillInfo[];
  commands: CommandInfo[];
}

export interface SkillsData {
  plugins: PluginInfo[];
  total_skills: number;
  total_commands: number;
}
