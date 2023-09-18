import { describe, beforeEach, expect, it, vi } from 'vitest'
import { updateConversation, saveConversation, saveConversations } from '@/utils/app/conversation'
import { Conversation } from '@/types/chat';

// Assuming these functions are correctly imported/handled in the actual environment
(global as any).localStorage = {
    setItem: vi.fn(),
};

beforeEach(() => {
    (global as any).localStorage.setItem.mockClear();
});

describe('Chat App', () => {
    const conversationToUpdate: Conversation = {
        id: 1,
        model: null,
        prompt: 'This is a test prompt.',
        messages: [],
        folderId: '',
        temperature: 0,
    }

    const conversations: Conversation[] = [
        {
            id: 0,
            model: null,
            prompt: 'This is a different test prompt.',
            messages: [],
            folderId: '',
            temperature: 0,
        },
        conversationToUpdate,
    ];

    it('should update Conversation and save it to localStorage', () => {
        const result = updateConversation(conversationToUpdate, conversations);

        expect(result.single).toBe(conversationToUpdate);
        expect(result.all.includes(conversationToUpdate)).toBe(true);
        expect((global as any).localStorage.setItem).toHaveBeenCalledTimes(2);
        expect((global as any).localStorage.setItem).toHaveBeenCalledWith('selectedConversation', JSON.stringify(conversationToUpdate));
        expect((global as any).localStorage.setItem).toHaveBeenCalledWith('conversationHistory', JSON.stringify(result.all));
    });

    it('should save a single conversation to localStorage', () => {
        saveConversation(conversationToUpdate);

        expect((global as any).localStorage.setItem).toHaveBeenCalledWith('selectedConversation', JSON.stringify(conversationToUpdate));
    });

    it('should save all conversations to localStorage', () => {
        saveConversations(conversations);

        expect((global as any).localStorage.setItem).toHaveBeenCalledWith('conversationHistory', JSON.stringify(conversations));
    })
})
