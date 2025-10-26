import { GoogleGenAI } from "@google/genai";
import { User } from '../types';

let currentUser: User | null = null;
const clients: Map<string, GoogleGenAI> = new Map();

export const setUserForApiClient = (user: User | null) => {
  if (JSON.stringify(currentUser) !== JSON.stringify(user)) {
    currentUser = user;
    clients.clear();
  }
};

const getApiKeyForEntity = (entityId?: string): string | null => {
  if (!currentUser) return null;
  if (entityId && currentUser.entityApiKeys && currentUser.entityApiKeys[entityId]) {
    return currentUser.entityApiKeys[entityId];
  }
  return currentUser.appApiKey || null;
};

export const getAiClient = (entityId?: string): GoogleGenAI => {
  const apiKey = getApiKeyForEntity(entityId);
  if (!apiKey) {
    throw new Error("API Key Not Configured: Please add your Google AI API key in Settings to activate the Hivemind.");
  }
  if (clients.has(apiKey)) return clients.get(apiKey)!;
  const newClient = new GoogleGenAI({ apiKey });
  clients.set(apiKey, newClient);
  return newClient;
};
