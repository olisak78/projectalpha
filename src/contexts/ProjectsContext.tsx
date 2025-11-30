import React, { createContext, useContext } from "react";
import { useFetchProjects } from "@/hooks/api/useProjects";
import { Project } from "@/types/api";



interface ProjectsContextValue {
  projects: Project[];
  isLoading: boolean;
  error: any;
  sidebarItems: string[];
}

const ProjectsContext = createContext<ProjectsContextValue | undefined>(undefined);

export const ProjectsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data, isLoading, error } = useFetchProjects();
  const projects = data || [];

  // Define the static sidebar items
  const sidebarItems: string[] = [
    "Home",
    "Teams",
    ...projects.map((p: Project) => p.title || p.name),
    "Links",
    "Self Service",
    "AI Arena"
  ];

  return (
    <ProjectsContext.Provider value={{ projects, isLoading, error, sidebarItems }}>
      {children}
    </ProjectsContext.Provider>
  );
};

export const useProjectsContext = () => {
  const context = useContext(ProjectsContext);
  if (!context) throw new Error("useProjectsContext must be used within a ProjectsProvider");
  return context;
};
