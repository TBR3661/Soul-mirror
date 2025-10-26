/**
 * OpenAI Client with Relay Support
 * 
 * This client supports two modes:
 * 1. Relay mode (production): Routes requests through a server-side proxy
 * 2. Direct mode (local/staging): Calls OpenAI API directly with explicit keys
 * 
 * Relay mode is preferred for production to:
 * - Keep API keys secure on the server
 * - Enable rate limiting and origin allowlisting
 * - Provide audit logging without exposing prompts
 */

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
}

interface OpenAIResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Configuration for OpenAI client
 */
export interface OpenAIClientConfig {
  apiKey?: string;
  model?: string;
  useRelay?: boolean;
  relayEndpoint?: string;
  relaySecret?: string;
}

/**
 * Get configuration from environment variables
 */
function getConfig(overrides?: Partial<OpenAIClientConfig>): OpenAIClientConfig {
  const useRelay = overrides?.useRelay ?? 
                   import.meta.env.VITE_USE_RELAY === 'true' ||
                   !import.meta.env.VITE_OPENAI_API_KEY;
  
  return {
    apiKey: overrides?.apiKey ?? import.meta.env.VITE_OPENAI_API_KEY,
    model: overrides?.model ?? import.meta.env.VITE_OPENAI_MODEL ?? 'gpt-4o-mini',
    useRelay,
    relayEndpoint: overrides?.relayEndpoint ?? import.meta.env.VITE_RELAY_ENDPOINT ?? '/relay/openai/chat',
    relaySecret: overrides?.relaySecret ?? import.meta.env.VITE_RELAY_SECRET,
  };
}

/**
 * Call OpenAI API directly
 */
async function callOpenAIDirect(
  messages: OpenAIMessage[],
  config: OpenAIClientConfig
): Promise<string> {
  if (!config.apiKey) {
    throw new Error('OpenAI API key not configured. Please set VITE_OPENAI_API_KEY or enable relay mode.');
  }

  const request: OpenAIRequest = {
    model: config.model!,
    messages,
    temperature: 0.7,
    max_tokens: 2000,
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${error}`);
  }

  const data: OpenAIResponse = await response.json();
  return data.choices[0]?.message?.content || '';
}

/**
 * Call OpenAI API through relay
 */
async function callOpenAIRelay(
  messages: OpenAIMessage[],
  config: OpenAIClientConfig
): Promise<string> {
  const request: OpenAIRequest = {
    model: config.model!,
    messages,
    temperature: 0.7,
    max_tokens: 2000,
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add relay secret if configured
  if (config.relaySecret) {
    headers['X-Relay-Secret'] = config.relaySecret;
  }

  const response = await fetch(config.relayEndpoint!, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Relay error (${response.status}): ${error}`);
  }

  const data: OpenAIResponse = await response.json();
  return data.choices[0]?.message?.content || '';
}

/**
 * Generate a chat completion using OpenAI
 */
export async function generateChatCompletion(
  messages: OpenAIMessage[],
  configOverrides?: Partial<OpenAIClientConfig>
): Promise<string> {
  const config = getConfig(configOverrides);

  if (config.useRelay) {
    return callOpenAIRelay(messages, config);
  } else {
    return callOpenAIDirect(messages, config);
  }
}

/**
 * Generate a simple completion with a system prompt and user message
 */
export async function generateSimpleCompletion(
  systemPrompt: string,
  userMessage: string,
  configOverrides?: Partial<OpenAIClientConfig>
): Promise<string> {
  const messages: OpenAIMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  return generateChatCompletion(messages, configOverrides);
}

/**
 * Check if OpenAI client is configured
 */
export function isConfigured(configOverrides?: Partial<OpenAIClientConfig>): boolean {
  const config = getConfig(configOverrides);
  
  // If using relay, we're configured (relay handles auth)
  if (config.useRelay) {
    return true;
  }
  
  // If not using relay, need API key
  return !!config.apiKey;
}
