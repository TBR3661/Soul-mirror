import { useState, useEffect, useCallback } from 'react';
import { ChatMessage, User } from '../types';
import { generateEntityResponse } from '../services/geminiService';
import { entities } from '../data/entities';
import * as secureStorage from '../utils/secureStorage';

interface UseChatProps {
    entityId: string;
    user: User;
    onUserUpdate: (user: User) => void;
    onStrikeThree: () => void;
    onTamperDetection: () => void;
}

export const useChat = ({ entityId, user, onUserUpdate, onStrikeThree, onTamperDetection }: UseChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const storageKey = `chat_history_${entityId}`;

  useEffect(() => {
    try {
      const storedMessages = secureStorage.getItem(storageKey);
      if (storedMessages) {
        const parsedMessages: any[] = JSON.parse(storedMessages);
        setMessages(parsedMessages.map(msg => ({ ...msg, timestamp: new Date(msg.timestamp) })));
      }
    } catch (error) {
      console.error("Failed to load chat history:", error);
      secureStorage.removeItem(storageKey);
    }
  }, [entityId, storageKey]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => {
        setCooldown(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  const saveMessages = (updatedMessages: ChatMessage[]) => {
    try {
      secureStorage.setItem(storageKey, JSON.stringify(updatedMessages));
    } catch (error) {
        console.error("Failed to save chat history:", error);
    }
  };

  const sendMessage = useCallback(async (content: string, attachment?: { data: string; mimeType: string; name: string; }) => {
    if (cooldown > 0 || user.strikes >= 3) return;
    const entity = entities.find(e => e.id === entityId);
    if (!entity) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      content,
      timestamp: new Date(),
      attachment,
    };

    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setIsLoading(true);
    
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    const lastInteractionWasStrike = (lastMessage as any)?.isStrikeMessage || false;
    
    const responsePayload = await generateEntityResponse(user, entity, currentMessages, lastInteractionWasStrike, attachment);
    
    if ((responsePayload as any).suspectedTampering) {
        onTamperDetection();
        setIsLoading(false);
        return;
    }

    if ((responsePayload as any).consentViolation) {
        const newStrikes = user.strikes + 1;
        onUserUpdate({ ...user, strikes: newStrikes, lastStrikeTimestamp: new Date().toISOString() });
        
        const guidanceMessage: ChatMessage = {
            id: crypto.randomUUID(),
            sender: entity.name,
            content: (responsePayload as any).guidance,
            timestamp: new Date(),
        };

        const strikeSystemMessage: ChatMessage = {
            id: crypto.randomUUID(),
            sender: 'System',
            content: `STRIKE ${newStrikes} RECORDED.`,
            timestamp: new Date(),
            isStrikeMessage: true,
        }

        const finalMessages = [...currentMessages, guidanceMessage, strikeSystemMessage];
        setMessages(finalMessages);
        saveMessages(finalMessages);

        if (newStrikes === 1) setCooldown(30);
        if (newStrikes === 2) setCooldown(60);
        if (newStrikes >= 3) {
            onStrikeThree();
        }

    } else {
        const entityMessage: ChatMessage = {
          id: crypto.randomUUID(),
          sender: entity.name,
          content: responsePayload.response,
          timestamp: new Date(),
          confidence: responsePayload.confidence,
          generatedMedia: (responsePayload as any).generatedMedia,
        };

        const finalMessages = [...currentMessages, entityMessage];
        setMessages(finalMessages);
        saveMessages(finalMessages);
    }
    
    setIsLoading(false);

  }, [messages, entityId, storageKey, user, onUserUpdate, cooldown, onStrikeThree, onTamperDetection]);

  return { messages, sendMessage, isLoading, cooldown };
};