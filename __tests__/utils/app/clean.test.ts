import { describe, it, beforeEach, expect, vi } from 'vitest'
import { cleanSelectedConversation, cleanConversationHistory } from '../../../utils/app/clean'
import { Conversation, } from '../../../types/chat'
import { OpenAIModels, OpenAIModelID } from '../../../types/openai'
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '../../../utils/app/const'

let tempConversation: Conversation = {
    id: '1',
    model: undefined,
    prompt: '',
    messages: [],
    folderId: '',
    temperature: 0
}
let tempHistory: Conversation[] = []

beforeEach(() => {
    // initialized with minimum properties for a "Conversation" type
    tempConversation = {
        id: '1',
        model: undefined,
        prompt: '',
        messages: [],
        folderId: '',
        temperature: 0
    }

    tempHistory = [
        { ...tempConversation },
        { ...tempConversation, id: '2' },
        { ...tempConversation, id: '3' }
    ]
    tempHistory.reduce((item) => {
        item.model = undefined;
        return item
    })
})

describe('Conversation tests', () => {

    it('cleans single conversation correctly', () => {
        const result: Conversation = cleanSelectedConversation(tempConversation)

        expect(result.model).toBe(OpenAIModels[OpenAIModelID.GPT_3_5])
        expect(result.prompt).toBe(DEFAULT_SYSTEM_PROMPT)
        expect(result.temperature).toBe(DEFAULT_TEMPERATURE)
        expect(result.folderId).toBe(null)
        expect(result.messages).toStrictEqual([])
    })

    it('cleans conversation history with valid array correctly', () => {
        const result: Conversation[] = cleanConversationHistory(tempHistory.reduce((item) => {
            item.model = undefined;
            return item
        }))

        for (const {folderId, model, prompt, temperature, messages} in result) {
            expect(model).toBe(OpenAIModels[OpenAIModelID.GPT_3_5])
            expect(prompt).toBe(DEFAULT_SYSTEM_PROMPT)
            expect(temperature).toBe(DEFAULT_TEMPERATURE)
            expect(folderId).toBe(null)
            expect(messages).toStrictEqual([])
        }
    })

    it('returns an empty array when a non-array input is used for cleaning conversation history', () => {
        const result = cleanConversationHistory('this is not an array')

        expect(result).toStrictEqual([])
    })

    it('invalid conversation types are removed during clean', () => {
        tempHistory[1] = 'this is not a conversation'
        expect(tempHistory.length).toEqual(3);

        const originalWarn = console.warn;
        console.warn = vi.fn();

        let cleanHistory: Conversation[] = cleanConversationHistory(tempHistory)
        expect(console.warn).toBeCalledTimes(1);
        expect(cleanHistory.length).toEqual(2);

        console.warn = originalWarn;
    })
})
