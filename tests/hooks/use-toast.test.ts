import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { useToast, toast, reducer } from '../../src/hooks/use-toast';
import type { ToastActionElement, ToastProps } from '../../src/components/ui/toast';

/**
 * useToast Hook Tests
 * 
 * Tests for the useToast custom hook which manages toast notifications
 * using a reducer pattern with global state management.
 * 
 * Hook Location: src/hooks/use-toast.ts
 * Features: Add, update, dismiss, and remove toast notifications
 */

// ============================================================================
// TEST UTILITIES
// ============================================================================

// Mock setTimeout and clearTimeout for testing timeouts
vi.useFakeTimers();

const mockToastAction: ToastActionElement = {
  altText: 'Undo',
  onClick: vi.fn(),
  children: 'Undo'
} as any;

/**
 * Helper function to create a mock toast
 */
function createMockToast(overrides: Partial<ToastProps> = {}) {
  return {
    title: 'Test Toast',
    description: 'Test description',
    variant: 'default' as const,
    ...overrides
  };
}

// ============================================================================
// REDUCER TESTS
// ============================================================================

describe('toast reducer', () => {
  const initialState = { toasts: [] };

  it('should handle all toast actions correctly', () => {
    // Test ADD_TOAST with limit
    const toast1 = { id: '1', title: 'Toast 1' };
    const toast2 = { id: '2', title: 'Toast 2' };
    
    let state = reducer(initialState, { type: 'ADD_TOAST', toast: toast1 });
    expect(state.toasts).toHaveLength(1);
    expect(state.toasts[0]).toEqual(toast1);
    
    // Should respect TOAST_LIMIT (1)
    state = reducer(state, { type: 'ADD_TOAST', toast: toast2 });
    expect(state.toasts).toHaveLength(1);
    expect(state.toasts[0]).toEqual(toast2);
    
    // Test UPDATE_TOAST
    const updatedToast = { id: '2', title: 'Updated Toast' };
    state = reducer(state, { type: 'UPDATE_TOAST', toast: updatedToast });
    expect(state.toasts[0].title).toBe('Updated Toast');
    
    // Test DISMISS_TOAST
    state = reducer(state, { type: 'DISMISS_TOAST', toastId: '2' });
    expect(state.toasts[0].open).toBe(false);
    
    // Test REMOVE_TOAST
    state = reducer(state, { type: 'REMOVE_TOAST', toastId: '2' });
    expect(state.toasts).toHaveLength(0);
  });
});

// ============================================================================
// USETOAST HOOK TESTS
// ============================================================================

describe('useToast Hook', () => {
  beforeEach(() => {
    vi.clearAllTimers();
    // Reset global toast state by clearing all toasts
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.dismiss(); // Dismiss all toasts
    });
    act(() => {
      vi.advanceTimersByTime(1000000); // Fast-forward to remove all toasts
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should provide toast management functions', () => {
    const { result } = renderHook(() => useToast());

    expect(typeof result.current.toast).toBe('function');
    expect(typeof result.current.dismiss).toBe('function');
    expect(Array.isArray(result.current.toasts)).toBe(true);
  });

  it('should handle complete toast lifecycle and management', () => {
    const { result } = renderHook(() => useToast());

    // Create toast
    let toastId: string;
    act(() => {
      const toastResult = result.current.toast({
        title: 'Test Toast',
        description: 'Test description',
        variant: 'destructive',
        action: mockToastAction
      });
      toastId = toastResult.id;
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Test Toast');
    expect(result.current.toasts[0].open).toBe(true);
    expect(result.current.toasts[0].variant).toBe('destructive');
    expect(result.current.toasts[0].action).toEqual(mockToastAction);

    // Dismiss specific toast
    act(() => {
      result.current.dismiss(toastId);
    });
    expect(result.current.toasts[0].open).toBe(false);

    // Test dismiss all
    act(() => {
      result.current.toast({ title: 'Toast 2' });
    });
    act(() => {
      result.current.dismiss(); // No ID = dismiss all
    });
    expect(result.current.toasts[0].open).toBe(false);
  });

  it('should synchronize state across multiple hook instances', () => {
    const { result: result1 } = renderHook(() => useToast());
    const { result: result2 } = renderHook(() => useToast());

    act(() => {
      result1.current.toast({ title: 'Shared Toast' });
    });

    // Both hooks should see the same toast
    expect(result1.current.toasts).toHaveLength(1);
    expect(result2.current.toasts).toHaveLength(1);
    expect(result1.current.toasts[0].title).toBe('Shared Toast');
    expect(result2.current.toasts[0].title).toBe('Shared Toast');
  });

  it('should cleanup listeners on unmount', () => {
    const { result, unmount } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: 'Test Toast' });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(() => unmount()).not.toThrow();
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Toast Integration', () => {
  it('should handle complete toast lifecycle with update and onOpenChange', () => {
    const { result } = renderHook(() => useToast());

    let toastResult: ReturnType<typeof toast>;

    // Create toast
    act(() => {
      toastResult = result.current.toast({
        title: 'Lifecycle Toast',
        description: 'Testing complete lifecycle'
      });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].open).toBe(true);

    // Update toast
    act(() => {
      toastResult.update({
        id: toastResult.id,
        title: 'Updated Lifecycle Toast'
      });
    });

    expect(result.current.toasts[0].title).toBe('Updated Lifecycle Toast');

    // Test onOpenChange callback
    const toastInstance = result.current.toasts[0];
    expect(toastInstance.onOpenChange).toBeDefined();

    act(() => {
      toastInstance.onOpenChange?.(false);
    });

    expect(result.current.toasts[0].open).toBe(false);

    // Fast-forward time to trigger removal
    act(() => {
      vi.advanceTimersByTime(1000000);
    });

    expect(result.current.toasts).toHaveLength(0);
  });
});
