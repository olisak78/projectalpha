import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { useChatHistory } from '../../src/hooks/useChatHistory';
import { chatDB, ChatConversation, ChatMessage } from '../../src/lib/chat-db';

/**
 * useChatHistory Hook Tests
 * 
 * Tests for the useChatHistory custom hook which manages chat history
 * with IndexedDB storage, providing CRUD operations for conversations
 * and messages with automatic capacity management.
 * 
 * Hook Location: src/hooks/useChatHistory.ts
 * Dependencies: chat-db (IndexedDB wrapper)
 */

// ============================================================================
// MOCKS
// ============================================================================

// Mock the chat-db module
vi.mock('../../src/lib/chat-db', () => ({
  chatDB: {
    getAllConversations: vi.fn(),
    createConversation: vi.fn(),
    deleteConversation: vi.fn(),
    updateConversationTitle: vi.fn(),
    getConversation: vi.fn(),
    getMessages: vi.fn(),
    addMessage: vi.fn(),
    getStorageInfo: vi.fn(),
    exportData: vi.fn(),
    importData: vi.fn(),
    clearAllData: vi.fn(),
  }
}));

// ============================================================================
// TEST UTILITIES
// ============================================================================

const mockConversations: ChatConversation[] = [
  {
    id: 'conv-1',
    title: 'Test Conversation 1',
    deploymentId: 'deployment-1',
    createdAt: Date.now() - 86400000, // 1 day ago
    updatedAt: Date.now() - 86400000,
    approxBytes: 1024
  },
  {
    id: 'conv-2',
    title: 'Test Conversation 2',
    deploymentId: 'deployment-2',
    createdAt: Date.now() - 43200000, // 12 hours ago
    updatedAt: Date.now() - 43200000,
    approxBytes: 512
  }
];

const mockMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    conversationId: 'conv-1',
    role: 'user',
    content: 'Hello, how are you?',
    createdAt: Date.now() - 3600000, // 1 hour ago
    sequence: 1,
    approxBytes: 100
  },
  {
    id: 'msg-2',
    conversationId: 'conv-1',
    role: 'assistant',
    content: 'I am doing well, thank you!',
    createdAt: Date.now() - 3000000, // 50 minutes ago
    sequence: 2,
    approxBytes: 120
  }
];

const mockChatDB = chatDB as any;

/**
 * Helper function to setup default mocks
 */
function setupDefaultMocks() {
  mockChatDB.getAllConversations.mockResolvedValue(mockConversations);
  mockChatDB.createConversation.mockResolvedValue('new-conv-id');
  mockChatDB.deleteConversation.mockResolvedValue(undefined);
  mockChatDB.updateConversationTitle.mockResolvedValue(undefined);
  mockChatDB.getConversation.mockResolvedValue(mockConversations[0]);
  mockChatDB.getMessages.mockResolvedValue(mockMessages);
  mockChatDB.addMessage.mockResolvedValue(undefined);
  mockChatDB.getStorageInfo.mockResolvedValue({
    used: 1024,
    quota: 10240,
    percentage: 10
  });
  mockChatDB.exportData.mockResolvedValue(new Blob(['test data'], { type: 'application/json' }));
  mockChatDB.importData.mockResolvedValue(undefined);
  mockChatDB.clearAllData.mockResolvedValue(undefined);
}

// ============================================================================
// HOOK TESTS
// ============================================================================

describe('useChatHistory Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // INITIALIZATION TESTS
  // ==========================================================================

  describe('Initialization', () => {
    it('should initialize with loading state and load conversations', async () => {
      const { result } = renderHook(() => useChatHistory());

      // Initially loading
      expect(result.current.loading).toBe(true);
      expect(result.current.conversations).toEqual([]);
      expect(result.current.error).toBe(null);

      // Wait for loading to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.conversations).toEqual(mockConversations);
      expect(mockChatDB.getAllConversations).toHaveBeenCalledTimes(1);
    });

    it('should handle loading error', async () => {
      const errorMessage = 'Failed to load conversations';
      mockChatDB.getAllConversations.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useChatHistory());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.conversations).toEqual([]);
    });

    it('should provide all expected functions', () => {
      const { result } = renderHook(() => useChatHistory());

      expect(typeof result.current.createConversation).toBe('function');
      expect(typeof result.current.deleteConversation).toBe('function');
      expect(typeof result.current.updateConversationTitle).toBe('function');
      expect(typeof result.current.getConversation).toBe('function');
      expect(typeof result.current.getMessages).toBe('function');
      expect(typeof result.current.addMessage).toBe('function');
      expect(typeof result.current.getStorageInfo).toBe('function');
      expect(typeof result.current.exportData).toBe('function');
      expect(typeof result.current.importData).toBe('function');
      expect(typeof result.current.clearAllData).toBe('function');
      expect(typeof result.current.refresh).toBe('function');
    });
  });

  // ==========================================================================
  // CONVERSATION AND MESSAGE OPERATIONS TESTS
  // ==========================================================================

  describe('Conversation and Message Operations', () => {
    it('should handle complete conversation lifecycle', async () => {
      const { result } = renderHook(() => useChatHistory());

      // Wait for initial load
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Create conversation
      let conversationId: string = '';
      await act(async () => {
        conversationId = await result.current.createConversation('New Chat', 'deployment-3');
      });

      expect(conversationId).toBe('new-conv-id');
      expect(mockChatDB.createConversation).toHaveBeenCalledWith('New Chat', 'deployment-3');

      // Update conversation title
      await act(async () => {
        await result.current.updateConversationTitle(conversationId, 'Updated Title');
      });

      expect(mockChatDB.updateConversationTitle).toHaveBeenCalledWith(conversationId, 'Updated Title');

      // Get conversation
      let conversation: ChatConversation | undefined = undefined;
      await act(async () => {
        conversation = await result.current.getConversation(conversationId);
      });

      expect(conversation).toEqual(mockConversations[0]);

      // Delete conversation
      await act(async () => {
        await result.current.deleteConversation(conversationId);
      });

      expect(mockChatDB.deleteConversation).toHaveBeenCalledWith(conversationId);
    });

    it('should handle message operations', async () => {
      const { result } = renderHook(() => useChatHistory());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Add message
      await act(async () => {
        await result.current.addMessage('conv-1', 'user', 'Hello world');
      });

      expect(mockChatDB.addMessage).toHaveBeenCalledWith('conv-1', 'user', 'Hello world');

      // Get messages
      let messages: ChatMessage[] = [];
      await act(async () => {
        messages = await result.current.getMessages('conv-1');
      });

      expect(messages).toEqual(mockMessages);
      expect(mockChatDB.getMessages).toHaveBeenCalledWith('conv-1');
    });

    it('should handle create conversation errors', async () => {
      const errorMessage = 'Failed to create conversation';
      mockChatDB.createConversation.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useChatHistory());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      await act(async () => {
        await expect(
          result.current.createConversation('New Chat', 'deployment-3')
        ).rejects.toThrow(errorMessage);
      });

      expect(result.current.error).toBe(errorMessage);
    });

    it('should handle delete conversation errors', async () => {
      const errorMessage = 'Failed to delete conversation';
      mockChatDB.deleteConversation.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useChatHistory());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      await act(async () => {
        await expect(
          result.current.deleteConversation('conv-1')
        ).rejects.toThrow(errorMessage);
      });

      expect(result.current.error).toBe(errorMessage);
    });

    it('should handle update conversation title errors', async () => {
      const errorMessage = 'Failed to update conversation';
      mockChatDB.updateConversationTitle.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useChatHistory());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      await act(async () => {
        await expect(
          result.current.updateConversationTitle('conv-1', 'New Title')
        ).rejects.toThrow(errorMessage);
      });

      expect(result.current.error).toBe(errorMessage);
    });

    it('should handle get conversation errors', async () => {
      const errorMessage = 'Failed to get conversation';
      mockChatDB.getConversation.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useChatHistory());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      await act(async () => {
        await expect(
          result.current.getConversation('conv-1')
        ).rejects.toThrow(errorMessage);
      });

      expect(result.current.error).toBe(errorMessage);
    });

    it('should handle get messages errors', async () => {
      const errorMessage = 'Failed to get messages';
      mockChatDB.getMessages.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useChatHistory());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      await act(async () => {
        await expect(
          result.current.getMessages('conv-1')
        ).rejects.toThrow(errorMessage);
      });

      expect(result.current.error).toBe(errorMessage);
    });

    it('should handle add message errors', async () => {
      const errorMessage = 'Failed to add message';
      mockChatDB.addMessage.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useChatHistory());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      await act(async () => {
        await expect(
          result.current.addMessage('conv-1', 'user', 'Hello')
        ).rejects.toThrow(errorMessage);
      });

      expect(result.current.error).toBe(errorMessage);
    });
  });

  // ==========================================================================
  // STORAGE MANAGEMENT TESTS
  // ==========================================================================

  describe('Storage Management', () => {
    it('should get storage information', async () => {
      const { result } = renderHook(() => useChatHistory());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      let storageInfo: any = null;

      await act(async () => {
        storageInfo = await result.current.getStorageInfo();
      });

      expect(storageInfo).toEqual({
        used: 1024,
        quota: 10240,
        percentage: 10
      });
      expect(mockChatDB.getStorageInfo).toHaveBeenCalled();
    });

    it('should handle storage info error gracefully', async () => {
      mockChatDB.getStorageInfo.mockRejectedValue(new Error('Storage error'));

      const { result } = renderHook(() => useChatHistory());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      let storageInfo: any = null;

      await act(async () => {
        storageInfo = await result.current.getStorageInfo();
      });

      expect(storageInfo).toBe(null);
    });

    it('should export data', async () => {
      const { result } = renderHook(() => useChatHistory());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      let blob: Blob = new Blob();

      await act(async () => {
        blob = await result.current.exportData();
      });

      expect(blob).toBeInstanceOf(Blob);
      expect(mockChatDB.exportData).toHaveBeenCalled();
    });

    it('should import data and refresh conversations', async () => {
      const { result } = renderHook(() => useChatHistory());
      const mockFile = new File(['test data'], 'chat-history.json', { type: 'application/json' });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      await act(async () => {
        await result.current.importData(mockFile);
      });

      expect(mockChatDB.importData).toHaveBeenCalledWith(mockFile);
      expect(mockChatDB.getAllConversations).toHaveBeenCalledTimes(2); // Initial + refresh
    });

    it('should clear all data and refresh conversations', async () => {
      const { result } = renderHook(() => useChatHistory());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      await act(async () => {
        await result.current.clearAllData();
      });

      expect(mockChatDB.clearAllData).toHaveBeenCalled();
      expect(mockChatDB.getAllConversations).toHaveBeenCalledTimes(2);
    });

    it('should handle export data errors', async () => {
      const errorMessage = 'Failed to export data';
      mockChatDB.exportData.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useChatHistory());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      await act(async () => {
        await expect(
          result.current.exportData()
        ).rejects.toThrow(errorMessage);
      });

      expect(result.current.error).toBe(errorMessage);
    });

    it('should handle import data errors', async () => {
      const errorMessage = 'Failed to import data';
      mockChatDB.importData.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useChatHistory());
      const mockFile = new File(['test data'], 'chat-history.json', { type: 'application/json' });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      await act(async () => {
        await expect(
          result.current.importData(mockFile)
        ).rejects.toThrow(errorMessage);
      });

      expect(result.current.error).toBe(errorMessage);
    });

    it('should handle clear all data errors', async () => {
      const errorMessage = 'Failed to clear data';
      mockChatDB.clearAllData.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useChatHistory());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      await act(async () => {
        await expect(
          result.current.clearAllData()
        ).rejects.toThrow(errorMessage);
      });

      expect(result.current.error).toBe(errorMessage);
    });
  });

  // ==========================================================================
  // REFRESH FUNCTIONALITY TESTS
  // ==========================================================================

  describe('Refresh Functionality', () => {
    it('should refresh conversations list', async () => {
      const { result } = renderHook(() => useChatHistory());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Clear the mock to count only refresh calls
      mockChatDB.getAllConversations.mockClear();

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockChatDB.getAllConversations).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // ERROR HANDLING TESTS
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle non-Error objects in catch blocks', async () => {
      mockChatDB.createConversation.mockRejectedValue('String error');

      const { result } = renderHook(() => useChatHistory());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      await act(async () => {
        await expect(
          result.current.createConversation('New Chat', 'deployment-3')
        ).rejects.toBe('String error');
      });

      expect(result.current.error).toBe('Failed to create conversation');
    });

    it('should reset error state on successful operations', async () => {
      // First, cause an error
      mockChatDB.getAllConversations.mockRejectedValueOnce(new Error('Initial error'));

      const { result } = renderHook(() => useChatHistory());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBe('Initial error');

      // Now make it succeed
      mockChatDB.getAllConversations.mockResolvedValue(mockConversations);

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error).toBe(null);
      expect(result.current.conversations).toEqual(mockConversations);
    });
  });

  // ==========================================================================
  // INTEGRATION TESTS
  // ==========================================================================

  describe('Integration Tests', () => {
    it('should handle complete conversation lifecycle', async () => {
      const { result } = renderHook(() => useChatHistory());

      // Wait for initial load
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.conversations).toEqual(mockConversations);

      // Create conversation
      let newConversationId: string = '';
      await act(async () => {
        newConversationId = await result.current.createConversation('Test Chat', 'deployment-1');
      });

      expect(newConversationId).toBe('new-conv-id');

      // Add messages
      await act(async () => {
        await result.current.addMessage(newConversationId, 'user', 'Hello');
        await result.current.addMessage(newConversationId, 'assistant', 'Hi there!');
      });

      // Get messages
      let messages: ChatMessage[] = [];
      await act(async () => {
        messages = await result.current.getMessages(newConversationId);
      });

      expect(messages).toEqual(mockMessages);

      // Update title
      await act(async () => {
        await result.current.updateConversationTitle(newConversationId, 'Updated Chat');
      });

      // Delete conversation
      await act(async () => {
        await result.current.deleteConversation(newConversationId);
      });

      // Verify all operations were called
      expect(mockChatDB.createConversation).toHaveBeenCalledWith('Test Chat', 'deployment-1');
      expect(mockChatDB.addMessage).toHaveBeenCalledTimes(2);
      expect(mockChatDB.getMessages).toHaveBeenCalledWith(newConversationId);
      expect(mockChatDB.updateConversationTitle).toHaveBeenCalledWith(newConversationId, 'Updated Chat');
      expect(mockChatDB.deleteConversation).toHaveBeenCalledWith(newConversationId);
    });
  });
});
