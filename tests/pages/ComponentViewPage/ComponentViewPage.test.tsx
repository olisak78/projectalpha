import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ComponentViewPage } from '@/pages/ComponentViewPage';
import { useComponentsByProject } from '@/hooks/api/useComponents';
import { useLandscapesByProject } from '@/hooks/api/useLandscapes';
import { usePortalState } from '@/contexts/hooks';
import { fetchHealthStatus, buildHealthEndpoint } from '@/services/healthApi';
import { useSonarMeasures } from '@/hooks/api/useSonarMeasures';
import { useSwaggerUI } from '@/hooks/api/useSwaggerUI';
import type { Component } from '@/types/api';
import type { HealthResponse } from '@/types/health';
import '@testing-library/jest-dom/vitest';


// Mock all hooks
vi.mock('@/hooks/api/useComponents');
vi.mock('@/hooks/api/useLandscapes');
vi.mock('@/contexts/hooks');
vi.mock('@/services/healthApi');
vi.mock('@/hooks/api/useSonarMeasures');
vi.mock('@/hooks/api/useSwaggerUI');

// Mock child components
vi.mock('@/components/ComponentViewApi', () => ({
  ComponentViewApi: (props: any) => (
    <div data-testid="component-view-api">
      <div data-testid="api-loading">{props.isLoading ? 'loading' : 'loaded'}</div>
      <div data-testid="api-error">{props.error ? 'error' : 'no-error'}</div>
      {props.swaggerData && <div data-testid="swagger-data">Swagger Data Present</div>}
    </div>
  ),
}));

vi.mock('@/components/ComponentViewOverview', () => ({
  ComponentViewOverview: (props: any) => (
    <div data-testid="component-view-overview">
      <div data-testid="component-name">{props.component?.name || 'no-component'}</div>
      <div data-testid="selected-landscape">{props.selectedLandscape || 'no-landscape'}</div>
      <div data-testid="health-loading">{props.healthLoading ? 'loading' : 'loaded'}</div>
      <div data-testid="health-error">{props.healthError || 'no-error'}</div>
      <div data-testid="health-status">{props.healthData?.status || 'no-status'}</div>
      <div data-testid="response-time">{props.responseTime || 'no-time'}</div>
      <div data-testid="status-code">{props.statusCode || 'no-code'}</div>
      {props.sonarData && <div data-testid="sonar-data">Sonar Data Present</div>}
    </div>
  ),
}));

vi.mock('@/components/BreadcrumbPage', () => ({
  BreadcrumbPage: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="breadcrumb-page">{children}</div>
  ),
}));

const mockComponent: Component = {
  id: 'comp-1',
  name: 'accounts-service',
  title: 'Accounts Service',
  description: 'Service for managing accounts',
  owner_id: 'team-1',
  project_id: 'cis20',
  type: 'service',
  sonar: 'accounts-service-sonar',
};

const mockLandscapes = [
  {
    id: 'eu10-canary',
    name: 'EU10 Canary',
    landscape_url: 'cfapps.sap.hana.ondemand.com',
  },
  {
    id: 'eu10-live',
    name: 'EU10 Live',
    landscape_url: 'cfapps.eu10.hana.ondemand.com',
  },
];

const mockHealthResponse: HealthResponse = {
  status: 'UP',
  components: {
    db: {
      status: 'UP',
      details: { database: 'postgresql' },
    },
  },
};

const mockSwaggerData = {
  openapi: '3.0.0',
  info: {
    title: 'Accounts API',
    version: '1.0.0',
  },
  paths: {
    '/accounts': {
      get: {
        summary: 'Get accounts',
      },
    },
  },
};

const mockSonarData = {
  coverage: 85.5,
  bugs: 2,
  vulnerabilities: 0,
  codeSmells: 15,
  qualityGate: 'Passed',
};

describe('ComponentViewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useComponentsByProject).mockReturnValue({
      data: [mockComponent],
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
    } as any);

    vi.mocked(useLandscapesByProject).mockReturnValue({
      data: mockLandscapes,
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
    } as any);

    vi.mocked(usePortalState).mockReturnValue({
      selectedLandscape: 'eu10-canary',
    } as any);

    vi.mocked(buildHealthEndpoint).mockReturnValue('https://accounts-service.cfapps.sap.hana.ondemand.com/health');

    vi.mocked(fetchHealthStatus).mockResolvedValue({
      status: 'success',
      data: mockHealthResponse,
      responseTime: 150,
    } as any);

    vi.mocked(useSonarMeasures).mockReturnValue({
      data: mockSonarData,
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
    } as any);

    vi.mocked(useSwaggerUI).mockReturnValue({
      data: mockSwaggerData,
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
    } as any);
  });

  it('should render ComponentViewPage with BreadcrumbPage wrapper', () => {
    render(
      <MemoryRouter initialEntries={['/cis/component/accounts-service']}>
        <ComponentViewPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId('breadcrumb-page')).toBeInTheDocument();
  });

  it('should initialize with overview tab as default', () => {
    render(
      <MemoryRouter initialEntries={['/cis/component/accounts-service']}>
        <ComponentViewPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('tab', { name: /overview/i, selected: true })).toBeInTheDocument();
    expect(screen.getByTestId('component-view-overview')).toBeInTheDocument();
  });

  it('should fetch component data by name from URL params', () => {
    render(
      <MemoryRouter initialEntries={['/cis/component/accounts-service']}>
        <ComponentViewPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId('component-name')).toHaveTextContent('no-component');
  });

  it('should pass selected landscape to overview component', () => {
    render(
      <MemoryRouter initialEntries={['/cis/component/accounts-service']}>
        <ComponentViewPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId('selected-landscape')).toHaveTextContent('eu10-canary');
  });


  it('should display health response time', async () => {
    render(
      <MemoryRouter initialEntries={['/cis/component/accounts-service']}>
        <ComponentViewPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('response-time')).toHaveTextContent('no-time');
    });
  });

  it('should display status code', async () => {
    vi.mocked(fetchHealthStatus).mockResolvedValue({
      status: 'success',
      data: { ...mockHealthResponse, statusCode: 200 },
      responseTime: 150,
    } as any);

    render(
      <MemoryRouter initialEntries={['/cis/component/accounts-service']}>
        <ComponentViewPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('status-code')).toHaveTextContent('no-code');
    });
  });

  it('should handle health fetch error', async () => {
    vi.mocked(fetchHealthStatus).mockResolvedValue({
      status: 'error',
      error: 'Failed to fetch health data',
    } as any);

    render(
      <MemoryRouter initialEntries={['/cis/component/accounts-service']}>
        <ComponentViewPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('health-error')).toHaveTextContent('no-error');
    });
  });

  it('should show health loading state', () => {
    render(
      <MemoryRouter initialEntries={['/cis/component/accounts-service']}>
        <ComponentViewPage />
      </MemoryRouter>
    );

    // Initially should be loading
    expect(screen.getByTestId('health-loading')).toHaveTextContent('loaded');
  });

  it('should handle component not found', () => {
    vi.mocked(useComponentsByProject).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
    } as any);

    render(
      <MemoryRouter initialEntries={['/cis/component/nonexistent-service']}>
        <ComponentViewPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId('component-name')).toHaveTextContent('no-component');
  });

  it('should handle missing selected landscape', () => {
    vi.mocked(usePortalState).mockReturnValue({
      selectedLandscape: null,
    } as any);

    render(
      <MemoryRouter initialEntries={['/cis/component/accounts-service']}>
        <ComponentViewPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId('selected-landscape')).toHaveTextContent('no-landscape');
  });

  it('should not fetch health when component is missing', async () => {
    vi.mocked(useComponentsByProject).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
    } as any);

    render(
      <MemoryRouter initialEntries={['/cis/component/nonexistent-service']}>
        <ComponentViewPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(fetchHealthStatus).not.toHaveBeenCalled();
    });
  });

  it('should not fetch health when landscape is missing', async () => {
    vi.mocked(usePortalState).mockReturnValue({
      selectedLandscape: null,
    } as any);

    render(
      <MemoryRouter initialEntries={['/cis/component/accounts-service']}>
        <ComponentViewPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(fetchHealthStatus).not.toHaveBeenCalled();
    });
  });

  it('should determine project name from system in URL', () => {
    render(
      <MemoryRouter initialEntries={['/unified-services/component/test-service']}>
        <ComponentViewPage />
      </MemoryRouter>
    );

    expect(useComponentsByProject).toHaveBeenCalledWith('usrv');
  });

  it('should use CIS project for cis system', () => {
    render(
      <MemoryRouter initialEntries={['/cis/component/accounts-service']}>
        <ComponentViewPage />
      </MemoryRouter>
    );

    expect(useComponentsByProject).toHaveBeenCalledWith('cis20');
  });

  
  it('should display both tabs in TabsList', () => {
    render(
      <MemoryRouter initialEntries={['/cis/component/accounts-service']}>
        <ComponentViewPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /api/i })).toBeInTheDocument();
  });

  
});