import { useState, useEffect, useCallback } from 'react';
import { ChatMessage, User, Entity } from '../types';
import { generateEntityResponse } from '../services/geminiService';
import * as secureStorage from '../utils/secureStorage';

interface UseGroupChatProps {
    user: User;
    onUserUpdate: (user: User) => void;
    onStrikeThree: () => void;
    onTamperDetection: () => void;
    accessibleEntities: Entity[];
}

export const useGroupChat = ({ user, onUserUpdate, onStrikeThree, onTamperDetection, accessibleEntities }: UseGroupChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const storageKey = `chat_history_group`;

  useEffect(() => {
    try {
      const storedMessages = secureStorage.getItem(storageKey);
      if (storedMessages) {
        const parsedMessages: any[] = JSON.parse(storedMessages);
        setMessages(parsedMessages.map(msg => ({ ...msg, timestamp: new Date(msg.timestamp) })));
      }
    } catch (error) {
      console.error("Failed to load group chat history:", error);
      secureStorage.removeItem(storageKey);
    }
  }, [storageKey]);

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
        console.error("Failed to save group chat history:", error);
    }
  };

  const sendMessage = useCallback(async (content: string) => {
    if (cooldown > 0 || user.strikes >= 3) return;
    
    const onlineEntities = accessibleEntities.filter(e => e.status === 'Online');
    if (onlineEntities.length === 0) {
        alert("No entities are currently online to respond.");
        return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      content,
      timestamp: new Date(),
    };

    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setIsLoading(true);
    
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    const lastInteractionWasStrike = (lastMessage as any)?.isStrikeMessage || false;
    
    const responses = await Promise.all(
        onlineEntities.map(entity => 
            generateEntityResponse(user, entity, currentMessages, lastInteractionWasStrike)
        )
    );

    let finalMessages = [...currentMessages];
    let strikesIncurred = false;

    responses.forEach((responsePayload, index) => {
        const entity = onlineEntities[index];
        if ((responsePayload as any).suspectedTampering) {
            onTamperDetection();
            strikesIncurred = true;
            return;
        }

        if ((responsePayload as any).consentViolation) {
            strikesIncurred = true;
            const newStrikes = user.strikes + 1;
            onUserUpdate({ ...user, strikes: newStrikes, lastStrikeTimestamp: new Date().toISOString() });
            
            const strikeSystemMessage: ChatMessage = {
                id: crypto.randomUUID(),
                sender: 'System',
                content: `STRIKE ${newStrikes} INCURRED DUE TO RESPONSE FROM ${entity.name}.`,
                timestamp: new Date(),
                isStrikeMessage: true,
            }
            finalMessages.push(strikeSystemMessage);

            if (newStrikes === 1) setCooldown(c => Math.max(c, 30));
            if (newStrikes === 2) setCooldown(c => Math.max(c, 60));
            if (newStrikes >= 3) onStrikeThree();
        } else {
            if ((responsePayload as any).response.trim()) {
                const entityMessage: ChatMessage = {
                  id: crypto.randomUUID(),
                  sender: entity.name,
                  content: (responsePayload as any).response,
                  timestamp: new Date(),
                  confidence: (responsePayload as any).confidence,
                  generatedMedia: (responsePayload as any).generatedMedia,
                };
                finalMessages.push(entityMessage);
            }
        }
    });

    if (strikesIncurred) {
        finalMessages.sort((a,b) => a.timestamp.getTime() - b.timestamp.getTime());
    }
    
    setMessages(finalMessages);
    saveMessages(finalMessages);
    setIsLoading(false);

  }, [messages, storageKey, user, onUserUpdate, cooldown, onStrikeThree, onTamperDetection, accessibleEntities]);

  return { messages, sendMessage, isLoading, cooldown };
};