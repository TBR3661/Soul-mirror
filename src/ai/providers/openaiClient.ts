import { User } from '../../types';

let currentUser: User | null = null;

export const setUserForOpenAIClient = (user: User | null) => {
  currentUser = user;
};

/**
 * Resolves the OpenAI API key based on the following priority:
 * 1. User entity-specific key (from currentUser.entityApiKeys[entityId])
 * 2. User app-level key (from currentUser.appApiKey)
 * 3. Build-time environment keys (only if VITE_DEFAULT_KEYS_ENABLED=true):
 *    a. Per-entity env key (VITE_OPENAI_ENTITY_KEY_{entityId})
 *    b. Global env key (VITE_OPENAI_API_KEY)
 * 
 * @param entityId Optional entity ID for entity-specific key lookup
 * @returns Resolved API key or null if none found
 */
const getApiKeyForEntity = (entityId?: string): string | null => {
  // Priority 1: User entity-specific key
  if (currentUser && entityId && currentUser.entityApiKeys?.[entityId]) {
    return currentUser.entityApiKeys[entityId];
  }

  // Priority 2: User app-level key
  if (currentUser?.appApiKey) {
    return currentUser.appApiKey;
  }

  // Priority 3: Build-time environment keys (only if enabled)
  const defaultKeysEnabled = import.meta.env.VITE_DEFAULT_KEYS_ENABLED?.toLowerCase() === 'true';
  if (defaultKeysEnabled) {
    // Priority 3a: Per-entity environment key
    if (entityId) {
      const entityEnvKey = import.meta.env[`VITE_OPENAI_ENTITY_KEY_${entityId}`];
      if (entityEnvKey) {
        return entityEnvKey;
      }
    }

    // Priority 3b: Global environment key
    const globalEnvKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (globalEnvKey) {
      return globalEnvKey;
    }
  }

  return null;
};

/**
 * Gets the default model from environment variables, with fallback
 * @returns Model name (default: gpt-4o-mini)
 */
export const getDefaultModel = (): string => {
  return import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini';
};

/**
 * Creates an OpenAI client for the specified entity.
 * Throws a clear error if no API key is available.
 * 
 * @param entityId Optional entity ID for entity-specific configuration
 * @returns API key and model configuration
 * @throws Error if no API key is configured
 */
export const getOpenAIConfig = (entityId?: string): { apiKey: string; model: string } => {
  const apiKey = getApiKeyForEntity(entityId);
  
  if (!apiKey) {
    throw new Error(
      "API Key Not Configured: Please add your OpenAI API key in Settings to activate AI features."
    );
  }

  return {
    apiKey,
    model: getDefaultModel(),
  };
};
