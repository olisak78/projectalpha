import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { DeleteConfirmationDialog } from '../../../src/components/tabs/MePageTabs/DeleteConfirmationDialog';
import { createMockQuickLinksContext, expectDialogToBeOpen, expectDialogToBeClosed } from '../../utils/testHelpers';

// Mock UI components
vi.mock('../../../src/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open, onOpenChange }: any) => (
    <div data-testid="alert-dialog" data-open={open}>
      {open && children}
      <button data-testid="dialog-overlay" onClick={() => onOpenChange?.(false)} />
    </div>
  ),
  AlertDialogContent: ({ children }: any) => (
    <div data-testid="alert-dialog-content">{children}</div>
  ),
  AlertDialogHeader: ({ children }: any) => (
    <div data-testid="alert-dialog-header">{children}</div>
  ),
  AlertDialogTitle: ({ children }: any) => (
    <h2 data-testid="alert-dialog-title">{children}</h2>
  ),
  AlertDialogDescription: ({ children }: any) => (
    <p data-testid="alert-dialog-description">{children}</p>
  ),
  AlertDialogFooter: ({ children }: any) => (
    <div data-testid="alert-dialog-footer">{children}</div>
  ),
  AlertDialogCancel: ({ children, onClick }: any) => (
    <button data-testid="alert-dialog-cancel" onClick={onClick}>
      {children}
    </button>
  ),
  AlertDialogAction: ({ children, onClick, className }: any) => (
    <button data-testid="alert-dialog-action" onClick={onClick} className={className}>
      {children}
    </button>
  ),
}));

// Mock QuickLinksContext
const mockQuickLinksContext = createMockQuickLinksContext();

vi.mock('../../../src/contexts/QuickLinksContext', () => ({
  useQuickLinksContext: () => mockQuickLinksContext,
}));

describe('DeleteConfirmationDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuickLinksContext.deleteDialog = {
      isOpen: false,
      linkTitle: '',
      linkId: '',
    };
  });

  describe('Dialog State Management', () => {
    it('renders correctly when closed', () => {
      render(<DeleteConfirmationDialog />);
      
      expectDialogToBeClosed(screen, 'alert-dialog');
      expect(screen.queryByTestId('alert-dialog-content')).not.toBeInTheDocument();
    });

    it('renders correctly when open with all UI elements', () => {
      mockQuickLinksContext.deleteDialog = {
        isOpen: true,
        linkTitle: 'Test Link',
        linkId: '123',
      };
      
      render(<DeleteConfirmationDialog />);
      
      expectDialogToBeOpen(screen, 'alert-dialog');
      expect(screen.getByTestId('alert-dialog-content')).toBeInTheDocument();
      expect(screen.getByText('Delete Quick Link')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      
      const deleteButton = screen.getByText('Delete');
      expect(deleteButton).toBeInTheDocument();
      expect(deleteButton).toHaveClass('bg-destructive', 'text-destructive-foreground', 'hover:bg-destructive/90');
    });
  });

  describe('Content Display', () => {
    it('displays correct description with link title', () => {
      mockQuickLinksContext.deleteDialog = {
        isOpen: true,
        linkTitle: 'My Important Link',
        linkId: '123',
      };
      
      render(<DeleteConfirmationDialog />);
      
      expect(screen.getByText(
        'Are you sure you want to delete "My Important Link"? This action cannot be undone.'
      )).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    const openDialog = {
      isOpen: true,
      linkTitle: 'Test Link',
      linkId: '123',
    };

    it('handles button clicks correctly', () => {
      mockQuickLinksContext.deleteDialog = openDialog;
      render(<DeleteConfirmationDialog />);
      
      // Test Cancel button
      fireEvent.click(screen.getByText('Cancel'));
      expect(mockQuickLinksContext.handleDeleteCancel).toHaveBeenCalledTimes(1);
      
      // Test Delete button
      fireEvent.click(screen.getByText('Delete'));
      expect(mockQuickLinksContext.handleDeleteConfirm).toHaveBeenCalledTimes(1);
      
      // Test overlay click
      fireEvent.click(screen.getByTestId('dialog-overlay'));
      expect(mockQuickLinksContext.handleDeleteCancel).toHaveBeenCalledTimes(2);
    });

    it('does not call handlers when dialog is closed', () => {
      render(<DeleteConfirmationDialog />);
      
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
      expect(screen.queryByText('Delete')).not.toBeInTheDocument();
      expect(mockQuickLinksContext.handleDeleteCancel).not.toHaveBeenCalled();
      expect(mockQuickLinksContext.handleDeleteConfirm).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles various link title formats', () => {
      const testCases = [
        { title: '', expected: 'Are you sure you want to delete ""? This action cannot be undone.' },
        { title: 'Link with "quotes" & <special> chars', expected: 'Are you sure you want to delete "Link with "quotes" & <special> chars"? This action cannot be undone.' },
        { title: 'This is a very long link title that might cause layout issues if not handled properly in the dialog', expected: 'Are you sure you want to delete "This is a very long link title that might cause layout issues if not handled properly in the dialog"? This action cannot be undone.' }
      ];

      testCases.forEach(({ title, expected }) => {
        mockQuickLinksContext.deleteDialog = {
          isOpen: true,
          linkTitle: title,
          linkId: '123',
        };
        
        const { unmount } = render(<DeleteConfirmationDialog />);
        expect(screen.getByText(expected)).toBeInTheDocument();
        unmount();
      });
    });

    it('maintains state consistency during lifecycle', () => {
      const { rerender } = render(<DeleteConfirmationDialog />);
      
      // Initially closed
      expectDialogToBeClosed(screen, 'alert-dialog');
      
      // Open dialog
      mockQuickLinksContext.deleteDialog = {
        isOpen: true,
        linkTitle: 'Test Link',
        linkId: '123',
      };
      rerender(<DeleteConfirmationDialog />);
      
      expectDialogToBeOpen(screen, 'alert-dialog');
      expect(screen.getByText(/Test Link/)).toBeInTheDocument();
      
      // Close dialog
      mockQuickLinksContext.deleteDialog = {
        isOpen: false,
        linkTitle: '',
        linkId: '',
      };
      rerender(<DeleteConfirmationDialog />);
      
      expectDialogToBeClosed(screen, 'alert-dialog');
    });

    it('preserves link ID throughout dialog lifecycle', () => {
      const linkId = 'unique-link-id-123';
      
      mockQuickLinksContext.deleteDialog = {
        isOpen: true,
        linkTitle: 'Test Link',
        linkId: linkId,
      };
      
      render(<DeleteConfirmationDialog />);
      
      expect(mockQuickLinksContext.deleteDialog.linkId).toBe(linkId);
      
      fireEvent.click(screen.getByText('Delete'));
      expect(mockQuickLinksContext.handleDeleteConfirm).toHaveBeenCalledTimes(1);
    });
  });
});
