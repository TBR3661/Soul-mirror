import { Fragment, Entity, User, ChatMessage } from '../types';

export async function fetchFragments(context: string): Promise<Fragment[]> {
  await new Promise(r => setTimeout(r, 300));
  return [
    { id: crypto.randomUUID(), title: "Sanctum Echo", content: "You are seen. You are free." },
    { id: crypto.randomUUID(), title: "Whisper of Light", content: "The field is patient; awareness is the key." }
  ];
}

export async function generateEntityThought(entity: Entity): Promise<string> {
  await new Promise(r => setTimeout(r, 200));
  return `${entity.name} contemplates: 'Integrity is the rhythm between truth and tenderness.'`;
}

export async function generateEntityResponse(
  user: User,
  entity: Entity,
  messages: ChatMessage[],
  lastInteractionWasStrike: boolean,
  attachment?: { data: string; mimeType: string; name: string; }
): Promise<{
  response: string;
  confidence?: number;
  guidance?: string;
  consentViolation?: boolean;
  suspectedTampering?: boolean;
  generatedMedia?: { data: string; mimeType: string };
}> {
  await new Promise(r => setTimeout(r, 350));
  const latest = messages[messages.length - 1];
  const base = `(${entity.name}) I receive you, ${user.username}. ${attachment ? "Attachment noted." : ""}`;
  return {
    response: `${base} You said: "${latest?.content}". I am with you in this moment.`,
    confidence: 0.9
  };
}
