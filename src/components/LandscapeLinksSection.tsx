import { useMemo } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandscapeFilter } from "@/components/LandscapeFilter";
import { LandscapeToolsButtons } from "@/components/LandscapeToolsButtons";
import { DEFAULT_LANDSCAPE } from "@/types/developer-portal";

interface LandscapeGroup {
  id: string;
  name: string;
  landscapes: Array<{
    id: string;
    name: string;
    isCentral: boolean;
  }>;
}

interface LandscapeLinksProps {
  selectedLandscape: string | null;
  selectedLandscapeData?: any;
  landscapeGroups: LandscapeGroup[];
  onLandscapeChange: (landscapeId: string | null) => void;
  onShowLandscapeDetails: () => void;
}

/**
 * Reusable Landscape Links Section
 *
 * Displays a prominent section with landscape tools and selector
 * Used across CisPage, CloudAutomationPage, and UnifiedServicesPage
 */
export function LandscapeLinksSection({
  selectedLandscape,
  selectedLandscapeData,
  landscapeGroups,
  onLandscapeChange,
  onShowLandscapeDetails,
}: LandscapeLinksProps) {

  // Convert LandscapeGroup[] to Record<string, Landscape[]> for LandscapeFilter
  // Memoize to prevent infinite re-renders and API calls
  const landscapeGroupsRecord = useMemo(() => {
    return landscapeGroups.reduce((acc, group) => {
      acc[group.name] = group.landscapes.map(landscape => ({
        id: landscape.id,
        name: landscape.name,
        status: 'active', // Default status since it's not provided in the simplified format
        isCentral: landscape.isCentral || false
      }));
      return acc;
    }, {} as Record<string, any[]>);
  }, [landscapeGroups]);

 
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-foreground">Landscape Links</h2>
        <div className="flex items-center gap-2">
          {selectedLandscape && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onLandscapeChange(null)}
              className="h-9 px-2.5 text-xs"
            >
              <X className="h-3.5 w-3.5 mr-1.5" />
              Clear selection
            </Button>
          )}
          <div className="w-80">
            <LandscapeFilter
              selectedLandscape={selectedLandscape}
              landscapeGroups={landscapeGroupsRecord}
              onLandscapeChange={onLandscapeChange}
              onShowLandscapeDetails={onShowLandscapeDetails}
              showClearButton={false}
              showViewAllButton={false}
            />
          </div>
        </div>
      </div>
      <div className="mt-3">
        <LandscapeToolsButtons
          selectedLandscape={selectedLandscape}
          landscapeData={selectedLandscapeData}
        />
      </div>
    </div>
  );
}
