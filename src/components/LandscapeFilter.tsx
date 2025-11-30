import { useState, useMemo } from "react";
import { Globe, X, Info, Search, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Landscape } from "@/types/developer-portal";
import { getLandscapeHistory, addToLandscapeHistory } from "@/utils/landscapeHistory";
import { sortLandscapeGroups } from "@/utils/developer-portal-helpers";

interface LandscapeFilterProps {
  selectedLandscape: string | null;
  landscapeGroups: Record<string, Landscape[]>;
  onLandscapeChange: (landscape: string | null) => void;
  onShowLandscapeDetails: () => void;
  showClearButton?: boolean;
  placeholder?: string;
  showViewAllButton?: boolean;
}

export function LandscapeFilter({
  selectedLandscape,
  landscapeGroups,
  onLandscapeChange,
  onShowLandscapeDetails,
  showClearButton = true,
  showViewAllButton = true,
  placeholder = "Filter by Landscape"
}: LandscapeFilterProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const frequentlyVisitedGroup = useMemo(() => {
    const history = getLandscapeHistory();
    const allLandscapes = Object.values(landscapeGroups).flat();

    const frequentLandscapes = history
      .map(item => allLandscapes.find(l => l.id === item.id))
      .filter(Boolean) as Landscape[];

    return frequentLandscapes;
  }, [landscapeGroups]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
      case "active":
      case "deployed":
        return "bg-success";
      case "warning":
      case "deploying":
        return "bg-warning";
      case "error":
      case "inactive":
      case "failed":
        return "bg-destructive";
      default:
        return "bg-muted";
    }
  };

  const isCentralLandscape = (landscape: Landscape) => {
    return landscape.isCentral;
  };

  const selectedLandscapeObject = useMemo(() => {
    if (!selectedLandscape) return null;
    const allLandscapes = Object.values(landscapeGroups).flat();
    return allLandscapes.find(l => l.id === selectedLandscape);
  }, [selectedLandscape, landscapeGroups]);

  const filteredLandscapeGroups = useMemo(() => {
    const filtered = Object.entries(landscapeGroups).reduce((acc, [groupName, landscapes]) => {
      const filtered = landscapes.filter((landscape) => {
        const landscapeName = ((landscape as any).technical_name || landscape.name)?.toLowerCase();
        return landscapeName?.includes(searchTerm.toLowerCase());
      });
      if (filtered.length > 0) {
        acc[groupName] = filtered;
      }
      return acc;
    }, {} as Record<string, Landscape[]>);

    if (frequentlyVisitedGroup.length > 0) {
      const filteredFrequent = frequentlyVisitedGroup.filter((landscape) => {
        const landscapeName = ((landscape as any).technical_name || landscape.name)?.toLowerCase();
        return landscapeName?.includes(searchTerm.toLowerCase());
      });

      if (filteredFrequent.length > 0) {
        return {
          'Frequently Visited': filteredFrequent,
          ...filtered
        };
      }
    }

    return filtered;
  }, [landscapeGroups, frequentlyVisitedGroup, searchTerm]);

  const sortedLandscapeGroups = useMemo(() => {
    return sortLandscapeGroups(filteredLandscapeGroups);
  }, [filteredLandscapeGroups]);

  const availableLandscapeIds = Object.values(landscapeGroups)
    .flat()
    .map(landscape => landscape.id);

  const isSelectedLandscapeValid = selectedLandscape && availableLandscapeIds.includes(selectedLandscape);
  const selectValue = isSelectedLandscapeValid ? selectedLandscape : "";

  const handleLandscapeChange = (value: string) => {
    if (value) {
      addToLandscapeHistory(value);
    }
    onLandscapeChange(value);
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <Select
          value={selectValue}
          onValueChange={handleLandscapeChange}
        >
          <SelectTrigger className={`w-[288px] ${!selectedLandscape ? 'border-red-500 border-2' : ''}`}>
            {selectedLandscapeObject ? (
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getStatusColor(selectedLandscapeObject.status)}`} />
                <span>{(selectedLandscapeObject as any).technical_name || selectedLandscapeObject.name}</span>
                {isCentralLandscape(selectedLandscapeObject) && (
                  <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0 bg-blue-500 text-white hover:bg-blue-600">
                    central
                  </Badge>
                )}
              </div>
            ) : (
              <SelectValue placeholder={placeholder} />
            )}
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[400px]">
            {/* Search box at the top */}
            <div className="p-2 border-b sticky top-0 bg-background z-10">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search landscapes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            {sortedLandscapeGroups.map(([groupName, landscapes]) => {
              return (
                <div key={groupName}>
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    {groupName === 'Frequently Visited' && <Clock className="h-3 w-3" />}
                    {groupName}
                  </div>
                  {landscapes.map((landscape) => {
                    const isCentral = isCentralLandscape(landscape);
                    return (
                      <SelectItem key={landscape.id} value={landscape.id}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(landscape.status)}`} />
                          <span>{(landscape as any).technical_name || landscape.name}</span>
                          {isCentral && (
                            <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0 bg-blue-500 text-white hover:bg-blue-600">
                              central
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </div>
              );
            })}

            {sortedLandscapeGroups.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No landscapes found
              </div>
            )}
          </SelectContent>
        </Select>
      </div>

      {selectedLandscape && showClearButton && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onLandscapeChange(null)}
          className="flex items-center gap-2"
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      )}

      {showViewAllButton && (
        <Button
          variant="outline"
          onClick={onShowLandscapeDetails}
          className="flex items-center gap-2"
        >
          <Info className="h-4 w-4" />
          View All Landscapes
        </Button>
      )}
    </div>
  );
}