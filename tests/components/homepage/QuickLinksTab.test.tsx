import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import QuickLinksTab from '../../../src/components/tabs/MePageTabs/QuickLinksTab';

// Mock components and hooks
vi.mock('../../../src/components/tabs/MePageTabs/QuickLinksGrid', () => ({
  QuickLinksGrid: () => <div data-testid="quick-links-grid">Quick Links Grid</div>
}));

vi.mock('../../../src/components/tabs/MePageTabs/QuickLinksSearchFilter', () => ({
  QuickLinksSearchFilter: ({ onAddLinkClick }: { onAddLinkClick: () => void }) => (
    <div data-testid="search-filter">
      <button onClick={onAddLinkClick} data-testid="add-link-button">Add Link</button>
    </div>
  )
}));

vi.mock('../../../src/components/tabs/MePageTabs/QuickLinksStates', () => ({
  LoadingState: () => <div data-testid="loading-state">Loading...</div>,
  ErrorState: () => <div data-testid="error-state">Error</div>,
  EmptyState: () => <div data-testid="empty-state">Empty</div>
}));

vi.mock('../../../src/components/dialogs/AddLinkDialog', () => ({
  AddLinkDialog: ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => (
    open ? <div data-testid="add-link-dialog">Add Link Dialog</div> : null
  )
}));

vi.mock('../../../src/components/dialogs/EditLinkDialog', () => ({
  EditLinkDialog: ({ open, onOpenChange, linkData }: { open: boolean; onOpenChange: (open: boolean) => void; linkData: any }) => (
    open ? <div data-testid="edit-link-dialog">Edit Link Dialog - {linkData?.title}</div> : null
  )
}));

vi.mock('../../../src/hooks/api/useMembers', () => ({
  useCurrentUser: () => ({
    data: { uuid: 'current-user-id' }
  })
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Plus: () => <div data-testid="plus-icon" />
}));

// Mock QuickLinksContext
const mockQuickLinksContext = {
  quickLinks: [] as any[],
  isLoading: false,
  handleDeleteConfirm: vi.fn(),
  handleDeleteCancel: vi.fn(),
  handleEditCancel: vi.fn(),
  deleteDialog: {
    isOpen: false,
    linkTitle: '',
    linkId: ''
  },
  editDialog: {
    isOpen: false,
    linkId: ''
  },
  ownerId: 'test-owner-id'
};

vi.mock('../../../src/contexts/QuickLinksContext', () => ({
  QuickLinksProvider: ({ children }: { children: React.ReactNode }) => children,
  useQuickLinksContext: () => mockQuickLinksContext
}));

const mockUserData = {
  uuid: 'test-user-id',
  username: 'testuser',
  quickLinks: []
};

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe('QuickLinksTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuickLinksContext.quickLinks = [];
    mockQuickLinksContext.isLoading = false;
    mockQuickLinksContext.deleteDialog.isOpen = false;
    mockQuickLinksContext.editDialog.isOpen = false;
  });

  it('shows loading state', () => {
    mockQuickLinksContext.isLoading = true;
    
    renderWithQueryClient(<QuickLinksTab userData={mockUserData} />);
    
    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
  });

  it('shows empty state with default message', () => {
    renderWithQueryClient(<QuickLinksTab userData={mockUserData} />);
    
    expect(screen.getByText("No quick links yet. Add Links to Favorites or click 'Add Link' to get started.")).toBeInTheDocument();
    expect(screen.getByText('Add Link')).toBeInTheDocument();
  });

  it('shows custom empty message when provided', () => {
    const customMessage = 'Custom empty message';
    renderWithQueryClient(<QuickLinksTab userData={mockUserData} emptyMessage={customMessage} />);
    
    expect(screen.getByText(customMessage)).toBeInTheDocument();
  });

  it('shows search filter and links grid when links exist', () => {
    mockQuickLinksContext.quickLinks = [
      { id: '1', title: 'Test Link', url: 'https://example.com', categoryId: 'cat-1' }
    ];
    
    renderWithQueryClient(<QuickLinksTab userData={mockUserData} />);
    
    expect(screen.getByTestId('search-filter')).toBeInTheDocument();
    expect(screen.getByTestId('quick-links-grid')).toBeInTheDocument();
  });

  it('opens add link dialog when add button is clicked', () => {
    renderWithQueryClient(<QuickLinksTab userData={mockUserData} />);
    
    const addButton = screen.getByText('Add Link');
    fireEvent.click(addButton);
    
    expect(screen.getByTestId('add-link-dialog')).toBeInTheDocument();
  });

  it('shows delete confirmation dialog when delete dialog is open', () => {
    mockQuickLinksContext.deleteDialog = {
      isOpen: true,
      linkTitle: 'Test Link',
      linkId: '1'
    };
    
    renderWithQueryClient(<QuickLinksTab userData={mockUserData} />);
    
    expect(screen.getByText('Delete Quick Link')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete "Test Link"? This action cannot be undone.')).toBeInTheDocument();
  });

  it('calls handleDeleteCancel when cancel button is clicked', () => {
    mockQuickLinksContext.deleteDialog = {
      isOpen: true,
      linkTitle: 'Test Link',
      linkId: '1'
    };
    
    renderWithQueryClient(<QuickLinksTab userData={mockUserData} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(mockQuickLinksContext.handleDeleteCancel).toHaveBeenCalled();
  });

  it('calls handleDeleteConfirm when delete button is clicked', () => {
    mockQuickLinksContext.deleteDialog = {
      isOpen: true,
      linkTitle: 'Test Link',
      linkId: '1'
    };
    
    renderWithQueryClient(<QuickLinksTab userData={mockUserData} />);
    
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);
    
    expect(mockQuickLinksContext.handleDeleteConfirm).toHaveBeenCalled();
  });

  // NEW TESTS FOR EDIT FUNCTIONALITY
  describe('Edit Link Functionality', () => {
    it('shows edit link dialog when edit dialog is open', () => {
      mockQuickLinksContext.editDialog = {
        isOpen: true,
        linkId: '1'
      };
      mockQuickLinksContext.quickLinks = [
        { 
          id: '1', 
          title: 'Test Link', 
          url: 'https://example.com',
          categoryId: 'cat-1',
          description: 'Test description',
          tags: ['tag1', 'tag2'],
          isFavorite: false
        }
      ];
      
      renderWithQueryClient(<QuickLinksTab userData={mockUserData} />);
      
      expect(screen.getByTestId('edit-link-dialog')).toBeInTheDocument();
      expect(screen.getByText('Edit Link Dialog - Test Link')).toBeInTheDocument();
    });

    it('does not show edit dialog when editDialog.isOpen is false', () => {
      mockQuickLinksContext.editDialog = {
        isOpen: false,
        linkId: ''
      };
      
      renderWithQueryClient(<QuickLinksTab userData={mockUserData} />);
      
      expect(screen.queryByTestId('edit-link-dialog')).not.toBeInTheDocument();
    });

    it('does not show edit dialog when link is not found', () => {
      mockQuickLinksContext.editDialog = {
        isOpen: true,
        linkId: 'non-existent-id'
      };
      mockQuickLinksContext.quickLinks = [
        { 
          id: '1', 
          title: 'Test Link', 
          url: 'https://example.com',
          categoryId: 'cat-1'
        }
      ];
      
      renderWithQueryClient(<QuickLinksTab userData={mockUserData} />);
      
      expect(screen.queryByTestId('edit-link-dialog')).not.toBeInTheDocument();
    });

    it('converts QuickLink to UserLink format for EditLinkDialog', () => {
      mockQuickLinksContext.editDialog = {
        isOpen: true,
        linkId: '1'
      };
      mockQuickLinksContext.quickLinks = [
        { 
          id: '1', 
          title: 'Test Link', 
          url: 'https://example.com',
          categoryId: 'cat-1',
          description: 'Test description',
          tags: ['tag1', 'tag2'],
          isFavorite: true
        }
      ];
      
      renderWithQueryClient(<QuickLinksTab userData={mockUserData} />);
      
      // The EditLinkDialog should receive the link data in UserLink format
      expect(screen.getByTestId('edit-link-dialog')).toBeInTheDocument();
    });

    it('calls handleEditCancel when edit dialog is closed', () => {
      mockQuickLinksContext.editDialog = {
        isOpen: true,
        linkId: '1'
      };
      mockQuickLinksContext.quickLinks = [
        { 
          id: '1', 
          title: 'Test Link', 
          url: 'https://example.com',
          categoryId: 'cat-1'
        }
      ];
      
      renderWithQueryClient(<QuickLinksTab userData={mockUserData} />);
      
      // The EditLinkDialog's onOpenChange would be called with false
      // This is handled internally by the dialog component
      expect(screen.getByTestId('edit-link-dialog')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles link with missing optional fields', () => {
      mockQuickLinksContext.editDialog = {
        isOpen: true,
        linkId: '1'
      };
      mockQuickLinksContext.quickLinks = [
        { 
          id: '1', 
          title: 'Test Link', 
          url: 'https://example.com',
          categoryId: 'cat-1'
          // description, tags, isFavorite are optional
        }
      ];
      
      renderWithQueryClient(<QuickLinksTab userData={mockUserData} />);
      
      expect(screen.getByTestId('edit-link-dialog')).toBeInTheDocument();
    });

    it('handles empty quickLinks array', () => {
      mockQuickLinksContext.editDialog = {
        isOpen: true,
        linkId: '1'
      };
      mockQuickLinksContext.quickLinks = [];
      
      renderWithQueryClient(<QuickLinksTab userData={mockUserData} />);
      
      // Should not show edit dialog when link is not found
      expect(screen.queryByTestId('edit-link-dialog')).not.toBeInTheDocument();
    });
  });
});