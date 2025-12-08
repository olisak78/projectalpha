import { useAppState } from './AppStateContext';
import { useData } from './DataContext';

export function usePortalState() {
  const appState = useAppState();
  
  return {
    activeTab: appState.activeTab,
    setActiveTab: appState.setActiveTab,
    currentDevId: appState.currentDevId,
    setCurrentDevId: appState.setCurrentDevId,
    selectedComponent: appState.selectedComponent,
    setSelectedComponent: appState.setSelectedComponent,
    selectedLandscape: appState.selectedLandscape,
    setSelectedLandscape: appState.setSelectedLandscape,
    getSelectedLandscapeForProject: appState.getSelectedLandscapeForProject,
    setSelectedLandscapeForProject: appState.setSelectedLandscapeForProject,
    showLandscapeDetails: appState.showLandscapeDetails,
    setShowLandscapeDetails: appState.setShowLandscapeDetails,
    meHighlightNotifications: appState.meHighlightNotifications,
    setMeHighlightNotifications: appState.setMeHighlightNotifications,
  };
}

export function useHealthAndAlerts() {
  const data = useData();
  return {
    getComponentHealth: data.getComponentHealth,
    getComponentAlerts: data.getComponentAlerts,
    getDeployedVersion: data.getDeployedVersion,
    getStatusColor: data.getStatusColor,
  };
}
