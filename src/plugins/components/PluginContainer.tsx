/**
 * Plugin Container Component
 * 
 * Provides consistent theming, borders, and padding for all plugins.
 * Wraps plugin content with portal-standard styling.
 */

import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface PluginContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const PluginContainer: React.FC<PluginContainerProps> = ({
  children,
  className = '',
}) => {
  const { actualTheme } = useTheme();

  return (
    <div
      className={`
        rounded-lg border
        ${actualTheme === 'dark' 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
        }
        shadow-sm
        ${className}
      `}
    >
      {children}
    </div>
  );
};