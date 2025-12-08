/**
 * Example Plugin: Dog Breeds Explorer
 * 
 * This example plugin demonstrates how to:
 * - Use the PluginComponentProps interface
 * - Access the plugin context (apiClient, theme, metadata)
 * - Fetch data from an external API
 * - Display data in a table
 * - Handle loading and error states
 * 
 * API: https://dogapi.dog/docs/api-v2
 * 
 * This file serves as a template for plugin developers.
 */

import React, { useState, useEffect } from 'react';
import { PluginComponentProps } from '../types';

/**
 * Type definitions for the Dog API response
 */
interface DogBreed {
  id: string;
  type: string;
  attributes: {
    name: string;
    description: string;
    life: {
      min: number;
      max: number;
    };
    male_weight: {
      min: number;
      max: number;
    };
    female_weight: {
      min: number;
      max: number;
    };
    hypoallergenic: boolean;
  };
}

interface DogApiResponse {
  data: DogBreed[];
  links: {
    self: string;
    current: string;
    next?: string;
    prev?: string;
  };
}

/**
 * Main Plugin Component
 * 
 * This is what developers export as default from their plugin bundle.
 */
const DogBreedsPlugin: React.FC<PluginComponentProps> = ({ context }) => {
  const [breeds, setBreeds] = useState<DogBreed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const { theme, metadata } = context;
  const isDark = theme.actualTheme === 'dark';

  /**
   * Fetch dog breeds from the Dog API
   * Note: This uses the external API directly for this example.
   * In production, you might want to proxy through your backend using apiClient.
   */
  useEffect(() => {
    const fetchBreeds = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `https://dogapi.dog/api/v2/breeds?page[number]=${currentPage}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch breeds: ${response.statusText}`);
        }

        const data: DogApiResponse = await response.json();
        setBreeds(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBreeds();
  }, [currentPage]);

  /**
   * Render loading state
   */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div
          className={`text-sm ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}
        >
          Loading dog breeds...
        </div>
      </div>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <div className="p-8">
        <div
          className={`
            p-4 rounded-lg border
            ${isDark 
              ? 'bg-red-900/20 border-red-800 text-red-300' 
              : 'bg-red-50 border-red-200 text-red-800'
            }
          `}
        >
          <p className="font-semibold">Error loading breeds</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  /**
   * Render main content
   */
  return (
    <div className="space-y-4">
      {/* Info header */}
      <div
        className={`
          p-4 rounded-lg border
          ${isDark 
            ? 'bg-blue-900/20 border-blue-800 text-blue-300' 
            : 'bg-blue-50 border-blue-200 text-blue-800'
          }
        `}
      >
        <p className="text-sm">
          Showing {breeds.length} dog breeds from the Dog API (Page {currentPage})
        </p>
      </div>

      {/* Breeds table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr
              className={`
                border-b
                ${isDark 
                  ? 'border-gray-700 bg-gray-800' 
                  : 'border-gray-200 bg-gray-50'
                }
              `}
            >
              <th
                className={`
                  px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider
                  ${isDark ? 'text-gray-300' : 'text-gray-700'}
                `}
              >
                Breed Name
              </th>
              <th
                className={`
                  px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider
                  ${isDark ? 'text-gray-300' : 'text-gray-700'}
                `}
              >
                Lifespan
              </th>
              <th
                className={`
                  px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider
                  ${isDark ? 'text-gray-300' : 'text-gray-700'}
                `}
              >
                Weight Range
              </th>
              <th
                className={`
                  px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider
                  ${isDark ? 'text-gray-300' : 'text-gray-700'}
                `}
              >
                Hypoallergenic
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {breeds.map((breed) => (
              <tr
                key={breed.id}
                className={`
                  ${isDark 
                    ? 'hover:bg-gray-800/50' 
                    : 'hover:bg-gray-50'
                  }
                  transition-colors
                `}
              >
                <td
                  className={`
                    px-4 py-3
                    ${isDark ? 'text-gray-200' : 'text-gray-900'}
                  `}
                >
                  <div className="font-medium">{breed.attributes.name}</div>
                  <div
                    className={`
                      text-sm mt-1
                      ${isDark ? 'text-gray-400' : 'text-gray-600'}
                    `}
                  >
                    {breed.attributes.description.substring(0, 100)}
                    {breed.attributes.description.length > 100 ? '...' : ''}
                  </div>
                </td>
                <td
                  className={`
                    px-4 py-3 text-sm
                    ${isDark ? 'text-gray-300' : 'text-gray-700'}
                  `}
                >
                  {breed.attributes.life.min} - {breed.attributes.life.max} years
                </td>
                <td
                  className={`
                    px-4 py-3 text-sm
                    ${isDark ? 'text-gray-300' : 'text-gray-700'}
                  `}
                >
                  {breed.attributes.male_weight.min} - {breed.attributes.male_weight.max} kg
                </td>
                <td
                  className={`
                    px-4 py-3
                  `}
                >
                  <span
                    className={`
                      inline-flex px-2 py-1 text-xs font-semibold rounded-full
                      ${breed.attributes.hypoallergenic
                        ? isDark
                          ? 'bg-green-900/30 text-green-300'
                          : 'bg-green-100 text-green-800'
                        : isDark
                        ? 'bg-gray-700 text-gray-300'
                        : 'bg-gray-100 text-gray-800'
                      }
                    `}
                  >
                    {breed.attributes.hypoallergenic ? 'Yes' : 'No'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className={`
            px-4 py-2 rounded-md text-sm font-medium
            transition-colors
            ${currentPage === 1
              ? isDark
                ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : isDark
              ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
            }
          `}
        >
          Previous
        </button>

        <span
          className={`
            text-sm
            ${isDark ? 'text-gray-400' : 'text-gray-600'}
          `}
        >
          Page {currentPage}
        </span>

        <button
          onClick={() => setCurrentPage((p) => p + 1)}
          className={`
            px-4 py-2 rounded-md text-sm font-medium
            transition-colors
            ${isDark
              ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
            }
          `}
        >
          Next
        </button>
      </div>
    </div>
  );
};

/**
 * Plugin module export
 * This is what the portal expects from the bundle
 */
export default DogBreedsPlugin;

/**
 * Optional: Configuration schema
 * Defines what configuration options this plugin accepts
 */
export const configSchema = {
  initialPage: {
    type: 'number',
    default: 1,
    description: 'Initial page to load',
  },
  pageSize: {
    type: 'number',
    default: 25,
    description: 'Number of breeds per page',
  },
};

/**
 * Optional: Initialize function
 * Called when plugin is first loaded
 */
export const initialize = async (context: any) => {
  console.log('[DogBreedsPlugin] Initializing with config:', context.config);
  // Perform any setup needed
};

/**
 * Optional: Cleanup function
 * Called when plugin is unloaded or component unmounts
 */
export const cleanup = async () => {
  console.log('[DogBreedsPlugin] Cleaning up');
  // Perform any cleanup needed
};