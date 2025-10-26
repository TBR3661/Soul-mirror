export interface GenerateTextOptions {
  prompt?: string;
  messages?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  model?: string;
  entityId?: string;
}

export interface GenerateTextResult {
  text: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  raw?: unknown;
}

export interface IAIClient {
  generateText(options: GenerateTextOptions): Promise<GenerateTextResult>;
}