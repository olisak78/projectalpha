import { useEffect } from 'react';
import { useFetchProjects } from '@/hooks/api/useProjects';
import { useProjectsActions } from '@/stores/projectsStore';

/**
 * Sync hook to keep Zustand store in sync with React Query
 * 
 * This hook should be called once at the app root level to establish
 * the sync between React Query (data fetching) and Zustand (state management)
 * 
 * Usage:
 * ```tsx
 * function App() {
 *   useProjectsSync(); // Call once at root
 *   return <YourApp />;
 * }
 * ```
 */
export function useProjectsSync() {
  const { data, isLoading, error } = useFetchProjects();
  const { setProjects, setIsLoading, setError } = useProjectsActions();
  
  useEffect(() => {
    if (error) {
      setError(error);
    } else if (!isLoading && data) {
      setProjects(data);
    } else if (isLoading) {
      setIsLoading(true);
    }
  }, [data, isLoading, error, setProjects, setIsLoading, setError]);
  
  // This hook doesn't return anything - it just syncs
  return null;
}