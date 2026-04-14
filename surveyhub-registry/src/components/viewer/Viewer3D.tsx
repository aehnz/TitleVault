import React, { useMemo, useState, useCallback, lazy, Suspense } from 'react';
import { Claim, Component, Floor, SubmissionPayload } from '@udhbha/types';
import { Canvas, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid, Text } from '@react-three/drei';

import * as THREE from 'three';
import { 
  defaultPreset, 
  getClaimColor as getClaimColorFromPreset, 
  getComponentColor,
  claimKindList,
  type ClaimKind,
  type ComponentType
} from '@/theme/colorSystem';

// Lazy load map component
const MapViewer = lazy(() => import('./MapViewer'));

interface Viewer3DProps {
  submission: SubmissionPayload;
  onSelect?: (entity: any) => void;
}

const FLOOR_THICKNESS = 1.2; // Thick glass slab (~0.5cm scale equivalent)
const FLOOR_GAP = 5;
const COMPONENT_HEIGHT = 0.35;

// Claim color mapping using color system
const getClaimColor = (kind: string): string => {
  return getClaimColorFromPreset(kind as ClaimKind);
};

interface ComponentMeshProps {
  component: Component;
  geometry: [number, number][];
  offset: THREE.Vector3;
  yPosition: number;
  claims: Claim[];
  onSelect: () => void;
  isSelected: boolean;
  floorTransparency: number;
}

const ComponentMesh: React.FC<ComponentMeshProps> = ({
  component,
  geometry,
  offset,
  yPosition,
  claims,
  onSelect,
  isSelected,
  floorTransparency,
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

  // Get active claims for this component
  const compClaims = claims.filter(cl =>
    cl.target.kind === 'component' && cl.target.id === component.component_id
  );

  // Determine color based on component type first, then override with claims
  let compColor = getComponentColor(component.type as ComponentType);
  
  // Override with claim colors if claims exist (priority: DISPUTE > OWNERSHIP > LEASE > OCCUPANCY)
  if (compClaims.length > 0) {
    const disputeClaim = compClaims.find(cl => cl.kind === 'DISPUTE');
    const ownershipClaim = compClaims.find(cl => cl.kind === 'OWNERSHIP');
    const leaseClaim = compClaims.find(cl => cl.kind === 'LEASE');
    const occupancyClaim = compClaims.find(cl => cl.kind === 'OCCUPANCY');

    if (disputeClaim) compColor = getClaimColor('DISPUTE');
    else if (ownershipClaim) compColor = getClaimColor('OWNERSHIP');
    else if (leaseClaim) compColor = getClaimColor('LEASE');
    else if (occupancyClaim) compColor = getClaimColor('OCCUPANCY');
  }

  const finalColor = isSelected ? '#ffffff' : hovered ? '#e0e0e0' : compColor;
  const opacity = isSelected ? 0.95 : hovered ? 0.9 : 0.8;

  // Calculate center for label
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
      {/* Component solid */}
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

      {/* Component top edge highlight */}
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

      {/* Component label */}
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

  // Calculate center for label
  const center = useMemo(() => {
    let sumX = 0, sumY = 0;
    for (const [x, y] of geometry) {
      sumX += x;
      sumY += y;
    }
    return [(sumX / geometry.length) - offset.x, (sumY / geometry.length) - offset.z] as [number, number];
  }, [geometry, offset]);

  // Basement floors have a different color
  // Glass slab colors with tint
  const baseColor = isBasement 
    ? (isSelected ? '#7a6a5a' : hovered ? '#6a5a4a' : '#5a4a3a')
    : (isSelected ? '#aabbcc' : hovered ? '#99aacc' : '#889abb');

  const edgeColor = isBasement 
    ? (isSelected ? '#aa9a7a' : '#8b7355')
    : (isSelected ? '#ffffff' : hovered ? '#ccddee' : '#6688aa');

  const baseOpacity = Math.max(0.15, transparency * (isSelected ? 0.7 : hovered ? 0.55 : 0.45));

  return (
    <group position={[0, yPosition, 0]}>
      {/* Floor plate - thick glass slab with proper extrusion */}
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

      {/* Bottom edge outline */}
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

      {/* Top edge outline - always visible */}
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

      {/* Floor label */}
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

      {/* Level indicator on the side */}
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
  submission: SubmissionPayload;
  explodeFactor: number;
  showComponents: boolean;
  showClaims: boolean;
  showBasement: boolean;
  floorTransparency: number;
  onSelect: (entity: any) => void;
  selectedId: string | null;
}

const SceneContent: React.FC<SceneContentProps> = ({
  submission,
  explodeFactor,
  showComponents,
  showClaims,
  showBasement,
  floorTransparency,
  onSelect,
  selectedId,
}) => {
  // Calculate scene bounds
  const bounds = useMemo(() => {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;

    Object.values(submission.geometry_store).forEach(geom => {
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
  }, [submission.geometry_store]);

  const offset = useMemo(() => new THREE.Vector3(
    (bounds.minX + bounds.maxX) / 2,
    0,
    (bounds.minZ + bounds.maxZ) / 2
  ), [bounds]);

  // Filter active components
  const activeComponents = useMemo(() =>
    submission.components.filter(c => !c.active.to),
  [submission.components]);

  // Filter active claims based on current date
  const activeClaims = useMemo(() => {
    if (!showClaims) return [];
    
    const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
    
    return submission.claims.filter(c => {
      const from = c.active.from;
      const to = c.active.to;
      
      // Claim is active if:
      // 1. Start date is on or before today (or no start date)
      // 2. End date is on or after today (or no end date - meaning ongoing)
      const hasStarted = !from || from <= today;
      const notEnded = !to || to >= today;
      
      return hasStarted && notEnded;
    });
  }, [submission.claims, showClaims]);

  // Sort floors by level for proper rendering order
  const sortedFloors = useMemo(() => {
    return [...submission.floors]
      .filter(f => showBasement || f.level >= 0)
      .sort((a, b) => a.level - b.level);
  }, [submission.floors, showBasement]);

  // Calculate Y position for a floor
  const getFloorY = useCallback((level: number) => {
    return level * (FLOOR_GAP + explodeFactor * 2);
  }, [explodeFactor]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[50, 100, 50]} intensity={0.9} castShadow />
      <directionalLight position={[-50, 80, -50]} intensity={0.4} />
      <directionalLight position={[0, -50, 0]} intensity={0.2} />

      {/* Ground plane for basement reference */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial color="#1a1a1a" transparent opacity={0.3} />
      </mesh>

      {/* Grid - positioned at ground level */}
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

      {/* Ground level indicator */}
      <Text
        position={[-50, 1, 0]}
        fontSize={2}
        color="#666666"
        anchorX="right"
        anchorY="middle"
      >
        Ground Level
      </Text>

      {/* Basement zone indicator */}
      {showBasement && sortedFloors.some(f => f.level < 0) && (
        <mesh position={[0, -10, 0]}>
          <boxGeometry args={[150, 0.1, 150]} />
          <meshStandardMaterial color="#4a3a2a" transparent opacity={0.1} />
        </mesh>
      )}

      {/* Floor plates */}
      {sortedFloors.map((floor) => {
        if (!floor.outline_geom) return null;
        const geom = submission.geometry_store[floor.outline_geom];
        if (!geom) return null;

        const isSelected = selectedId === floor.floor_id;
        const yPosition = getFloorY(floor.level);
        const isBasement = floor.level < 0;

        return (
          <FloorPlate
            key={floor.floor_id}
            floor={floor}
            geometry={geom.polygon}
            offset={offset}
            yPosition={yPosition}
            onSelect={() => onSelect(floor)}
            isSelected={isSelected}
            transparency={floorTransparency}
            isBasement={isBasement}
          />
        );
      })}

      {/* Components - rendered after floors for proper depth */}
      {showComponents && sortedFloors.map((floor) => {
        const yPosition = getFloorY(floor.level) + FLOOR_THICKNESS + 0.1;
        const floorComponents = activeComponents.filter(c => c.floor_id === floor.floor_id);

        return floorComponents.map((comp) => {
          if (!comp.geom_ref) return null;
          const compGeom = submission.geometry_store[comp.geom_ref];
          if (!compGeom) return null;

          return (
            <ComponentMesh
              key={comp.component_id}
              component={comp}
              geometry={compGeom.polygon}
              offset={offset}
              yPosition={yPosition}
              claims={activeClaims}
              onSelect={() => onSelect(comp)}
              isSelected={selectedId === comp.component_id}
              floorTransparency={floorTransparency}
            />
          );
        });
      })}

      {/* Camera controls */}
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

// Collapsible section component for metadata panel
interface MetadataSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const MetadataSection: React.FC<MetadataSectionProps> = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border-b border-[hsl(var(--panel-border))] last:border-b-0">
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-3 hover:bg-accent/30 transition-colors">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</span>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

const Viewer3D: React.FC<Viewer3DProps> = ({ submission, onSelect }) => {
  const [explodeFactor, setExplodeFactor] = useState(0);
  const [showComponents, setShowComponents] = useState(true);
  const [showClaims, setShowClaims] = useState(true);
  const [showBasement, setShowBasement] = useState(true);
  const [floorTransparency, setFloorTransparency] = useState(0.5);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [showMap, setShowMap] = useState(false);
  const [showMetadataPanel, setShowMetadataPanel] = useState(true);

  // Revision info
  const revisionNumber = submission.meta.revision_number ?? 1;
  const isRevision = revisionNumber > 1 || !!submission.meta.parent_submission_id;

  const handleSelect = useCallback((entity: any) => {
    const id = entity.floor_id || entity.component_id || entity.building_id;
    setSelectedId(id);
    setSelectedEntity(entity);
    onSelect?.(entity);
  }, [onSelect]);

  // Get entity type for display
  const getEntityType = (entity: any): string => {
    if (entity?.floor_id) return 'Floor';
    if (entity?.component_id) return 'Component';
    if (entity?.building_id) return 'Building';
    return 'Unknown';
  };

  // Get claims for selected entity
  const getEntityClaims = useCallback((entity: any) => {
    if (!entity) return [];
    const targetId = entity.floor_id || entity.component_id;
    const targetKind = entity.floor_id ? 'floor' : 'component';
    return submission.claims.filter(c => 
      c.target.kind === targetKind && c.target.id === targetId && !c.active.to
    );
  }, [submission.claims]);

  // Count basements
  const basementCount = useMemo(() => 
    submission.floors.filter(f => f.level < 0).length,
  [submission.floors]);

  // Check if we have geo anchors for the map
  const hasGeoAnchors = submission.parcel.anchors.length >= 3;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-[hsl(var(--panel-header))] border-b border-[hsl(var(--panel-border))]">
        {/* Revision Badge */}
        {isRevision && (
          <>
            <div className="flex items-center gap-2 px-2 py-1 bg-primary/10 border border-primary/20 rounded text-xs">
              <span className="text-primary font-medium">Revision #{revisionNumber}</span>
              {submission.meta.parent_submission_id && (
                <span className="text-muted-foreground font-mono">
                  ← {submission.meta.parent_submission_id.slice(-12)}
                </span>
              )}
            </div>
            <div className="h-6 w-px bg-border" />
          </>
        )}

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
            onClick={() => setShowMap(true)}
            disabled={!hasGeoAnchors}
            className={cn(
              "px-3 py-1.5 rounded text-xs font-medium transition-colors",
              showMap ? "bg-background shadow-sm" : "hover:bg-accent/50",
              !hasGeoAnchors && "opacity-50 cursor-not-allowed"
            )}
            title={hasGeoAnchors ? "Show map view" : "Add at least 3 geo anchors to enable map"}
          >
            <Map className="w-3.5 h-3.5 inline-block mr-1" />
            Map
          </button>
        </div>

        <div className="h-6 w-px bg-border" />

        {/* Toggles - only show for 3D view */}
        {!showMap && (
          <>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-accent px-2 py-1 rounded transition-colors">
                <input
                  type="checkbox"
                  checked={showComponents}
                  onChange={(e) => setShowComponents(e.target.checked)}
                  className="rounded border-border accent-foreground"
                />
                <Box className="w-3.5 h-3.5" />
                <span className="font-medium">Components</span>
              </label>

              <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-accent px-2 py-1 rounded transition-colors">
                <input
                  type="checkbox"
                  checked={showClaims}
                  onChange={(e) => setShowClaims(e.target.checked)}
                  className="rounded border-border accent-foreground"
                />
                {showClaims ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span className="font-medium">Claims</span>
              </label>

              <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-accent px-2 py-1 rounded transition-colors">
                <input
                  type="checkbox"
                  checked={showBasement}
                  onChange={(e) => setShowBasement(e.target.checked)}
                  className="rounded border-border accent-foreground"
                />
                <ChevronDown className="w-3.5 h-3.5" />
                <span className="font-medium">Basement ({basementCount})</span>
              </label>
            </div>

            <div className="h-6 w-px bg-border" />

            {/* Sliders */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-xs">
                <Layers className="w-3.5 h-3.5" />
                <span className="font-medium w-14">Explode:</span>
                <Slider
                  value={[explodeFactor]}
                  onValueChange={([v]) => setExplodeFactor(v)}
                  min={0}
                  max={10}
                  step={0.5}
                  className="w-24"
                />
                <span className="font-mono w-10 text-right">{explodeFactor.toFixed(1)}m</span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <Building2 className="w-3.5 h-3.5" />
                <span className="font-medium w-20">Floor Glass:</span>
                <Slider
                  value={[floorTransparency]}
                  onValueChange={([v]) => setFloorTransparency(v)}
                  min={0.1}
                  max={1}
                  step={0.1}
                  className="w-24"
                />
                <span className="font-mono w-10 text-right">{Math.round(floorTransparency * 100)}%</span>
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

        {/* Panel toggle */}
        <button
          onClick={() => setShowMetadataPanel(!showMetadataPanel)}
          className="toolbar-btn flex items-center gap-1 ml-auto"
          title={showMetadataPanel ? "Hide panel" : "Show panel"}
        >
          {showMetadataPanel ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Main View with Metadata Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* 3D/Map View */}
        <div className="flex-1 viewer-container relative">
          {showMap ? (
            <Suspense fallback={
              <div className="h-full w-full flex items-center justify-center bg-muted">
                <div className="text-muted-foreground">Loading map...</div>
              </div>
            }>
              <MapViewer submission={submission} />
            </Suspense>
          ) : (
            <Canvas
              camera={{ position: [100, 80, 100], fov: 45, near: 0.1, far: 1000 }}
              gl={{ antialias: true, alpha: false }}
              onPointerMissed={() => {
                setSelectedId(null);
                setSelectedEntity(null);
              }}
            >
              <color attach="background" args={['#1a1a1a']} />
              <fog attach="fog" args={['#1a1a1a', 200, 500]} />
              <SceneContent
                submission={submission}
                explodeFactor={explodeFactor}
                showComponents={showComponents}
                showClaims={showClaims}
                showBasement={showBasement}
                floorTransparency={floorTransparency}
                onSelect={handleSelect}
                selectedId={selectedId}
              />
            </Canvas>
          )}
        </div>

        {/* Collapsible Metadata Panel */}
        {showMetadataPanel && (
          <div className="w-72 border-l border-[hsl(var(--panel-border))] bg-[hsl(var(--panel-header))] overflow-y-auto custom-scrollbar">
            <div className="p-3 border-b border-[hsl(var(--panel-border))] flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Selection Details
              </h3>
            </div>

            {selectedEntity ? (
              <div className="divide-y divide-[hsl(var(--panel-border))]">
                {/* Entity Info */}
                <MetadataSection title="Entity Info" defaultOpen={true}>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-primary text-primary-foreground">
                        {getEntityType(selectedEntity)}
                      </span>
                      <span className="text-sm font-mono text-muted-foreground">
                        {selectedEntity.floor_id?.slice(-8) || selectedEntity.component_id?.slice(-8) || 'N/A'}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground uppercase tracking-wide">Label</label>
                      <p className="text-sm font-medium">{selectedEntity.label || 'Unnamed'}</p>
                    </div>
                  </div>
                </MetadataSection>

                {/* Floor-specific info */}
                {selectedEntity.floor_id && !selectedEntity.component_id && (
                  <MetadataSection title="Floor Details" defaultOpen={true}>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground uppercase tracking-wide">Level</label>
                        <p className="text-sm font-medium">
                          {selectedEntity.level >= 0 ? `Level ${selectedEntity.level}` : `Basement ${Math.abs(selectedEntity.level)}`}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground uppercase tracking-wide">Building</label>
                        <p className="text-sm font-mono">{selectedEntity.building_id?.slice(-8) || 'N/A'}</p>
                      </div>
                    </div>
                  </MetadataSection>
                )}

                {/* Component-specific info */}
                {selectedEntity.component_id && (
                  <MetadataSection title="Component Details" defaultOpen={true}>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground uppercase tracking-wide">Type</label>
                        <p className="text-sm font-medium">{selectedEntity.type || 'Unknown'}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground uppercase tracking-wide">Floor ID</label>
                        <p className="text-sm font-mono">{selectedEntity.floor_id?.slice(-8) || 'N/A'}</p>
                      </div>
                    </div>
                  </MetadataSection>
                )}

                {/* Active Period */}
                <MetadataSection title="Active Period" defaultOpen={false}>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">From:</span>
                      <span className="font-mono">{selectedEntity.active?.from || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">To:</span>
                      <span className="font-mono">{selectedEntity.active?.to || 'Present'}</span>
                    </div>
                  </div>
                </MetadataSection>

                {/* Claims Section */}
                {getEntityClaims(selectedEntity).length > 0 && (
                  <MetadataSection title={`Claims (${getEntityClaims(selectedEntity).length})`} defaultOpen={true}>
                    <div className="space-y-2">
                      {getEntityClaims(selectedEntity).map((claim: any, idx: number) => (
                        <div 
                          key={idx} 
                          className="p-2 rounded text-xs space-y-1"
                          style={{ backgroundColor: `${getClaimColor(claim.kind)}20`, borderLeft: `3px solid ${getClaimColor(claim.kind)}` }}
                        >
                          <div className="font-semibold">{claim.kind}</div>
                          <div className="text-muted-foreground">Holder: {claim.holder?.slice(-12) || 'Unknown'}</div>
                          {claim.share !== undefined && <div className="text-muted-foreground">Share: {(claim.share * 100).toFixed(0)}%</div>}
                        </div>
                      ))}
                    </div>
                  </MetadataSection>
                )}

                {/* Raw Data Toggle */}
                <MetadataSection title="Raw JSON Data" defaultOpen={false}>
                  <pre className="p-2 bg-muted rounded text-xs font-mono overflow-auto max-h-48">
                    {JSON.stringify(selectedEntity, null, 2)}
                  </pre>
                </MetadataSection>
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                <Box className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Click on a floor or component to view its metadata</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      {!showMap && (
        <div className="flex flex-wrap items-center gap-4 p-2 bg-[hsl(var(--panel-header))] border-t border-[hsl(var(--panel-border))] text-xs">
          <span className="font-semibold uppercase tracking-wide">Claims:</span>
          {claimKindList.map((kind) => (
            <div key={kind} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: getClaimColor(kind) }} />
              <span className="capitalize">{kind.toLowerCase()}</span>
            </div>
          ))}

          <div className="h-4 w-px bg-border mx-2" />

          <span className="font-semibold uppercase tracking-wide">Floors:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#888888]" />
            <span>Above Ground</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#3a2a1a]" />
            <span>Basement</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Viewer3D;
