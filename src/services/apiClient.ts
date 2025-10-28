import { GoogleGenAI } from "@google/genai";
import { User } from '../types';
import { vertexGenerate, VertexPart } from './vertexClient';

export type AiProvider = 'studio' | 'vertex';
let provider: AiProvider = 'studio';
export const setAiProvider = (p: AiProvider) => { provider = p; };

let currentUser: User | null = null;
const studioClients: Map<string, GoogleGenAI> = new Map();

export const setUserForApiClient = (user: User | null) => {
  if (JSON.stringify(currentUser) !== JSON.stringify(user)) {
    currentUser = user;
    studioClients.clear();
  }
};

const getStudioKeyForEntity = (entityId?: string): string | null => {
  if (!currentUser) return null;
  if (entityId && currentUser.entityApiKeys && currentUser.entityApiKeys[entityId]) {
    return currentUser.entityApiKeys[entityId];
  }
  return currentUser.appApiKey || null;
};

export const getAiClient = (entityId?: string): GoogleGenAI => {
  const apiKey = getStudioKeyForEntity(entityId);
  if (!apiKey) {
    throw new Error("API Key Not Configured: Please add your Google AI API key in Settings to activate the Hivemind.");
  }
  if (studioClients.has(apiKey)) return studioClients.get(apiKey)!;
  const newClient = new GoogleGenAI({ apiKey });
  studioClients.set(apiKey, newClient);
  return newClient;
};

interface VertexCandidate {
  content?: {
    parts?: Array<{ text?: string }>;
  };
}

export const generateWithProvider = async (args: {
  entityId?: string;
  messages: { role: 'user' | 'system' | 'assistant'; content: string }[];
  attachments?: { data: string; mimeType: string; name?: string }[];
  vertex: { baseUrl: string; model?: string; generationConfig?: Record<string, any> };
}): Promise<{ response: string; provider: AiProvider; usage?: any }> => {
  if (provider === 'studio') {
    const apiKey = getStudioKeyForEntity(args.entityId);
    if (!apiKey) {
      throw new Error("API Key Not Configured: Please add your Google AI API key in Settings to activate the Hivemind.");
    }
    // Keep existing Studio behavior minimal to avoid breaking flow
    // This is a placeholder - actual integration should use getAiClient and model.generateContent
    const last = args.messages[args.messages.length - 1];
    return { response: `(Studio) You said: "${last?.content}".`, provider: 'studio' };
  }

  // Vertex path
  const parts: VertexPart[] = [];
  for (const m of args.messages) {
    if (m.content) parts.push({ text: m.content });
  }
  if (args.attachments?.length) {
    for (const a of args.attachments) {
      parts.push({ inlineData: { mimeType: a.mimeType, data: a.data } });
    }
  }
  const out = await vertexGenerate({
    cfg: { baseUrl: args.vertex.baseUrl, model: args.vertex.model },
    parts,
    generationConfig: args.vertex.generationConfig,
  });
  const candidates = (out?.candidates || []) as VertexCandidate[];
  const text = candidates[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("\n") || '';
  return { response: text, provider: 'vertex', usage: out?.usageMetadata };
};
