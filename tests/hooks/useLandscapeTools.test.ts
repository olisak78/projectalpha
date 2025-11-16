import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLandscapeTools } from '@/hooks/useLandscapeTools';

// Mock the landscapes data
vi.mock('@/data/landscapes/landscapes.json', () => ({
  default: {
    'test-landscape-1': {
      domain: 'test1.example.com',
      'landscape-repository': 'https://github.example.com/test1',
      'apm-infra-environment': 'https://apm.test1.example.com'
    },
    'test-landscape-2': {
      domain: 'test2.example.com',
      'landscape-repository': 'https://github.example.com/test2'
    },
    'metadata-test': {
      landscape_url: 'metadata-test.example.com',
      metadata: {
        domain: 'metadata.example.com',
        'landscape-repository': 'https://github.example.com/metadata',
        'apm-infra-environment': 'https://apm.metadata.example.com',
        grafana: 'https://plutono.metadata.example.com'
      }
    }
  }
}));

const defaultDisabledState = {
  urls: {
    git: null,
    concourse: null,
    kibana: null,
    dynatrace: null,
    cockpit: null,
    plutono: null
  },
  availability: {
    git: false,
    concourse: false,
    kibana: false,
    dynatrace: false,
    cockpit: false,
    plutono: false
  }
};

describe('useLandscapeTools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([null, '', 'non-existent-landscape'])('should return default disabled state for invalid landscape ID: %s', (landscapeId) => {
    const { result } = renderHook(() => useLandscapeTools(landscapeId));
    expect(result.current).toEqual(defaultDisabledState);
  });

  it('should use provided landscape data over static JSON', () => {
    const landscapeData = {
      domain: 'api.example.com',
      'landscape-repository': 'https://github.example.com/api',
      'apm-infra-environment': 'https://apm.api.example.com'
    };

    const { result } = renderHook(() => 
      useLandscapeTools('test-landscape-1', landscapeData)
    );

    expect(result.current.urls.git).toBe('https://github.example.com/api');
    expect(result.current.urls.concourse).toBe('https://concourse.cf.api.example.com/teams/product-cf/pipelines/landscape-update-pipeline');
    expect(result.current.urls.dynatrace).toBe('https://apm.api.example.com');
    expect(result.current.availability.git).toBe(true);
    expect(result.current.availability.dynatrace).toBe(true);
  });

  it('should handle metadata properties and fallbacks correctly', () => {
    const landscapeData = {
      landscape_url: 'main.example.com',
      metadata: {
        'landscape-repository': 'https://github.example.com/meta',
        'apm-infra-environment': 'https://apm.meta.example.com',
        grafana: 'https://plutono.meta.example.com'
      }
    };

    const { result } = renderHook(() => 
      useLandscapeTools('test-landscape-1', landscapeData)
    );

    expect(result.current.urls.git).toBe('https://github.example.com/meta');
    expect(result.current.urls.concourse).toBe('https://concourse.cf.main.example.com/teams/product-cf/pipelines/landscape-update-pipeline');
    expect(result.current.urls.plutono).toBe('https://plutono.meta.example.com');
    expect(result.current.urls.dynatrace).toBe('https://apm.meta.example.com');
  });

  it('should use static JSON data when no API data is provided', () => {
    const { result } = renderHook(() => useLandscapeTools('test-landscape-1'));

    expect(result.current.urls.git).toBe('https://github.example.com/test1');
    expect(result.current.urls.concourse).toBe('https://concourse.cf.test1.example.com/teams/product-cf/pipelines/landscape-update-pipeline');
    expect(result.current.urls.dynatrace).toBe('https://apm.test1.example.com');
    expect(result.current.availability.git).toBe(true);
    expect(result.current.availability.dynatrace).toBe(true);
  });

  it('should handle landscape with metadata in static JSON', () => {
    const { result } = renderHook(() => useLandscapeTools('metadata-test'));

    expect(result.current.urls.git).toBe('https://github.example.com/metadata');
    expect(result.current.urls.concourse).toBe('https://concourse.cf.metadata-test.example.com/teams/product-cf/pipelines/landscape-update-pipeline');
    expect(result.current.urls.plutono).toBe('https://plutono.metadata.example.com');
  });

  it('should correctly determine availability based on URL presence', () => {
    const landscapeData = {
      domain: 'partial.example.com',
      'landscape-repository': 'https://github.example.com/partial'
      // No apm-infra-environment provided
    };

    const { result } = renderHook(() => 
      useLandscapeTools('test-landscape', landscapeData)
    );

    expect(result.current.availability.git).toBe(true);
    expect(result.current.availability.concourse).toBe(true);
    expect(result.current.availability.kibana).toBe(true);
    expect(result.current.availability.dynatrace).toBe(false);
    expect(result.current.availability.plutono).toBe(false);
  });

  it('should handle empty domain gracefully', () => {
    const landscapeData = {
      domain: '',
      'landscape-repository': 'https://github.example.com/no-domain'
    };

    const { result } = renderHook(() => 
      useLandscapeTools('test-landscape', landscapeData)
    );

    expect(result.current.urls.git).toBe('https://github.example.com/no-domain');
    expect(result.current.urls.concourse).toBe(null);
    expect(result.current.urls.kibana).toBe(null);
    expect(result.current.availability.git).toBe(true);
    expect(result.current.availability.concourse).toBe(false);
  });

  it('should update result when dependencies change', () => {
    const { result, rerender } = renderHook(
      ({ selectedLandscapeId, landscapeData }) => 
        useLandscapeTools(selectedLandscapeId, landscapeData),
      {
        initialProps: {
          selectedLandscapeId: 'test-landscape-1',
          landscapeData: { domain: 'first.example.com' }
        }
      }
    );

    const firstResult = result.current;

    // Change landscapeData
    rerender({
      selectedLandscapeId: 'test-landscape-1',
      landscapeData: { domain: 'second.example.com' }
    });

    expect(result.current).not.toBe(firstResult);
    expect(result.current.urls.concourse).toBe('https://concourse.cf.second.example.com/teams/product-cf/pipelines/landscape-update-pipeline');
  });
});
