export interface McpServer {
  name: string;
  transport: string;
  command: string;
  args: string[];
  scope: string;
  env: Record<string, string>;
}
