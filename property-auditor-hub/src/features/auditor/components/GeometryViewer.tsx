// ============================================
// GEOMETRY VIEWER COMPONENT
// 2D Canvas/SVG viewer for polygons
// ============================================

import { 
  Eye, 
  EyeOff, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  Layers
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

import { Building, Component, Floor, GeometryStore, Parcel } from '@udhbha/types';


interface GeometryViewerProps {
  parcel: Parcel;
  buildings: Building[];
  floors: Floor[];
  components: Component[];
  geometryStore: GeometryStore;
  selectedEntity?: { type: string; id: string } | null;
  onSelectEntity?: (entity: { type: string; id: string } | null) => void;
  highlightedEntities?: string[];
}

type LayerType = 'parcel' | 'building' | 'floors' | 'components';

const COLORS = {
  parcel: { fill: 'rgba(59, 130, 246, 0.1)', stroke: '#3b82f6' },
  building: { fill: 'rgba(16, 185, 129, 0.15)', stroke: '#10b981' },
  floor: { fill: 'rgba(168, 85, 247, 0.1)', stroke: '#a855f7' },
  component: { fill: 'rgba(249, 115, 22, 0.2)', stroke: '#f97316' },
  selected: { fill: 'rgba(239, 68, 68, 0.3)', stroke: '#ef4444' },
  highlighted: { fill: 'rgba(239, 68, 68, 0.2)', stroke: '#ef4444' },
};

export function GeometryViewer({
  parcel,
  buildings,
  floors,
  components,
  geometryStore,
  selectedEntity,
  onSelectEntity,
  highlightedEntities = [],
}: GeometryViewerProps) {
  const [visibleLayers, setVisibleLayers] = useState<Set<LayerType>>(
    new Set(['parcel', 'building', 'floors', 'components'])
  );
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(
    floors.length > 0 ? floors[0].floor_id : null
  );
  const [zoom, setZoom] = useState(1);

  // Compute bounds
  const bounds = useMemo(() => {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    Object.values(geometryStore).forEach(geom => {
      geom.polygon.forEach(([x, y]) => {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      });
    });

    const padding = 10;
    return {
      minX: minX - padding,
      maxX: maxX + padding,
      minY: minY - padding,
      maxY: maxY + padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
    };
  }, [geometryStore]);

  const toggleLayer = (layer: LayerType) => {
    setVisibleLayers(prev => {
      const next = new Set(prev);
      if (next.has(layer)) {
        next.delete(layer);
      } else {
        next.add(layer);
      }
      return next;
    });
  };

  const transformPoint = (x: number, y: number): [number, number] => {
    // Flip Y axis and scale
    const viewWidth = 400;
    const viewHeight = 300;
    const scale = Math.min(viewWidth / bounds.width, viewHeight / bounds.height) * zoom;
    
    const tx = (x - bounds.minX) * scale + (viewWidth - bounds.width * scale) / 2;
    const ty = (bounds.maxY - y) * scale + (viewHeight - bounds.height * scale) / 2;
    
    return [tx, ty];
  };

  const polygonToPath = (polygon: number[][]): string => {
    return polygon
      .map((point, i) => {
        const [x, y] = transformPoint(point[0], point[1]);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ') + ' Z';
  };

  const isEntitySelected = (type: string, id: string) => {
    return selectedEntity?.type === type && selectedEntity?.id === id;
  };

  const isEntityHighlighted = (id: string) => {
    return highlightedEntities.includes(id);
  };

  const handleClick = (type: string, id: string) => {
    if (onSelectEntity) {
      if (isEntitySelected(type, id)) {
        onSelectEntity(null);
      } else {
        onSelectEntity({ type, id });
      }
    }
  };

  // Get components for selected floor
  const floorComponents = useMemo(() => {
    if (!selectedFloorId) return components;
    return components.filter(c => c.floor_id === selectedFloorId);
  }, [components, selectedFloorId]);

  return (
    <div className="flex gap-4 h-full">
      {/* Viewer */}
      <Card className="flex-1">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Geometry Viewer
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoom(z => Math.min(3, z + 0.25))}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoom(1)}
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg border overflow-hidden">
            <svg
              viewBox="0 0 400 300"
              className="w-full h-[300px]"
              style={{ background: 'hsl(var(--muted) / 0.3)' }}
            >
              {/* Grid pattern */}
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path
                    d="M 20 0 L 0 0 0 20"
                    fill="none"
                    stroke="hsl(var(--border))"
                    strokeWidth="0.5"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Parcel boundary */}
              {visibleLayers.has('parcel') && geometryStore[parcel.boundary_geom] && (
                <path
                  d={polygonToPath(geometryStore[parcel.boundary_geom].polygon)}
                  fill={isEntitySelected('parcel', parcel.parcel_id) ? COLORS.selected.fill : COLORS.parcel.fill}
                  stroke={isEntitySelected('parcel', parcel.parcel_id) ? COLORS.selected.stroke : COLORS.parcel.stroke}
                  strokeWidth={2}
                  strokeDasharray="5,5"
                  className="cursor-pointer transition-colors"
                  onClick={() => handleClick('parcel', parcel.parcel_id)}
                />
              )}

              {/* Building footprint */}
              {visibleLayers.has('building') && buildings.map(bld => {
                const geom = geometryStore[bld.footprint_geom];
                if (!geom) return null;
                const selected = isEntitySelected('building', bld.building_id);
                const highlighted = isEntityHighlighted(bld.building_id);
                return (
                  <path
                    key={bld.building_id}
                    d={polygonToPath(geom.polygon)}
                    fill={selected ? COLORS.selected.fill : highlighted ? COLORS.highlighted.fill : COLORS.building.fill}
                    stroke={selected ? COLORS.selected.stroke : highlighted ? COLORS.highlighted.stroke : COLORS.building.stroke}
                    strokeWidth={2}
                    className="cursor-pointer transition-colors"
                    onClick={() => handleClick('building', bld.building_id)}
                  />
                );
              })}

              {/* Floor outlines */}
              {visibleLayers.has('floors') && floors
                .filter(f => !selectedFloorId || f.floor_id === selectedFloorId)
                .map(floor => {
                  const geom = geometryStore[floor.outline_geom];
                  if (!geom) return null;
                  const selected = isEntitySelected('floor', floor.floor_id);
                  const highlighted = isEntityHighlighted(floor.floor_id);
                  return (
                    <path
                      key={floor.floor_id}
                      d={polygonToPath(geom.polygon)}
                      fill={selected ? COLORS.selected.fill : highlighted ? COLORS.highlighted.fill : COLORS.floor.fill}
                      stroke={selected ? COLORS.selected.stroke : highlighted ? COLORS.highlighted.stroke : COLORS.floor.stroke}
                      strokeWidth={1.5}
                      className="cursor-pointer transition-colors"
                      onClick={() => handleClick('floor', floor.floor_id)}
                    />
                  );
                })}

              {/* Components */}
              {visibleLayers.has('components') && floorComponents.map(comp => {
                const geom = geometryStore[comp.geom_ref];
                if (!geom) return null;
                const selected = isEntitySelected('component', comp.component_id);
                const highlighted = isEntityHighlighted(comp.component_id);
                return (
                  <path
                    key={comp.component_id}
                    d={polygonToPath(geom.polygon)}
                    fill={selected ? COLORS.selected.fill : highlighted ? COLORS.highlighted.fill : COLORS.component.fill}
                    stroke={selected ? COLORS.selected.stroke : highlighted ? COLORS.highlighted.stroke : COLORS.component.stroke}
                    strokeWidth={1.5}
                    className="cursor-pointer transition-colors"
                    onClick={() => handleClick('component', comp.component_id)}
                  />
                );
              })}
            </svg>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: COLORS.parcel.stroke }} />
              <span className="text-muted-foreground">Parcel</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: COLORS.building.stroke }} />
              <span className="text-muted-foreground">Building</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: COLORS.floor.stroke }} />
              <span className="text-muted-foreground">Floor</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: COLORS.component.stroke }} />
              <span className="text-muted-foreground">Unit</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <Card className="w-56 flex-shrink-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Layers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Layer toggles */}
          <div className="space-y-2">
            {(['parcel', 'building', 'floors', 'components'] as LayerType[]).map(layer => (
              <div key={layer} className="flex items-center gap-2">
                <Checkbox
                  id={`layer-${layer}`}
                  checked={visibleLayers.has(layer)}
                  onCheckedChange={() => toggleLayer(layer)}
                />
                <Label
                  htmlFor={`layer-${layer}`}
                  className="text-sm capitalize cursor-pointer"
                >
                  {layer}
                </Label>
              </div>
            ))}
          </div>

          <Separator />

          {/* Floor selector */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Floor</Label>
            <ScrollArea className="h-32">
              <div className="space-y-1">
                <Button
                  variant={selectedFloorId === null ? 'secondary' : 'ghost'}
                  size="sm"
                  className="w-full justify-start text-sm"
                  onClick={() => setSelectedFloorId(null)}
                >
                  All Floors
                </Button>
                {floors.map(floor => (
                  <Button
                    key={floor.floor_id}
                    variant={selectedFloorId === floor.floor_id ? 'secondary' : 'ghost'}
                    size="sm"
                    className="w-full justify-start text-sm"
                    onClick={() => setSelectedFloorId(floor.floor_id)}
                  >
                    {floor.label}
                    <Badge variant="outline" className="ml-auto text-xs">
                      L{floor.level}
                    </Badge>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Selected entity info */}
          {selectedEntity && (
            <>
              <Separator />
              <div>
                <Label className="text-sm font-medium mb-2 block">Selected</Label>
                <div className="p-2 bg-muted rounded-md text-sm">
                  <div className="font-medium capitalize">{selectedEntity.type}</div>
                  <div className="text-muted-foreground font-mono text-xs truncate">
                    {selectedEntity.id}
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
