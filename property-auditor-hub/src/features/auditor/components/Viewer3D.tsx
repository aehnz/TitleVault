// ============================================
// 3D VIEWER COMPONENT
// Three.js based stacked floor plates viewer
// With collapsible Inspector/Meta panel
// ============================================

import React, { useMemo, useState, useCallback, lazy, Suspense } from 'react';
import { Building, Component, Floor, GeometryStore, OwnershipClaim, Parcel } from '@udhbha/types';
import { Canvas, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid, Text } from '@react-three/drei';
import * as THREE from 'three';
import { 
  RotateCcw, Layers, Box, ChevronDown, Map as MapIcon, 
  PanelRightClose, PanelRightOpen, Building2, MapPin, FileText, Gavel
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { 
  getClaimColor, 
  getComponentColor,
  claimKindList,
  FLOOR_THICKNESS,
  FLOOR_GAP,
  COMPONENT_HEIGHT,
  type ClaimKind,
  type ComponentType
} from '@/theme/colorSystem';

// Lazy load map component
const MapViewer = lazy(() => import('./MapViewer'));

// Ownership filter for public transparency view
export interface OwnershipFilter {
  mode: 'FULL' | 'FIND_HOLDINGS' | 'CHECK_UNIT';
  ownedComponentIds: Set<string>;  // Components owned by searched owner
  focusedComponentId?: string;     // Single component for CHECK_UNIT mode
}

interface Viewer3DProps {
  parcel: Parcel;
  buildings: Building[];
  floors: Floor[];
  components: Component[];
  geometryStore: GeometryStore;
  claims?: OwnershipClaim[];
  selectedFloor?: string | null;
  selectedComponent?: string | null;
  onSelectFloor?: (floorId: string | null) => void;
  onSelectComponent?: (componentId: string | null) => void;
  ownershipFilter?: OwnershipFilter;  // Optional ownership-based view filter
}

interface ComponentMeshProps {
  component: Component;
  geometry: [number, number][];
  offset: THREE.Vector3;
  yPosition: number;
  claims: OwnershipClaim[];
  onSelect: () => void;
  isSelected: boolean;
  filterState?: 'OWNED' | 'CONTEXT' | 'GHOSTED';  // For ownership filter rendering
}

const ComponentMesh: React.FC<ComponentMeshProps> = ({
  component,
  geometry,
  offset,
  yPosition,
  claims,
  onSelect,
  isSelected,
  filterState = 'OWNED',
}) => {
  const [hovered, setHovered] = useState(false);

  const shape = useMemo(() => {
    const shape = new THREE.Shape();
    if (geometry.length < 3) return null;
    
    shape.moveTo(geometry[0][0] - offset.x, geometry[0][1] - offset.z);
    for (let i = 1; i < geometry.length; i++) {
      shape.lineTo(geometry[i][0] - offset.x, geometry[i][1] - offset.z);
    }
    shape.closePath();
    return shape;
  }, [geometry, offset]);

  if (!shape) return null;

  const compClaims = claims.filter(cl =>
    cl.target_id === component.component_id && cl.active
  );

  // Determine color based on claims first
  let compColor = getComponentColor(component.type as ComponentType);
  
  if (compClaims.length > 0) {
    // Use OWNERSHIP claim color (orange #FF7A00)
    compColor = getClaimColor('OWNERSHIP');
  }

  // Apply ownership filter styling
  let finalColor: string;
  let opacity: number;
  
  if (filterState === 'OWNED') {
    // Full opacity, use the claim/component color (orange for ownership)
    finalColor = isSelected ? '#ffffff' : hovered ? '#e0e0e0' : compColor;
    opacity = isSelected ? 0.98 : hovered ? 0.95 : 0.9;
  } else if (filterState === 'CONTEXT') {
    // Semi-transparent context
    finalColor = isSelected ? '#ffffff' : hovered ? '#e0e0e0' : compColor;
    opacity = isSelected ? 0.6 : hovered ? 0.5 : 0.35;
  } else {
    // Ghosted - very low opacity
    finalColor = '#666666';
    opacity = isSelected ? 0.25 : hovered ? 0.2 : 0.08;
  }

  const center = useMemo(() => {
    let sumX = 0, sumY = 0;
    for (const [x, y] of geometry) {
      sumX += x;
      sumY += y;
    }
    return [(sumX / geometry.length) - offset.x, (sumY / geometry.length) - offset.z] as [number, number];
  }, [geometry, offset]);

  return (
    <group position={[0, yPosition, 0]}>
      <mesh
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={10}
      >
        <extrudeGeometry args={[shape, { depth: COMPONENT_HEIGHT, bevelEnabled: false }]} />
        <meshStandardMaterial
          color={finalColor}
          transparent
          opacity={opacity}
          depthWrite={true}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </mesh>

      <lineLoop rotation={[-Math.PI / 2, 0, 0]} position={[0, COMPONENT_HEIGHT + 0.02, 0]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={geometry.length}
            array={new Float32Array(geometry.flatMap(([x, y]) => [x - offset.x, y - offset.z, 0]))}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={isSelected ? '#ffffff' : hovered ? '#cccccc' : '#333333'} linewidth={2} />
      </lineLoop>

      {(isSelected || hovered) && (
        <Text
          position={[center[0], COMPONENT_HEIGHT + 0.5, -center[1]]}
          fontSize={1.5}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.1}
          outlineColor="#000000"
        >
          {component.label || component.component_id.slice(-6)}
        </Text>
      )}
    </group>
  );
};

interface FloorPlateProps {
  floor: Floor;
  geometry: [number, number][];
  offset: THREE.Vector3;
  yPosition: number;
  onSelect: () => void;
  isSelected: boolean;
  transparency: number;
  isBasement: boolean;
  filterState?: 'OWNED' | 'CONTEXT' | 'GHOSTED';  // For ownership filter rendering
}

const FloorPlate: React.FC<FloorPlateProps> = ({
  floor,
  geometry,
  offset,
  yPosition,
  onSelect,
  isSelected,
  transparency,
  isBasement,
  filterState = 'OWNED',
}) => {
  const [hovered, setHovered] = useState(false);

  const shape = useMemo(() => {
    const shape = new THREE.Shape();
    if (geometry.length < 3) return null;
    
    shape.moveTo(geometry[0][0] - offset.x, geometry[0][1] - offset.z);
    for (let i = 1; i < geometry.length; i++) {
      shape.lineTo(geometry[i][0] - offset.x, geometry[i][1] - offset.z);
    }
    shape.closePath();
    return shape;
  }, [geometry, offset]);

  if (!shape) return null;

  const center = useMemo(() => {
    let sumX = 0, sumY = 0;
    for (const [x, y] of geometry) {
      sumX += x;
      sumY += y;
    }
    return [(sumX / geometry.length) - offset.x, (sumY / geometry.length) - offset.z] as [number, number];
  }, [geometry, offset]);

  // Apply filter-based styling
  let baseColor: string;
  let edgeColor: string;
  let baseOpacity: number;
  
  if (filterState === 'GHOSTED') {
    // Ghosted floors - very faint
    baseColor = '#444444';
    edgeColor = '#555555';
    baseOpacity = isSelected ? 0.12 : hovered ? 0.1 : 0.05;
  } else if (filterState === 'CONTEXT') {
    // Context floors (parent of owned components) - semi-transparent
    baseColor = isBasement ? '#5a4a3a' : '#889abb';
    edgeColor = isBasement ? '#7b6b5b' : '#88aacc';
    baseOpacity = isSelected ? 0.35 : hovered ? 0.3 : 0.2;
  } else {
    // Full/owned mode - normal rendering
    baseColor = isBasement 
      ? (isSelected ? '#7a6a5a' : hovered ? '#6a5a4a' : '#5a4a3a')
      : (isSelected ? '#aabbcc' : hovered ? '#99aacc' : '#889abb');
    edgeColor = isBasement 
      ? (isSelected ? '#aa9a7a' : '#8b7355')
      : (isSelected ? '#ffffff' : hovered ? '#ccddee' : '#6688aa');
    baseOpacity = Math.max(0.15, transparency * (isSelected ? 0.7 : hovered ? 0.55 : 0.45));
  }

  return (
    <group position={[0, yPosition, 0]}>
      <mesh
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={1}
      >
        <extrudeGeometry args={[shape, { 
          depth: FLOOR_THICKNESS, 
          bevelEnabled: true,
          bevelThickness: 0.15,
          bevelSize: 0.1,
          bevelSegments: 2,
        }]} />
        <meshPhysicalMaterial
          color={baseColor}
          transparent
          opacity={baseOpacity}
          side={THREE.DoubleSide}
          depthWrite={true}
          roughness={0.1}
          metalness={0.1}
          clearcoat={0.3}
          clearcoatRoughness={0.2}
        />
      </mesh>

      <lineLoop rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={geometry.length}
            array={new Float32Array(geometry.flatMap(([x, y]) => [x - offset.x, y - offset.z, 0]))}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={edgeColor} linewidth={2} />
      </lineLoop>

      <lineLoop rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_THICKNESS + 0.02, 0]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={geometry.length}
            array={new Float32Array(geometry.flatMap(([x, y]) => [x - offset.x, y - offset.z, 0]))}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={edgeColor} linewidth={2} />
      </lineLoop>

      <Text
        position={[center[0], FLOOR_THICKNESS + 1.2, -center[1]]}
        fontSize={2.2}
        color={isSelected ? '#ffffff' : isBasement ? '#c4a97d' : '#223344'}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor={isBasement ? '#3a2a1a' : '#ffffff'}
      >
        {floor.label} {isBasement ? '(B)' : ''}
      </Text>

      <Text
        position={[center[0] + 35, FLOOR_THICKNESS / 2, -center[1]]}
        fontSize={1.8}
        color="#556677"
        anchorX="left"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#ffffff"
      >
        L{floor.level}
      </Text>
    </group>
  );
};

interface SceneContentProps {
  parcel: Parcel;
  floors: Floor[];
  components: Component[];
  geometryStore: GeometryStore;
  claims: OwnershipClaim[];
  explodeFactor: number;
  showComponents: boolean;
  showBasement: boolean;
  floorTransparency: number;
  onSelectFloor: (floorId: string | null) => void;
  onSelectComponent: (componentId: string | null) => void;
  selectedFloorId: string | null;
  selectedComponentId: string | null;
  ownershipFilter?: OwnershipFilter;  // Ownership-based view filter
}

const SceneContent: React.FC<SceneContentProps> = ({
  parcel,
  floors,
  components,
  geometryStore,
  claims,
  explodeFactor,
  showComponents,
  showBasement,
  floorTransparency,
  onSelectFloor,
  onSelectComponent,
  selectedFloorId,
  selectedComponentId,
  ownershipFilter,
}) => {
  const bounds = useMemo(() => {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;

    Object.values(geometryStore).forEach(geom => {
      geom.polygon.forEach(([x, y]) => {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minZ = Math.min(minZ, y);
        maxZ = Math.max(maxZ, y);
      });
    });

    if (!isFinite(minX)) {
      return { minX: 0, maxX: 100, minZ: 0, maxZ: 80 };
    }

    return { minX, maxX, minZ, maxZ };
  }, [geometryStore]);

  const offset = useMemo(() => new THREE.Vector3(
    (bounds.minX + bounds.maxX) / 2,
    0,
    (bounds.minZ + bounds.maxZ) / 2
  ), [bounds]);

  const activeComponents = useMemo(() =>
    components.filter(c => !c.active.to),
  [components]);

  const sortedFloors = useMemo(() => {
    return [...floors]
      .filter(f => showBasement || f.level >= 0)
      .sort((a, b) => a.level - b.level);
  }, [floors, showBasement]);

  // Compute which floors contain owned components (for context rendering)
  const floorsWithOwnedComponents = useMemo(() => {
    if (!ownershipFilter || ownershipFilter.mode === 'FULL') return new Set<string>();
    const ownedComponentIds = ownershipFilter.focusedComponentId 
      ? new Set([ownershipFilter.focusedComponentId])
      : ownershipFilter.ownedComponentIds;
    
    const floorIds = new Set<string>();
    activeComponents.forEach(comp => {
      if (ownedComponentIds.has(comp.component_id)) {
        floorIds.add(comp.floor_id);
      }
    });
    return floorIds;
  }, [ownershipFilter, activeComponents]);

  // Helper to determine filter state for a floor
  const getFloorFilterState = useCallback((floorId: string): 'OWNED' | 'CONTEXT' | 'GHOSTED' => {
    if (!ownershipFilter || ownershipFilter.mode === 'FULL') return 'OWNED';
    if (floorsWithOwnedComponents.has(floorId)) return 'CONTEXT';
    return 'GHOSTED';
  }, [ownershipFilter, floorsWithOwnedComponents]);

  // Helper to determine filter state for a component
  const getComponentFilterState = useCallback((componentId: string): 'OWNED' | 'CONTEXT' | 'GHOSTED' => {
    if (!ownershipFilter || ownershipFilter.mode === 'FULL') return 'OWNED';
    
    if (ownershipFilter.mode === 'CHECK_UNIT') {
      if (ownershipFilter.focusedComponentId === componentId) return 'OWNED';
      return 'GHOSTED';
    }
    
    // FIND_HOLDINGS mode
    if (ownershipFilter.ownedComponentIds.has(componentId)) return 'OWNED';
    return 'GHOSTED';
  }, [ownershipFilter]);

  const getFloorY = useCallback((level: number) => {
    return level * (FLOOR_GAP + explodeFactor * 2);
  }, [explodeFactor]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[50, 100, 50]} intensity={0.9} castShadow />
      <directionalLight position={[-50, 80, -50]} intensity={0.4} />
      <directionalLight position={[0, -50, 0]} intensity={0.2} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial color="#1a1a1a" transparent opacity={0.3} />
      </mesh>

      <Grid
        position={[0, 0, 0]}
        args={[200, 200]}
        cellSize={5}
        cellThickness={0.5}
        cellColor="#404040"
        sectionSize={20}
        sectionThickness={1}
        sectionColor="#606060"
        fadeDistance={300}
        fadeStrength={1}
      />

      <Text
        position={[-50, 1, 0]}
        fontSize={2}
        color="#666666"
        anchorX="right"
        anchorY="middle"
      >
        Ground Level
      </Text>

      {showBasement && sortedFloors.some(f => f.level < 0) && (
        <mesh position={[0, -10, 0]}>
          <boxGeometry args={[150, 0.1, 150]} />
          <meshStandardMaterial color="#4a3a2a" transparent opacity={0.1} />
        </mesh>
      )}

      {sortedFloors.map((floor) => {
        if (!floor.outline_geom) return null;
        const geom = geometryStore[floor.outline_geom];
        if (!geom) return null;

        const isSelected = selectedFloorId === floor.floor_id;
        const yPosition = getFloorY(floor.level);
        const isBasement = floor.level < 0;
        const floorFilterState = getFloorFilterState(floor.floor_id);

        return (
          <FloorPlate
            key={floor.floor_id}
            floor={floor}
            geometry={geom.polygon as [number, number][]}
            offset={offset}
            yPosition={yPosition}
            onSelect={() => onSelectFloor(isSelected ? null : floor.floor_id)}
            isSelected={isSelected}
            transparency={floorTransparency}
            isBasement={isBasement}
            filterState={floorFilterState}
          />
        );
      })}

      {showComponents && sortedFloors.map((floor) => {
        const yPosition = getFloorY(floor.level) + FLOOR_THICKNESS + 0.1;
        const floorComponents = activeComponents.filter(c => c.floor_id === floor.floor_id);

        return floorComponents.map((comp) => {
          if (!comp.geom_ref) return null;
          const compGeom = geometryStore[comp.geom_ref];
          if (!compGeom) return null;

          const componentFilterState = getComponentFilterState(comp.component_id);

          return (
            <ComponentMesh
              key={comp.component_id}
              component={comp}
              geometry={compGeom.polygon as [number, number][]}
              offset={offset}
              yPosition={yPosition}
              claims={claims}
              onSelect={() => onSelectComponent(selectedComponentId === comp.component_id ? null : comp.component_id)}
              isSelected={selectedComponentId === comp.component_id}
              filterState={componentFilterState}
            />
          );
        });
      })}

      <OrbitControls
        target={[0, 5, 0]}
        maxDistance={400}
        minDistance={10}
        enableDamping
        dampingFactor={0.05}
        maxPolarAngle={Math.PI / 2.05}
      />
    </>
  );
};

// Inspector Panel Component
interface InspectorPanelProps {
  parcel: Parcel;
  buildings: Building[];
  floors: Floor[];
  components: Component[];
  claims: OwnershipClaim[];
  geometryStore: GeometryStore;
  selectedFloor: Floor | null;
  selectedComponent: Component | null;
}

const InspectorPanel: React.FC<InspectorPanelProps> = ({
  parcel,
  buildings,
  floors,
  components,
  claims,
  geometryStore,
  selectedFloor,
  selectedComponent,
}) => {
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [selectionOpen, setSelectionOpen] = useState(true);
  const [geometriesOpen, setGeometriesOpen] = useState(false);

  const stats = [
    { label: 'Anchors', value: parcel.anchors?.length || 0, icon: MapPin },
    { label: 'Buildings', value: buildings.length, icon: Building2 },
    { label: 'Floors', value: floors.length, icon: Layers },
    { label: 'Components', value: components.length, icon: Box },
    { label: 'Claims', value: claims.filter(c => c.active).length, icon: Gavel },
    { label: 'Geometries', value: Object.keys(geometryStore).length, icon: FileText },
  ];

  const selectedEntity = selectedComponent || selectedFloor;

  return (
    <div className="h-full overflow-y-auto p-3 space-y-3 text-sm">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        Inspector
      </div>

      {/* Summary Stats */}
      <Collapsible open={summaryOpen} onOpenChange={setSummaryOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
          <span className="font-medium text-xs">Submission Summary</span>
          <ChevronDown className={cn("w-4 h-4 transition-transform", summaryOpen && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <div className="space-y-1.5 p-2 bg-background rounded border">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <stat.icon className="w-3.5 h-3.5" />
                  {stat.label}
                </span>
                <span className="font-medium">{stat.value}</span>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Selected Entity */}
      {selectedEntity && (
        <Collapsible open={selectionOpen} onOpenChange={setSelectionOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-primary/10 border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors">
            <span className="font-medium text-xs text-primary">Selected Entity</span>
            <ChevronDown className={cn("w-4 h-4 transition-transform text-primary", selectionOpen && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="p-2 bg-background rounded border">
              {selectedComponent && (
                <div className="space-y-1 text-xs">
                  <div className="font-medium">{selectedComponent.label}</div>
                  <div className="text-muted-foreground font-mono text-[10px]">{selectedComponent.component_id}</div>
                  <div className="flex justify-between mt-2">
                    <span className="text-muted-foreground">Type</span>
                    <span className="capitalize">{selectedComponent.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Floor</span>
                    <span>{selectedComponent.floor_id}</span>
                  </div>
                </div>
              )}
              {selectedFloor && !selectedComponent && (
                <div className="space-y-1 text-xs">
                  <div className="font-medium">{selectedFloor.label}</div>
                  <div className="text-muted-foreground font-mono text-[10px]">{selectedFloor.floor_id}</div>
                  <div className="flex justify-between mt-2">
                    <span className="text-muted-foreground">Level</span>
                    <span>{selectedFloor.level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Building</span>
                    <span className="font-mono text-[10px]">{selectedFloor.building_id}</span>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Parcel Info */}
      <div className="p-2 bg-muted/30 rounded border">
        <div className="font-medium text-xs truncate">{parcel.name}</div>
        <div className="text-muted-foreground font-mono text-[10px] truncate">{parcel.parcel_id}</div>
      </div>

      {/* Geometries Preview */}
      <Collapsible open={geometriesOpen} onOpenChange={setGeometriesOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
          <span className="font-medium text-xs">Geometries ({Object.keys(geometryStore).length})</span>
          <ChevronDown className={cn("w-4 h-4 transition-transform", geometriesOpen && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <div className="p-2 bg-background rounded border max-h-32 overflow-y-auto">
            <div className="space-y-0.5 text-[10px] font-mono text-muted-foreground">
              {Object.keys(geometryStore).slice(0, 10).map((key) => (
                <div key={key} className="truncate">• {key}</div>
              ))}
              {Object.keys(geometryStore).length > 10 && (
                <div className="text-muted-foreground">+{Object.keys(geometryStore).length - 10} more</div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export function Viewer3D({
  parcel,
  buildings,
  floors,
  components,
  geometryStore,
  claims = [],
  selectedFloor,
  selectedComponent,
  onSelectFloor,
  onSelectComponent,
  ownershipFilter,
}: Viewer3DProps) {
  const [explodeFactor, setExplodeFactor] = useState(0);
  const [showComponents, setShowComponents] = useState(true);
  const [showBasement, setShowBasement] = useState(true);
  const [floorTransparency, setFloorTransparency] = useState(0.5);
  const [showMap, setShowMap] = useState(false);
  const [showInspector, setShowInspector] = useState(true);
  const [internalSelectedFloor, setInternalSelectedFloor] = useState<string | null>(null);
  const [internalSelectedComponent, setInternalSelectedComponent] = useState<string | null>(null);

  const activeFloor = selectedFloor ?? internalSelectedFloor;
  const activeComponent = selectedComponent ?? internalSelectedComponent;

  const handleSelectFloor = useCallback((floorId: string | null) => {
    if (onSelectFloor) {
      onSelectFloor(floorId);
    } else {
      setInternalSelectedFloor(floorId);
    }
  }, [onSelectFloor]);

  const handleSelectComponent = useCallback((componentId: string | null) => {
    if (onSelectComponent) {
      onSelectComponent(componentId);
    } else {
      setInternalSelectedComponent(componentId);
    }
  }, [onSelectComponent]);

  const basementCount = useMemo(() => 
    floors.filter(f => f.level < 0).length,
  [floors]);

  // Check if we have valid geo anchors for map
  const hasGeoAnchors = useMemo(() => {
    const anchors = parcel.anchors || [];
    return anchors.length >= 2 && 
      anchors.every(a => a.wgs84 && a.wgs84.length === 2 && a.local_xy && a.local_xy.length === 2);
  }, [parcel.anchors]);

  // Get selected entities for inspector
  const selectedFloorEntity = useMemo(() => 
    floors.find(f => f.floor_id === activeFloor) || null,
  [floors, activeFloor]);

  const selectedComponentEntity = useMemo(() => 
    components.find(c => c.component_id === activeComponent) || null,
  [components, activeComponent]);

  return (
    <div className="flex h-full border rounded-lg overflow-hidden bg-[hsl(var(--panel-bg))]">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 p-2 bg-[hsl(var(--panel-header))] border-b border-[hsl(var(--panel-border))]">
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setShowMap(false)}
              className={cn(
                "px-3 py-1.5 rounded text-xs font-medium transition-colors",
                !showMap ? "bg-background shadow-sm" : "hover:bg-accent/50"
              )}
            >
              <Box className="w-3.5 h-3.5 inline-block mr-1" />
              3D
            </button>
            <button
              onClick={() => hasGeoAnchors && setShowMap(true)}
              className={cn(
                "px-3 py-1.5 rounded text-xs font-medium transition-colors",
                showMap ? "bg-background shadow-sm" : "hover:bg-accent/50",
                !hasGeoAnchors && "opacity-50 cursor-not-allowed"
              )}
              title={hasGeoAnchors ? "Show map view" : "Need at least 2 geo anchors with WGS84 coordinates"}
            >
              <MapIcon className="w-3.5 h-3.5 inline-block mr-1" />
              Map
            </button>
          </div>

          <div className="h-6 w-px bg-border" />

          {!showMap && (
            <>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs cursor-pointer hover:bg-accent px-2 py-1 rounded transition-colors">
                  <input
                    type="checkbox"
                    checked={showComponents}
                    onChange={(e) => setShowComponents(e.target.checked)}
                    className="rounded border-border accent-foreground w-3.5 h-3.5"
                  />
                  <Box className="w-3.5 h-3.5" />
                  <span className="font-medium">Components</span>
                </label>

                <label className="flex items-center gap-1.5 text-xs cursor-pointer hover:bg-accent px-2 py-1 rounded transition-colors">
                  <input
                    type="checkbox"
                    checked={showBasement}
                    onChange={(e) => setShowBasement(e.target.checked)}
                    className="rounded border-border accent-foreground w-3.5 h-3.5"
                  />
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span className="font-medium">Basement ({basementCount})</span>
                </label>
              </div>

              <div className="h-6 w-px bg-border" />

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs">
                  <Layers className="w-3.5 h-3.5" />
                  <span className="font-medium">Explode:</span>
                  <Slider
                    value={[explodeFactor]}
                    onValueChange={([v]) => setExplodeFactor(v)}
                    min={0}
                    max={10}
                    step={0.5}
                    className="w-20"
                  />
                  <span className="font-mono w-8 text-right text-muted-foreground">{explodeFactor.toFixed(1)}</span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <Building2 className="w-3.5 h-3.5" />
                  <span className="font-medium">Opacity:</span>
                  <Slider
                    value={[floorTransparency]}
                    onValueChange={([v]) => setFloorTransparency(v)}
                    min={0.1}
                    max={1}
                    step={0.1}
                    className="w-20"
                  />
                  <span className="font-mono w-8 text-right text-muted-foreground">{Math.round(floorTransparency * 100)}%</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setExplodeFactor(0);
                  setFloorTransparency(0.5);
                }}
                className="toolbar-btn flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </>
          )}

          <div className="flex-1" />

          {/* Inspector Toggle */}
          <button
            onClick={() => setShowInspector(!showInspector)}
            className="toolbar-btn flex items-center gap-1"
            title={showInspector ? "Hide inspector" : "Show inspector"}
          >
            {showInspector ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>
        </div>

        {/* Main View */}
        <div className="flex-1 relative" style={{ minHeight: '400px' }}>
          {showMap ? (
            <Suspense fallback={
              <div className="h-full w-full flex items-center justify-center bg-muted">
                <div className="text-muted-foreground">Loading map...</div>
              </div>
            }>
              <MapViewer parcel={parcel} geometryStore={geometryStore} />
            </Suspense>
          ) : (
            <Canvas
              camera={{ position: [100, 80, 100], fov: 45, near: 0.1, far: 1000 }}
              gl={{ antialias: true, alpha: false }}
              style={{ width: '100%', height: '100%' }}
              onPointerMissed={() => {
                handleSelectFloor(null);
                handleSelectComponent(null);
              }}
            >
              <color attach="background" args={['#1a1a1a']} />
              <fog attach="fog" args={['#1a1a1a', 200, 500]} />
              <SceneContent
                parcel={parcel}
                floors={floors}
                components={components}
                geometryStore={geometryStore}
                claims={claims}
                explodeFactor={explodeFactor}
                showComponents={showComponents}
                showBasement={showBasement}
                floorTransparency={floorTransparency}
                onSelectFloor={handleSelectFloor}
                onSelectComponent={handleSelectComponent}
                selectedFloorId={activeFloor}
                selectedComponentId={activeComponent}
                ownershipFilter={ownershipFilter}
              />
            </Canvas>
          )}
        </div>

        {/* Legend */}
        {!showMap && (
          <div className="flex flex-wrap items-center gap-4 p-2 bg-[hsl(var(--panel-header))] border-t border-[hsl(var(--panel-border))] text-xs">
            <span className="font-semibold uppercase tracking-wide text-muted-foreground">Claims:</span>
            {claimKindList.slice(0, 4).map((kind) => (
              <div key={kind} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: getClaimColor(kind) }} />
                <span className="capitalize text-muted-foreground">{kind.toLowerCase()}</span>
              </div>
            ))}

            <div className="h-4 w-px bg-border mx-2" />

            <span className="font-semibold uppercase tracking-wide text-muted-foreground">Floors:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#889abb]" />
              <span className="text-muted-foreground">Above Ground</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#5a4a3a]" />
              <span className="text-muted-foreground">Basement</span>
            </div>
          </div>
        )}
      </div>

      {/* Inspector Panel */}
      {showInspector && (
        <div className="w-56 border-l border-[hsl(var(--panel-border))] bg-[hsl(var(--panel-bg))] flex-shrink-0">
          <InspectorPanel
            parcel={parcel}
            buildings={buildings}
            floors={floors}
            components={components}
            claims={claims}
            geometryStore={geometryStore}
            selectedFloor={selectedFloorEntity}
            selectedComponent={selectedComponentEntity}
          />
        </div>
      )}
    </div>
  );
}

export default Viewer3D;
