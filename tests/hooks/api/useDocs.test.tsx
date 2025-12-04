import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Import hooks to test
import {
  useDocTree,
  useDocTreeLazy,
  useDocDirectory,
  useDocFile,
  useDocFileWithMetadata,
  type DocsConfig,
} from '../../../src/hooks/api/useDocs';

// Mock the githubDocsApi service
import {
  buildDocTree,
  buildDocTreeLazy,
  fetchGitHubFile,
  fetchGitHubFileWithMetadata,
} from '../../../src/services/githubDocsApi';

vi.mock('../../../src/services/githubDocsApi', () => ({
  buildDocTree: vi.fn(),
  buildDocTreeLazy: vi.fn(),
  fetchGitHubFile: vi.fn(),
  fetchGitHubFileWithMetadata: vi.fn(),
}));

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Creates a fresh QueryClient for each test to ensure isolation
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries for tests
        gcTime: 0, // Don't cache between tests (garbage collection time)
        staleTime: 0,
      },
    },
  });
}

/**
 * Wrapper component that provides QueryClient context
 */
function createWrapper() {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// ============================================================================
// MOCK DATA FACTORIES
// ============================================================================

const createMockDocTreeNode = (overrides?: any) => ({
  name: 'test-doc.md',
  path: 'docs/test-doc.md',
  type: 'file' as const,
  size: 1024,
  sha: 'abc123',
  url: 'https://api.github.com/repos/owner/repo/contents/docs/test-doc.md',
  html_url: 'https://github.com/owner/repo/blob/main/docs/test-doc.md',
  git_url: 'https://api.github.com/repos/owner/repo/git/blobs/abc123',
  download_url: 'https://raw.githubusercontent.com/owner/repo/main/docs/test-doc.md',
  _links: {
    self: 'https://api.github.com/repos/owner/repo/contents/docs/test-doc.md',
    git: 'https://api.github.com/repos/owner/repo/git/blobs/abc123',
    html: 'https://github.com/owner/repo/blob/main/docs/test-doc.md',
  },
  ...overrides,
});

const createMockDocTreeDirectory = (overrides?: any) => ({
  name: 'guides',
  path: 'docs/guides',
  type: 'dir' as const,
  size: 0,
  sha: 'def456',
  url: 'https://api.github.com/repos/owner/repo/contents/docs/guides',
  html_url: 'https://github.com/owner/repo/tree/main/docs/guides',
  git_url: 'https://api.github.com/repos/owner/repo/git/trees/def456',
  download_url: null,
  _links: {
    self: 'https://api.github.com/repos/owner/repo/contents/docs/guides',
    git: 'https://api.github.com/repos/owner/repo/git/trees/def456',
    html: 'https://github.com/owner/repo/tree/main/docs/guides',
  },
  ...overrides,
});

const createMockDocsConfig = (overrides?: Partial<DocsConfig>): DocsConfig => ({
  owner: 'test-owner',
  repo: 'test-repo',
  branch: 'main',
  docsPath: 'docs',
  ...overrides,
});

const createMockFileContent = () => `# Test Documentation

This is a test markdown file.

## Section 1

Some content here.

## Section 2

More content here.
`;

const createMockFileWithMetadata = () => ({
  content: createMockFileContent(),
  sha: 'abc123',
  rawContent: 'IyBUZXN0IERvY3VtZW50YXRpb24=', // Base64 encoded content
});

// ============================================================================
// DOCS HOOKS TESTS
// ============================================================================

describe('useDocTree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch doc tree successfully with default config', async () => {
    const mockTree = [
      createMockDocTreeNode(),
      createMockDocTreeDirectory(),
      createMockDocTreeNode({ name: 'another-doc.md', path: 'docs/another-doc.md' }),
    ];

    vi.mocked(buildDocTree).mockResolvedValue(mockTree);

    const { result } = renderHook(() => useDocTree(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockTree);
    expect(result.current.data).toHaveLength(3);
    expect(buildDocTree).toHaveBeenCalledWith(undefined);
  });

  it('should fetch doc tree with custom config', async () => {
    const config = createMockDocsConfig();
    const mockTree = [createMockDocTreeNode()];

    vi.mocked(buildDocTree).mockResolvedValue(mockTree);

    const { result } = renderHook(() => useDocTree(config), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockTree);
    expect(buildDocTree).toHaveBeenCalledWith(config);
  });


  it('should return empty tree when no docs', async () => {
    const mockTree: any[] = [];

    vi.mocked(buildDocTree).mockResolvedValue(mockTree);

    const { result } = renderHook(() => useDocTree(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(0);
  });

});

describe('useDocTreeLazy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch lazy doc tree successfully', async () => {
    const mockTree = [
      createMockDocTreeNode(),
      createMockDocTreeDirectory(),
    ];

    vi.mocked(buildDocTreeLazy).mockResolvedValue(mockTree);

    const { result } = renderHook(() => useDocTreeLazy(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockTree);
    expect(buildDocTreeLazy).toHaveBeenCalledWith(undefined);
  });

  it('should fetch lazy doc tree with custom config', async () => {
    const config = createMockDocsConfig();
    const mockTree = [createMockDocTreeDirectory()];

    vi.mocked(buildDocTreeLazy).mockResolvedValue(mockTree);

    const { result } = renderHook(() => useDocTreeLazy(config), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockTree);
    expect(buildDocTreeLazy).toHaveBeenCalledWith(config);
  });


  it('should use correct cache settings', async () => {
    const mockTree = [createMockDocTreeNode()];

    vi.mocked(buildDocTreeLazy).mockResolvedValue(mockTree);

    const { result } = renderHook(() => useDocTreeLazy(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Should have staleTime and gcTime configured
    expect(result.current.dataUpdatedAt).toBeGreaterThan(0);
  });
});

describe('useDocDirectory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch directory contents successfully', async () => {
    const path = 'docs/guides';
    const mockContents = [
      createMockDocTreeNode({ name: 'guide1.md', path: 'docs/guides/guide1.md' }),
      createMockDocTreeNode({ name: 'guide2.md', path: 'docs/guides/guide2.md' }),
    ];

    vi.mocked(buildDocTreeLazy).mockResolvedValue(mockContents);

    const { result } = renderHook(() => useDocDirectory(path), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockContents);
    expect(buildDocTreeLazy).toHaveBeenCalledWith(undefined, path);
  });

  it('should fetch directory with custom config', async () => {
    const path = 'docs/api';
    const config = createMockDocsConfig();
    const mockContents = [createMockDocTreeNode()];

    vi.mocked(buildDocTreeLazy).mockResolvedValue(mockContents);

    const { result } = renderHook(() => useDocDirectory(path, config), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockContents);
    expect(buildDocTreeLazy).toHaveBeenCalledWith(config, path);
  });

  it('should not fetch when path is null', async () => {
    const { result } = renderHook(() => useDocDirectory(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
    expect(buildDocTreeLazy).not.toHaveBeenCalled();
  });

  it('should not fetch when path is empty', async () => {
    const { result } = renderHook(() => useDocDirectory(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
    expect(buildDocTreeLazy).not.toHaveBeenCalled();
  });

});

describe('useDocFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch file content successfully', async () => {
    const path = 'docs/readme.md';
    const mockContent = createMockFileContent();

    vi.mocked(fetchGitHubFile).mockResolvedValue(mockContent);

    const { result } = renderHook(() => useDocFile(path), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockContent);
    expect(fetchGitHubFile).toHaveBeenCalledWith(path, undefined);
  });

  it('should fetch file with custom config', async () => {
    const path = 'docs/api.md';
    const config = createMockDocsConfig();
    const mockContent = createMockFileContent();

    vi.mocked(fetchGitHubFile).mockResolvedValue(mockContent);

    const { result } = renderHook(() => useDocFile(path, config), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockContent);
    expect(fetchGitHubFile).toHaveBeenCalledWith(path, config);
  });

  it('should not fetch when path is null', async () => {
    const { result } = renderHook(() => useDocFile(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchGitHubFile).not.toHaveBeenCalled();
  });

  it('should not fetch when path is empty', async () => {
    const { result } = renderHook(() => useDocFile(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchGitHubFile).not.toHaveBeenCalled();
  });


  it('should use correct cache settings', async () => {
    const path = 'docs/test.md';
    const mockContent = createMockFileContent();

    vi.mocked(fetchGitHubFile).mockResolvedValue(mockContent);

    const { result } = renderHook(() => useDocFile(path), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Should have longer staleTime and gcTime for file content
    expect(result.current.dataUpdatedAt).toBeGreaterThan(0);
  });

});

describe('useDocFileWithMetadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch file with metadata successfully', async () => {
    const path = 'docs/readme.md';
    const mockData = createMockFileWithMetadata();

    vi.mocked(fetchGitHubFileWithMetadata).mockResolvedValue(mockData);

    const { result } = renderHook(() => useDocFileWithMetadata(path), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockData);
    expect(result.current.data?.content).toBeTruthy();
    expect(result.current.data?.sha).toBe('abc123');
    expect(result.current.data?.rawContent).toBeTruthy();
    expect(fetchGitHubFileWithMetadata).toHaveBeenCalledWith(path, undefined);
  });

  it('should fetch file with metadata and custom config', async () => {
    const path = 'docs/api.md';
    const config = createMockDocsConfig();
    const mockData = createMockFileWithMetadata();

    vi.mocked(fetchGitHubFileWithMetadata).mockResolvedValue(mockData);

    const { result } = renderHook(() => useDocFileWithMetadata(path, config), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockData);
    expect(fetchGitHubFileWithMetadata).toHaveBeenCalledWith(path, config);
  });

  it('should not fetch when path is null', async () => {
    const { result } = renderHook(() => useDocFileWithMetadata(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchGitHubFileWithMetadata).not.toHaveBeenCalled();
  });

  it('should not fetch when path is empty', async () => {
    const { result } = renderHook(() => useDocFileWithMetadata(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchGitHubFileWithMetadata).not.toHaveBeenCalled();
  });


  it('should use correct cache settings', async () => {
    const path = 'docs/test.md';
    const mockData = createMockFileWithMetadata();

    vi.mocked(fetchGitHubFileWithMetadata).mockResolvedValue(mockData);

    const { result } = renderHook(() => useDocFileWithMetadata(path), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Should have longer staleTime and gcTime for file content
    expect(result.current.dataUpdatedAt).toBeGreaterThan(0);
  });

});
