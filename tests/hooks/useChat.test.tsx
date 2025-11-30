import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Import the hook to test
import { useChat } from '../../src/features/ai-arena/hooks/useChat';

// Import types
import type { Conversation, Message, ChatSettings } from '../../src/features/ai-arena/types/chat';
import type { ChatInferenceResponse } from '../../src/services/aiPlatformApi';

// Mock dependencies
vi.mock('../../src/services/aiPlatformApi', () => ({
  useChatInference: vi.fn(),
}));

vi.mock('../../src/lib/chat-db', () => ({
  chatDB: {
    createConversation: vi.fn(),
    getAllConversations: vi.fn(),
    getMessages: vi.fn(),
    deleteConversation: vi.fn(),
    updateConversationTitle: vi.fn(),
    addMessage: vi.fn(),
    updateMessage: vi.fn(),
  },
}));

// Import mocked modules
import { useChatInference } from '../../src/services/aiPlatformApi';
import { chatDB } from '../../src/lib/chat-db';

// Cast to mock functions
const mockUseChatInference = useChatInference as ReturnType<typeof vi.fn>;
const mockChatDB = chatDB as {
  createConversation: ReturnType<typeof vi.fn>;
  getAllConversations: ReturnType<typeof vi.fn>;
  getMessages: ReturnType<typeof vi.fn>;
  deleteConversation: ReturnType<typeof vi.fn>;
  updateConversationTitle: ReturnType<typeof vi.fn>;
  addMessage: ReturnType<typeof vi.fn>;
  updateMessage: ReturnType<typeof vi.fn>;
};

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });
Object.defineProperty(global, 'crypto', {
  value: { randomUUID: () => `mock-uuid-${Date.now()}-${Math.random()}` },
});

// Mock console methods
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

// Mock atob for file decoding tests
Object.defineProperty(global, 'atob', {
  value: vi.fn((str: string) => Buffer.from(str, 'base64').toString('binary')),
  writable: true,
});

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// Mock data factories
const createMockConversation = (overrides?: Partial<Conversation>): Conversation => ({
  id: 'conv-123',
  title: 'Test Conversation',
  messages: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

const createMockMessage = (overrides?: Partial<Message>): Message => ({
  id: 'msg-123',
  role: 'user',
  content: 'Test message',
  createdAt: Date.now(),
  ...overrides,
});

const createMockChatInferenceResponse = (overrides?: Partial<ChatInferenceResponse>): ChatInferenceResponse => ({
  id: 'response-123',
  object: 'chat.completion',
  created: Date.now(),
  model: 'gpt-4',
  choices: [{
    index: 0,
    message: { role: 'assistant', content: 'Test response' },
    finish_reason: 'stop',
  }],
  usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
  ...overrides,
});

const setupDefaultMocks = () => {
  const mockMutateAsync = vi.fn();
  const mockMutate = vi.fn();

  mockUseChatInference.mockReturnValue({
    mutateAsync: mockMutateAsync,
    mutate: mockMutate,
    isPending: false,
    error: null,
  });

  mockChatDB.createConversation.mockResolvedValue('new-conv-id');
  mockChatDB.getAllConversations.mockResolvedValue([]);
  mockChatDB.getMessages.mockResolvedValue([]);
  mockChatDB.deleteConversation.mockResolvedValue(undefined);
  mockChatDB.updateConversationTitle.mockResolvedValue(undefined);
  mockChatDB.addMessage.mockResolvedValue('new-msg-id');
  mockChatDB.updateMessage.mockResolvedValue(undefined);

  return { mockMutateAsync, mockMutate };
};

// ============================================================================
// TESTS
// ============================================================================

describe('useChat Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setupDefaultMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization and State Management', () => {
    it('should initialize with default state and load conversations', async () => {
      const { result } = renderHook(() => useChat(), { wrapper: createWrapper() });

      expect(result.current.conversations).toEqual([]);
      expect(result.current.active).toBe(null);
      expect(result.current.settings).toEqual({
        model: "GPT-4",
        temperature: 0.7,
        maxTokens: 2048,
        systemPrompt: expect.stringContaining('You are a helpful SAP assistant'),
      });

      await waitFor(() => expect(mockChatDB.getAllConversations).toHaveBeenCalled());
    });

    it('should handle data loading and migration', async () => {
      // Test IndexedDB loading
      const mockConversations = [createMockConversation({ id: 'conv-1', title: 'Conv 1' })];
      mockChatDB.getAllConversations.mockResolvedValue(mockConversations);
      mockChatDB.getMessages.mockResolvedValue([createMockMessage()]);

      const { result } = renderHook(() => useChat(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.conversations).toHaveLength(1));
      expect(result.current.activeId).toBe('conv-1');

      // Test migration - clear mocks first and set up fresh localStorage
      vi.clearAllMocks();
      localStorage.clear();
      const legacyConversations = [{
        id: 'legacy-conv-1',
        title: 'Legacy Conversation',
        messages: [{ id: 'legacy-msg-1', role: 'user', content: 'Legacy message' }],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }];
      localStorage.setItem('ai_arena_conversations_v1', JSON.stringify(legacyConversations));
      // Remove migration flag to trigger migration
      localStorage.removeItem('ai_arena_migrated_to_indexeddb');
      
      mockChatDB.getAllConversations.mockResolvedValue([]);
      mockChatDB.createConversation.mockResolvedValue('migrated-conv-id');
      mockChatDB.addMessage.mockResolvedValue('migrated-msg-id');

      const { result: migrationResult } = renderHook(() => useChat(), { wrapper: createWrapper() });
      
      // Wait for migration to complete
      await waitFor(() => {
        expect(mockChatDB.createConversation).toHaveBeenCalledWith('Legacy Conversation', 'unknown');
      }, { timeout: 2000 });
    });
  });

  describe('Settings Management', () => {
    it('should load settings from localStorage', () => {
      const customSettings = {
        model: 'GPT-3.5',
        temperature: 0.5,
        maxTokens: 1024,
        systemPrompt: 'Custom prompt',
        deploymentId: 'deployment-123',
      };
      localStorage.setItem('ai_arena_settings_v1', JSON.stringify(customSettings));

      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      // The hook upgrades old system prompts, so we check individual properties
      expect(result.current.settings.model).toBe('GPT-3.5');
      expect(result.current.settings.temperature).toBe(0.5);
      expect(result.current.settings.maxTokens).toBe(1024);
      expect(result.current.settings.deploymentId).toBe('deployment-123');
      // System prompt gets upgraded automatically
      expect(result.current.settings.systemPrompt).toContain('IMPORTANT FORMATTING RULES');
    });

    it('should update settings and save to localStorage', () => {
      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.updateSettings({
          temperature: 0.9,
          deploymentId: 'new-deployment',
        });
      });

      expect(result.current.settings.temperature).toBe(0.9);
      expect(result.current.settings.deploymentId).toBe('new-deployment');

      const stored = localStorage.getItem('ai_arena_settings_v1');
      expect(stored).toBeTruthy();
      const parsedSettings = JSON.parse(stored!);
      expect(parsedSettings.temperature).toBe(0.9);
      expect(parsedSettings.deploymentId).toBe('new-deployment');
    });

    it('should reset settings to defaults', () => {
      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      // First update settings
      act(() => {
        result.current.updateSettings({ temperature: 0.9 });
      });

      // Then reset
      act(() => {
        result.current.resetSettings();
      });

      expect(result.current.settings).toEqual({
        model: "GPT-4",
        temperature: 0.7,
        maxTokens: 2048,
        systemPrompt: expect.stringContaining('You are a helpful SAP assistant'),
      });
    });

    it('should upgrade old system prompt format', () => {
      const oldSettings = {
        model: 'GPT-4',
        temperature: 0.7,
        maxTokens: 2048,
        systemPrompt: 'Old prompt without formatting rules',
      };
      localStorage.setItem('ai_arena_settings_v1', JSON.stringify(oldSettings));

      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      expect(result.current.settings.systemPrompt).toContain('IMPORTANT FORMATTING RULES');
      expect(result.current.settings.systemPrompt).toContain('Go/Golang');
    });
  });

  describe('Conversation Management', () => {
    it('should create, delete, rename conversations and handle errors', async () => {
      const { result } = renderHook(() => useChat(), { wrapper: createWrapper() });

      // Wait for initial load to complete
      await waitFor(() => expect(result.current.conversations).toEqual([]));

      // Test creation with custom title
      await act(async () => {
        await result.current.createConversation('New Test Chat');
      });
      
      await waitFor(() => {
        expect(result.current.conversations).toHaveLength(1);
        expect(result.current.conversations[0].title).toBe('New Test Chat');
        expect(result.current.activeId).toBe('new-conv-id');
      });
      expect(mockChatDB.createConversation).toHaveBeenCalledWith('New Test Chat', 'unknown');

      // Test creation with default title
      await act(async () => {
        await result.current.createConversation();
      });
      expect(mockChatDB.createConversation).toHaveBeenCalledWith('New Chat', 'unknown');

      // Test rename
      const mockConversations = [createMockConversation({ id: 'conv-to-rename', title: 'Old Title' })];
      mockChatDB.getAllConversations.mockResolvedValue(mockConversations);
      
      const { result: renameResult } = renderHook(() => useChat(), { wrapper: createWrapper() });
      await waitFor(() => expect(renameResult.current.conversations).toHaveLength(1));

      await act(async () => {
        await renameResult.current.renameConversation('conv-to-rename', 'New Title');
      });
      expect(mockChatDB.updateConversationTitle).toHaveBeenCalledWith('conv-to-rename', 'New Title');
      expect(renameResult.current.conversations[0].title).toBe('New Title');

      // Test delete
      await act(async () => {
        await renameResult.current.deleteConversation('conv-to-rename');
      });
      expect(mockChatDB.deleteConversation).toHaveBeenCalledWith('conv-to-rename');
      expect(renameResult.current.conversations).toHaveLength(0);
      expect(renameResult.current.activeId).toBe(null);

      // Test set active
      act(() => {
        result.current.setActive('conv-456');
      });
      expect(result.current.activeId).toBe('conv-456');
    });

    it('should handle conversation operation errors', async () => {
      const { result } = renderHook(() => useChat(), { wrapper: createWrapper() });

      // Test creation error - just verify it doesn't crash
      mockChatDB.createConversation.mockRejectedValue(new Error('Creation failed'));
      await act(async () => {
        await result.current.createConversation('Test Chat');
      });
      // Verify state remains stable after error
      expect(result.current.conversations).toEqual([]);

      // Test deletion error - just verify it doesn't crash
      mockChatDB.deleteConversation.mockRejectedValue(new Error('Deletion failed'));
      await act(async () => {
        await result.current.deleteConversation('conv-123');
      });
      expect(result.current.conversations).toEqual([]);

      // Test rename error - just verify it doesn't crash
      mockChatDB.updateConversationTitle.mockRejectedValue(new Error('Rename failed'));
      await act(async () => {
        await result.current.renameConversation('conv-123', 'New Title');
      });
      expect(result.current.conversations).toEqual([]);
    });
  });

  describe('Message Sending and Streaming', () => {
    it('should send a message and handle streaming response', async () => {
      const { mockMutateAsync } = setupDefaultMocks();
      
      // Mock streaming response
      const mockResponse = createMockChatInferenceResponse({
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Streamed response' },
          finish_reason: 'stop',
        }],
      });

      mockMutateAsync.mockImplementation(async (request) => {
        // Simulate streaming by calling onChunk
        if (request.onChunk) {
          request.onChunk('Partial ');
          request.onChunk('Partial response');
          request.onChunk('Streamed response');
        }
        return mockResponse;
      });

      // Set up settings with deployment ID
      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.updateSettings({ deploymentId: 'deployment-123' });
      });

      await act(async () => {
        await result.current.send('Hello, AI!');
      });

      expect(mockChatDB.createConversation).toHaveBeenCalledWith('Hello, AI!', 'deployment-123');
      expect(mockChatDB.addMessage).toHaveBeenCalledWith('new-conv-id', 'user', 'Hello, AI!');
      expect(mockChatDB.addMessage).toHaveBeenCalledWith('new-conv-id', 'assistant', 'Streamed response');

      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          deploymentId: 'deployment-123',
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user', content: 'Hello, AI!' }),
          ]),
          stream: true,
          onChunk: expect.any(Function),
        })
      );
    });

    it('should not send message without deployment ID', async () => {
      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.send('Hello, AI!');
      });

      // Just verify no message was added to DB - the hook handles this gracefully
      expect(mockChatDB.addMessage).not.toHaveBeenCalled();
    });

    it('should handle message sending errors', async () => {
      const { mockMutateAsync } = setupDefaultMocks();
      mockMutateAsync.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.updateSettings({ deploymentId: 'deployment-123' });
      });

      await act(async () => {
        await result.current.send('Hello, AI!');
      });

      // Just verify error message was added to DB - the hook handles errors gracefully
      expect(mockChatDB.addMessage).toHaveBeenCalledWith(
        'new-conv-id',
        'assistant',
        'Sorry, I encountered an error processing your request. Please try again.'
      );
    });

    it('should send message to existing conversation', async () => {
      const { mockMutateAsync } = setupDefaultMocks();
      const mockResponse = createMockChatInferenceResponse();
      mockMutateAsync.mockResolvedValue(mockResponse);

      // Set up existing conversation
      const existingConv = createMockConversation({ id: 'existing-conv' });
      const existingMessages = [createMockMessage({ id: 'existing-msg' })];
      mockChatDB.getAllConversations.mockResolvedValue([existingConv]);
      mockChatDB.getMessages.mockResolvedValue(existingMessages);

      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.conversations).toHaveLength(1);
      });

      act(() => {
        result.current.updateSettings({ deploymentId: 'deployment-123' });
        result.current.setActive('existing-conv');
      });

      await act(async () => {
        await result.current.send('New message');
      });

      expect(mockChatDB.addMessage).toHaveBeenCalledWith('existing-conv', 'user', 'New message');
      expect(mockChatDB.createConversation).not.toHaveBeenCalled(); // Should not create new conversation
    });

    it('should handle multimodal content with attachments', async () => {
      const { mockMutateAsync } = setupDefaultMocks();
      const mockResponse = createMockChatInferenceResponse();
      mockMutateAsync.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.updateSettings({ deploymentId: 'deployment-123' });
      });

      const attachments = [
        {
          url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
          mimeType: 'image/png',
          filename: 'test.png',
          size: 100,
        },
        {
          url: 'data:text/plain;base64,SGVsbG8gV29ybGQ=',
          mimeType: 'text/plain',
          filename: 'test.txt',
          size: 50,
        },
      ];

      await act(async () => {
        await result.current.send('Analyze this image and text', attachments);
      });

      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.arrayContaining([
                expect.objectContaining({ type: 'text', text: 'Analyze this image and text' }),
                expect.objectContaining({ type: 'image_url' }),
                expect.objectContaining({ type: 'text', text: expect.stringContaining('[File: test.txt]') }),
              ]),
            }),
          ]),
        })
      );
    });

    it('should create new conversation when sending first message', async () => {
      const { mockMutateAsync } = setupDefaultMocks();
      const mockResponse = createMockChatInferenceResponse();
      mockMutateAsync.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.updateSettings({ deploymentId: 'deployment-123' });
      });

      await act(async () => {
        await result.current.send('Hello, AI!');
      });

      // Verify conversation was created and message was sent
      expect(mockChatDB.createConversation).toHaveBeenCalledWith('Hello, AI!', 'deployment-123');
      expect(mockChatDB.addMessage).toHaveBeenCalledWith('new-conv-id', 'user', 'Hello, AI!');
    });
  });

  describe('Message Regeneration', () => {
    it('should regenerate the last assistant message', async () => {
      const { mockMutateAsync } = setupDefaultMocks();
      const mockResponse = createMockChatInferenceResponse({
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Regenerated response' },
          finish_reason: 'stop',
        }],
      });

      mockMutateAsync.mockImplementation(async (request) => {
        if (request.onChunk) {
          request.onChunk('Regenerated response');
        }
        return mockResponse;
      });

      // Set up conversation with messages
      const conversation = createMockConversation({
        id: 'conv-with-messages',
        messages: [
          createMockMessage({ id: 'user-msg', role: 'user', content: 'User message' }),
          createMockMessage({ id: 'assistant-msg', role: 'assistant', content: 'Original response' }),
        ],
      });

      mockChatDB.getAllConversations.mockResolvedValue([conversation]);
      mockChatDB.getMessages.mockResolvedValue(conversation.messages);

      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.conversations).toHaveLength(1);
      });

      act(() => {
        result.current.updateSettings({ deploymentId: 'deployment-123' });
        result.current.setActive('conv-with-messages');
      });

      await act(async () => {
        await result.current.regenerate();
      });

      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user', content: 'User message' }),
          ]),
        })
      );

      expect(mockChatDB.updateMessage).toHaveBeenCalledWith(
        'assistant-msg',
        expect.objectContaining({
          content: 'Regenerated response',
          meta: expect.objectContaining({
            alternatives: ['Original response', 'Regenerated response'],
            currentAlternativeIndex: 1,
          }),
        })
      );
    });

    it('should not regenerate without active conversation', async () => {
      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.regenerate();
      });

      expect(mockChatDB.updateMessage).not.toHaveBeenCalled();
    });

    it('should not regenerate without deployment ID', async () => {
      // Set up conversation with messages
      const conversation = createMockConversation({
        id: 'conv-with-messages',
        messages: [
          createMockMessage({ id: 'assistant-msg', role: 'assistant', content: 'Original response' }),
        ],
      });

      mockChatDB.getAllConversations.mockResolvedValue([conversation]);
      mockChatDB.getMessages.mockResolvedValue(conversation.messages);

      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.conversations).toHaveLength(1);
      });

      act(() => {
        result.current.setActive('conv-with-messages');
      });

      await act(async () => {
        await result.current.regenerate();
      });

      expect(mockChatDB.updateMessage).not.toHaveBeenCalled();
    });

    it('should handle regeneration errors gracefully', async () => {
      const { mockMutateAsync } = setupDefaultMocks();
      mockMutateAsync.mockRejectedValue(new Error('Regeneration failed'));

      // Set up conversation with messages
      const conversation = createMockConversation({
        id: 'conv-with-messages',
        messages: [
          createMockMessage({ id: 'assistant-msg', role: 'assistant', content: 'Original response' }),
        ],
      });

      mockChatDB.getAllConversations.mockResolvedValue([conversation]);
      mockChatDB.getMessages.mockResolvedValue(conversation.messages);

      const { result } = renderHook(() => useChat(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.conversations).toHaveLength(1);
      });

      act(() => {
        result.current.updateSettings({ deploymentId: 'deployment-123' });
        result.current.setActive('conv-with-messages');
      });

      await act(async () => {
        await result.current.regenerate();
      });

      // Just verify the hook doesn't crash on error - error handling is graceful
      expect(result.current.conversations).toHaveLength(1);
    });
  });

  describe('Alternative Navigation', () => {

    it('should handle navigation edge cases', async () => {
      const { result } = renderHook(() => useChat(), { wrapper: createWrapper() });

      // Test without active conversation
      act(() => {
        result.current.navigateAlternative('msg-123', 'next');
      });
      expect(mockChatDB.updateMessage).not.toHaveBeenCalled();

      // Test message without alternatives
      const messageWithoutAlternatives = createMockMessage({
        id: 'msg-without-alternatives',
        content: 'Only response',
      });
      const conversation = createMockConversation({
        id: 'conv-without-alternatives',
        messages: [messageWithoutAlternatives],
      });
      mockChatDB.getAllConversations.mockResolvedValue([conversation]);
      mockChatDB.getMessages.mockResolvedValue([messageWithoutAlternatives]);

      const { result: noAltResult } = renderHook(() => useChat(), { wrapper: createWrapper() });
      await waitFor(() => expect(noAltResult.current.conversations).toHaveLength(1));

      act(() => {
        noAltResult.current.setActive('conv-without-alternatives');
        noAltResult.current.navigateAlternative('msg-without-alternatives', 'next');
      });
      expect(mockChatDB.updateMessage).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Integration', () => {


    it('should handle performance scenarios and large datasets', async () => {
      // Test large number of conversations
      const largeConversationList = Array.from({ length: 50 }, (_, i) =>
        createMockConversation({ id: `conv-${i}`, title: `Conversation ${i}` })
      );
      mockChatDB.getAllConversations.mockResolvedValue(largeConversationList);
      mockChatDB.getMessages.mockResolvedValue([]);

      const { result } = renderHook(() => useChat(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.conversations).toHaveLength(50));
      expect(result.current.activeId).toBe('conv-0');

      // Test conversation with many messages
      const manyMessages = Array.from({ length: 20 }, (_, i) =>
        createMockMessage({ 
          id: `msg-${i}`, 
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`,
        })
      );
      const conversationWithManyMessages = createMockConversation({
        id: 'conv-with-many-messages',
        messages: manyMessages,
      });
      mockChatDB.getAllConversations.mockResolvedValue([conversationWithManyMessages]);
      mockChatDB.getMessages.mockResolvedValue(manyMessages);

      const { result: messageResult } = renderHook(() => useChat(), { wrapper: createWrapper() });
      await waitFor(() => expect(messageResult.current.conversations).toHaveLength(1));
      expect(messageResult.current.messages).toHaveLength(20);
    });
  });
});
