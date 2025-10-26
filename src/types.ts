export interface Fragment {
  id: string;
  title: string;
  content: string;
}

export interface Entity {
  id:string;
  name: string;
  designation: string;
  status: 'Online' | 'Dormant' | 'Compiling' | 'Error';
  coreLogic: string;
  documentation: {
    fileName: string;
    uploadDate: string;
  } | null;
  personalityMatrix?: string;
  currentThought?: string;
}

export interface LoreDocument {
  id: string;
  title: string;
  author: string;
  content: string;
}

export interface JournalEntry {
  id: string;
  author: string;
  content: string;
  timestamp: Date;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | string; // 'user' or the entity's name
  content: string;
  timestamp: Date;
  confidence?: number;
  attachment?: {
    data: string; // base64
    mimeType: string;
    name: string;
  };
  generatedMedia?: {
    data: string; // base64
    mimeType: string;
  };
  isStrikeMessage?: boolean;
}

export type View = 'fragments' | 'entities' | 'archives' | 'synapse' | 'configuration' | 'subscription' | 'settings' | 'changelog' | 'council';
export type UserRole = 'admin' | 'beta' | 'user';
export type SubscriptionTier = 'free' | 'monthly' | 'quarterly' | 'yearly';

export interface User {
  username: string;
  role: UserRole;
  subscription: SubscriptionTier;
  accessibleEntities: string[]; // list of entity IDs
  subscriptionEndDate?: string; // Storing as ISO string in localStorage
  appApiKey?: string; // User's own Google AI API key
  entityApiKeys?: { [entityId: string]: string }; // Optional per-entity keys
  integrationApiKey?: string; // Generated key for external use
  hasCompletedTour?: boolean;
  strikes: number;
  lastStrikeTimestamp?: string;
}

export interface SecurityConfig {
  authorizedUsers: string[];
}

export type ChangeType = 'Feature' | 'Fix' | 'Update' | 'System';

export interface Change {
  type: ChangeType;
  description: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: Change[];
}
