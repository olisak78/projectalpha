import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { QuickLinksSearchFilter } from '../../../src/components/tabs/MePageTabs/QuickLinksSearchFilter';
import { createMockQuickLinksContext, setupScrollMocks } from '../../utils/testHelpers';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon" />,
  ChevronLeft: () => <div data-testid="chevron-left-icon" />,
  ChevronRight: () => <div data-testid="chevron-right-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  HelpCircle: () => <div data-testid="help-circle-icon" />,
}));

// Mock ViewLinksToggleButton
vi.mock('../../../src/components/Links/ViewLinksToggleButton', () => ({
  ViewLinksToggleButton: ({ context }: { context: string }) => (
    <div data-testid="view-links-toggle" data-context={context}>
      View Toggle
    </div>
  ),
}));

// Mock QuickLinksContext
const mockQuickLinksContext = createMockQuickLinksContext();

vi.mock('../../../src/contexts/QuickLinksContext', () => ({
  useQuickLinksContext: () => mockQuickLinksContext,
}));

describe('QuickLinksSearchFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuickLinksContext.searchTerm = '';
    mockQuickLinksContext.selectedCategoryId = 'all';
    setupScrollMocks();
  });

  describe('Search Functionality', () => {
    it('renders search input with correct styling and functionality', () => {
      render(<QuickLinksSearchFilter />);
      
      const searchInput = screen.getByPlaceholderText('Search quick links...');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveClass('pl-9', 'border', 'bg-muted/50', 'h-8', 'text-sm');
      expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    });

    it('handles search term changes and displays current value', () => {
      // Test with initial empty value
      render(<QuickLinksSearchFilter />);
      
      const searchInput = screen.getByPlaceholderText('Search quick links...');
      fireEvent.change(searchInput, { target: { value: 'new search term' } });
      
      expect(mockQuickLinksContext.setSearchTerm).toHaveBeenCalledWith('new search term');
      expect(mockQuickLinksContext.setSearchTerm).toHaveBeenCalledTimes(1);
      
      // Test with pre-existing search term
      mockQuickLinksContext.searchTerm = 'test search';
      const { rerender } = render(<QuickLinksSearchFilter />);
      rerender(<QuickLinksSearchFilter />);
      
      expect(screen.getByDisplayValue('test search')).toBeInTheDocument();
    });

    it('handles special characters in search input', () => {
      render(<QuickLinksSearchFilter />);
      
      const searchInput = screen.getByPlaceholderText('Search quick links...');
      const specialChars = '!@#$%^&*()';
      fireEvent.change(searchInput, { target: { value: specialChars } });
      
      expect(mockQuickLinksContext.setSearchTerm).toHaveBeenCalledWith(specialChars);
    });
  });

  describe('Add Link Button', () => {
    it('renders and handles Add Link button when callback is provided', () => {
      const onAddLinkClick = vi.fn();
      
      render(<QuickLinksSearchFilter onAddLinkClick={onAddLinkClick} />);
      
      const addButton = screen.getByRole('button', { name: /add link/i });
      expect(addButton).toBeInTheDocument();
      expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
      
      fireEvent.click(addButton);
      expect(onAddLinkClick).toHaveBeenCalledTimes(1);
    });

    it('does not render Add Link button when callback is not provided', () => {
      render(<QuickLinksSearchFilter />);
      
      expect(screen.queryByRole('button', { name: /add link/i })).not.toBeInTheDocument();
    });
  });

  describe('UI Components', () => {
    it('renders ViewLinksToggleButton with correct context', () => {
      render(<QuickLinksSearchFilter />);
      
      const toggleButton = screen.getByTestId('view-links-toggle');
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveAttribute('data-context', 'quicklinks');
    });

    it('maintains proper CSS classes for responsive design', () => {
      render(<QuickLinksSearchFilter />);
      
      const mainContainer = document.querySelector('.bg-card.border.rounded-lg');
      expect(mainContainer).toHaveClass('p-2.5', 'flex', 'flex-col', 'gap-2.5');
      
      const searchContainer = document.querySelector('.flex.items-center.gap-2');
      expect(searchContainer).toBeInTheDocument();
    });
  });

  describe('Category Filtering', () => {
    it('renders category buttons and handles selection', () => {
      render(<QuickLinksSearchFilter />);
      
      // Check all category buttons are rendered
      const allLinksButton = screen.getByRole('button', { name: /all links/i });
      expect(allLinksButton).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /development/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /documentation/i })).toBeInTheDocument();
      
      // Test "All Links" selection
      fireEvent.click(allLinksButton);
      expect(mockQuickLinksContext.setSelectedCategoryId).toHaveBeenCalledWith('all');
      
      // Test category selection
      const devButton = screen.getByRole('button', { name: /development/i });
      fireEvent.click(devButton);
      expect(mockQuickLinksContext.setSelectedCategoryId).toHaveBeenCalledWith('category-1');
    });

    it('highlights selected categories correctly', () => {
      // Test "All Links" highlighted
      mockQuickLinksContext.selectedCategoryId = 'all';
      const { rerender } = render(<QuickLinksSearchFilter />);
      
      const allLinksButton = screen.getByRole('button', { name: /all links/i });
      expect(allLinksButton).toHaveClass('bg-primary', 'text-primary-foreground');
      
      // Test specific category highlighted
      mockQuickLinksContext.selectedCategoryId = 'category-1';
      rerender(<QuickLinksSearchFilter />);
      
      const devButton = screen.getByRole('button', { name: /development/i });
      expect(devButton).toHaveClass('bg-primary', 'text-primary-foreground');
    });

    it('handles empty categories array', () => {
      mockQuickLinksContext.linkCategories = [];
      render(<QuickLinksSearchFilter />);
      
      expect(screen.getByRole('button', { name: /all links/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /development/i })).not.toBeInTheDocument();
    });
  });

  describe('Horizontal Scrolling', () => {
    it('renders scroll buttons initially hidden', () => {
      render(<QuickLinksSearchFilter />);
      
      const leftButton = screen.getByLabelText('Scroll left');
      const rightButton = screen.getByLabelText('Scroll right');
      
      expect(leftButton).toHaveClass('opacity-0', 'pointer-events-none');
      expect(rightButton).toHaveClass('opacity-0', 'pointer-events-none');
    });

    it('handles scroll interactions correctly', async () => {
      render(<QuickLinksSearchFilter />);
      
      // Test scroll button clicks
      const leftButton = screen.getByLabelText('Scroll left');
      const rightButton = screen.getByLabelText('Scroll right');
      
      fireEvent.click(leftButton);
      expect(Element.prototype.scrollTo).toHaveBeenCalled();
      
      fireEvent.click(rightButton);
      expect(Element.prototype.scrollTo).toHaveBeenCalledTimes(2);
      
      // Test wheel event
      const scrollContainer = document.querySelector('.overflow-x-auto');
      if (scrollContainer) {
        const wheelEvent = new WheelEvent('wheel', { deltaY: 100 });
        Object.defineProperty(wheelEvent, 'preventDefault', { value: vi.fn() });
        
        fireEvent(scrollContainer, wheelEvent);
        expect(wheelEvent.preventDefault).toHaveBeenCalled();
      }
    });

    it('shows scroll buttons when content overflows', async () => {
      render(<QuickLinksSearchFilter />);
      
      const scrollContainer = document.querySelector('.overflow-x-auto');
      if (scrollContainer) {
        Object.defineProperty(scrollContainer, 'scrollLeft', { value: 100, writable: true });
        Object.defineProperty(scrollContainer, 'scrollWidth', { value: 1000, writable: true });
        Object.defineProperty(scrollContainer, 'clientWidth', { value: 500, writable: true });
        
        fireEvent.scroll(scrollContainer);
        
        await waitFor(() => {
          const leftButton = screen.getByLabelText('Scroll left');
          expect(leftButton).toHaveClass('opacity-100', 'pointer-events-auto');
        });
      }
    });

    it('renders fade gradients', () => {
      render(<QuickLinksSearchFilter />);
      
      const container = document.querySelector('.relative.w-full.overflow-hidden');
      expect(container).toBeInTheDocument();
      
      const gradients = document.querySelectorAll('.bg-gradient-to-r, .bg-gradient-to-l');
      expect(gradients.length).toBeGreaterThan(0);
    });
  });
});
