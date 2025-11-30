import { ReactNode } from "react";
import { HeaderNavigationProvider } from "./HeaderNavigationContext";
import { DataProvider } from "./DataContext";
import { AppStateProvider } from "./AppStateContext";
import { GlobalAuthErrorHandler } from "@/components/GlobalAuthErrorHandler";

interface PortalProvidersProps {
  children: ReactNode;
}

export function PortalProviders({ children }: PortalProvidersProps) {
  return (
    <HeaderNavigationProvider>
      <DataProvider>
        <AppStateProvider>
          {children}
          <GlobalAuthErrorHandler />
        </AppStateProvider>
      </DataProvider>
    </HeaderNavigationProvider>
  );
}
