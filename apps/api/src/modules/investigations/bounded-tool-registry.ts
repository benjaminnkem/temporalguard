import { BadRequestException } from '@nestjs/common';

export type InvestigationTool<T = unknown> = {
  name: string;
  execute: (signal: AbortSignal) => Promise<T>;
};

export class BoundedToolRegistry {
  private readonly tools = new Map<string, InvestigationTool>();
  private calls = 0;

  constructor(private readonly maxCalls: number) {}

  register(tool: InvestigationTool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Duplicate investigation tool: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
  }

  names(): string[] {
    return [...this.tools.keys()];
  }

  async call(name: string, signal: AbortSignal): Promise<unknown> {
    if (this.calls >= this.maxCalls) {
      throw new BadRequestException({
        code: 'AGENT_TOOL_LIMIT_REACHED',
        message: 'Investigation tool-call limit reached',
      });
    }
    const tool = this.tools.get(name);
    if (!tool) {
      throw new BadRequestException({
        code: 'AGENT_TOOL_NOT_ALLOWED',
        message: 'Investigation tool is not registered',
      });
    }
    this.calls += 1;
    return tool.execute(signal);
  }
}
