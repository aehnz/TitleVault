// ============================================
// OWNERSHIP SNAPSHOT PANEL
// Current ownership display with masking
// ============================================

import { ScrollArea } from '@/components/ui/scroll-area';

import { Component, Floor, OwnershipClaim, Submission } from '@udhbha/types';


interface OwnershipSnapshotPanelProps {
  submission: Submission;
  parent: Submission | null;
  highlightOwnerId?: string;
  onHighlightComponent?: (componentId: string) => void;
}

interface FloorWithOwnership {
  floor: Floor;
  components: {
    component: Component;
    claims: OwnershipClaim[];
  }[];
}

export function OwnershipSnapshotPanel({
  submission,
  parent,
  highlightOwnerId,
  onHighlightComponent,
}: OwnershipSnapshotPanelProps) {
  const [showFullIds, setShowFullIds] = useState(false);

  const ownership = useMemo(() => {
    return computeOwnership(
      parent?.rights_events || [],
      submission.rights_events
    );
  }, [parent, submission]);

  const activeClaims = useMemo(() => {
    return ownership.filter(c => c.active);
  }, [ownership]);

  const floorsWithOwnership = useMemo((): FloorWithOwnership[] => {
    const result: FloorWithOwnership[] = [];
    
    for (const floor of submission.floors) {
      const floorComponents = submission.components.filter(c => c.floor_id === floor.floor_id);
      const componentsWithClaims = floorComponents.map(component => ({
        component,
        claims: activeClaims.filter(c => c.target_id === component.component_id),
      }));
      
      if (componentsWithClaims.some(c => c.claims.length > 0)) {
        result.push({ floor, components: componentsWithClaims.filter(c => c.claims.length > 0) });
      }
    }
    
    return result;
  }, [submission.floors, submission.components, activeClaims]);

  const highlightedUnits = useMemo(() => {
    if (!highlightOwnerId) return new Set<string>();
    return new Set(
      activeClaims
        .filter(c => c.holder.toLowerCase() === highlightOwnerId.toLowerCase())
        .map(c => c.target_id)
    );
  }, [activeClaims, highlightOwnerId]);

  const ownedCount = highlightedUnits.size;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" />
            Current Ownership
          </CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="show-full-ids" className="text-xs text-muted-foreground">
              Show full IDs
            </Label>
            <Switch
              id="show-full-ids"
              checked={showFullIds}
              onCheckedChange={setShowFullIds}
            />
          </div>
        </div>
        {highlightOwnerId && (
          <div 
            className="flex items-center gap-2 mt-2 p-2 rounded-lg border"
            style={{ 
              backgroundColor: `${getStatusColor('APPROVED')}15`,
              borderColor: `${getStatusColor('APPROVED')}40`
            }}
          >
            <Check className="w-4 h-4" style={{ color: getStatusColor('APPROVED') }} />
            <span className="text-sm" style={{ color: getStatusColor('APPROVED') }}>
              You own <strong>{ownedCount}</strong> unit{ownedCount !== 1 ? 's' : ''} in this parcel
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[400px]">
          <div className="p-4 space-y-4">
            {floorsWithOwnership.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No active ownership claims found.
              </p>
            ) : (
              floorsWithOwnership.map(({ floor, components }) => (
                <div key={floor.floor_id} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Layers className="w-4 h-4 text-muted-foreground" />
                    {floor.label || floor.floor_id}
                  </div>
                  <div className="ml-6 space-y-2">
                    {components.map(({ component, claims }) => {
                      const isHighlighted = highlightedUnits.has(component.component_id);
                      
                      return (
                        <div
                          key={component.component_id}
                          className={`
                            p-3 rounded-lg border transition-colors cursor-pointer
                            ${!isHighlighted && 'bg-muted/30 hover:bg-muted/50'}
                          `}
                          style={isHighlighted ? {
                            backgroundColor: `${getStatusColor('APPROVED')}15`,
                            borderColor: `${getStatusColor('APPROVED')}40`,
                            boxShadow: `0 0 0 2px ${getStatusColor('APPROVED')}20`
                          } : undefined}
                          onClick={() => onHighlightComponent?.(component.component_id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Building className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium text-sm">
                                {component.label || component.component_id}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {component.type}
                              </Badge>
                              {isHighlighted && (
                                <Badge 
                                  className="text-white text-xs"
                                  style={{ backgroundColor: getStatusColor('APPROVED') }}
                                >
                                  You Own This
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 space-y-1">
                            {claims.map((claim, idx) => (
                              <div 
                                key={idx} 
                                className="flex items-center justify-between text-sm"
                              >
                                <div className="flex items-center gap-2">
                                  <User className="w-3 h-3 text-orange-500" />
                                  <span className="font-mono text-xs">
                                    {showFullIds ? claim.holder : maskHolderId(claim.holder)}
                                  </span>
                                </div>
                                <span className="text-muted-foreground">
                                  {(claim.share * 100).toFixed(0)}% share
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
