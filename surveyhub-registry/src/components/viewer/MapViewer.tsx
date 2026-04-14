import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SubmissionPayload } from '@udhbha/types';


// Custom anchor marker icon
const createAnchorIcon = (label: string) => L.divIcon({
  className: 'custom-anchor-marker',
  html: `
    <div style="
      background: #ff8c00;
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 12px;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      transform: translate(-50%, -50%);
    ">${label}</div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

interface MapViewerProps {
  submission: SubmissionPayload;
  onClose?: () => void;
}

// Component to fit map bounds to polygon
const FitBounds: React.FC<{ bounds: L.LatLngBoundsExpression }> = ({ bounds }) => {
  const map = useMap();
  
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [60, 60] });
    }
  }, [map, bounds]);
  
  return null;
};

const MapViewer: React.FC<MapViewerProps> = ({ submission, onClose }) => {
  // Get WGS84 coordinates from anchors
  const anchors = submission.parcel.anchors || [];
  
  // Transform local XY coordinates to WGS84 using anchor points
  const localToWgs84 = useMemo(() => {
    if (anchors.length < 2) return null;
    
    // Use first two anchors to establish coordinate transformation
    const a1 = anchors[0];
    const a2 = anchors[1];
    
    // Calculate scale and rotation from anchor points
    const dxLocal = a2.local_xy[0] - a1.local_xy[0];
    const dyLocal = a2.local_xy[1] - a1.local_xy[1];
    const dLat = a2.wgs84[0] - a1.wgs84[0];
    const dLng = a2.wgs84[1] - a1.wgs84[1];
    
    const localDist = Math.sqrt(dxLocal * dxLocal + dyLocal * dyLocal);
    const wgsDist = Math.sqrt(dLat * dLat + dLng * dLng);
    const scale = localDist > 0 ? wgsDist / localDist : 0;
    
    // Calculate rotation angle
    const localAngle = Math.atan2(dyLocal, dxLocal);
    const wgsAngle = Math.atan2(dLat, dLng);
    const rotation = wgsAngle - localAngle;
    
    return (localX: number, localY: number): [number, number] => {
      // Translate to origin (a1)
      const dx = localX - a1.local_xy[0];
      const dy = localY - a1.local_xy[1];
      
      // Scale and rotate
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const rotatedX = dx * cos - dy * sin;
      const rotatedY = dx * sin + dy * cos;
      
      // Apply scale and translate to WGS84 origin
      const lat = a1.wgs84[0] + rotatedY * scale;
      const lng = a1.wgs84[1] + rotatedX * scale;
      
      return [lat, lng];
    };
  }, [anchors]);
  
  // Get parcel boundary from geometry_store
  const polygonPositions = useMemo(() => {
    if (!localToWgs84) return null;
    
    const boundaryGeomRef = submission.parcel.boundary_geom;
    if (!boundaryGeomRef || !submission.geometry_store) return null;
    
    const geometry = submission.geometry_store[boundaryGeomRef];
    if (!geometry?.polygon || geometry.polygon.length < 3) return null;
    
    // Convert local coordinates to WGS84
    return geometry.polygon.map(([x, y]) => localToWgs84(x, y));
  }, [submission.parcel.boundary_geom, submission.geometry_store, localToWgs84]);

  // Calculate bounds for the map
  const bounds = useMemo(() => {
    if (!polygonPositions || polygonPositions.length === 0) {
      // Default to a reasonable location based on anchors
      if (anchors.length > 0) {
        return L.latLngBounds(anchors.map(a => [a.wgs84[0], a.wgs84[1]] as [number, number]));
      }
      return L.latLngBounds([[23.02, 72.57], [23.03, 72.58]]);
    }
    return L.latLngBounds(polygonPositions);
  }, [polygonPositions, anchors]);

  // Center position for the map
  const center = useMemo(() => {
    const b = bounds;
    return b.getCenter();
  }, [bounds]);

  return (
    <div className="h-full w-full relative">
      <MapContainer
        center={center}
        zoom={17}
        className="h-full w-full"
        style={{ background: '#f8f4f0' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <FitBounds bounds={bounds} />
        
        {/* Draw parcel boundary polygon */}
        {polygonPositions && polygonPositions.length >= 3 && (
          <Polygon
            positions={polygonPositions}
            pathOptions={{
              color: '#ff8c00',
              fillColor: '#ff8c00',
              fillOpacity: 0.15,
              weight: 4,
              dashArray: '8, 4',
            }}
          >
            <Tooltip 
              direction="center" 
              permanent 
              className="parcel-label-tooltip"
            >
              <div style={{
                background: 'rgba(0,0,0,0.75)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}>
                {submission.parcel.name || submission.parcel.parcel_id}
              </div>
            </Tooltip>
            <Popup>
              <div className="text-sm">
                <strong>{submission.parcel.name || 'Parcel'}</strong>
                <br />
                ID: {submission.parcel.parcel_id}
              </div>
            </Popup>
          </Polygon>
        )}
        
        {/* Draw anchor markers with custom icons */}
        {anchors.map((anchor, idx) => (
          <Marker 
            key={anchor.id} 
            position={[anchor.wgs84[0], anchor.wgs84[1]]}
            icon={createAnchorIcon(anchor.id)}
          >
            <Tooltip 
              direction="top" 
              offset={[0, -16]} 
              className="anchor-tooltip"
            >
              <div style={{
                background: 'white',
                padding: '6px 10px',
                borderRadius: '6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                fontSize: '11px',
                lineHeight: '1.4',
              }}>
                <div style={{ fontWeight: 700, marginBottom: '2px' }}>
                  Anchor {anchor.id}
                </div>
                <div style={{ color: '#666' }}>
                  {anchor.wgs84[0].toFixed(5)}, {anchor.wgs84[1].toFixed(5)}
                </div>
              </div>
            </Tooltip>
            <Popup>
              <div className="text-sm p-1">
                <strong className="text-base">Anchor {anchor.id}</strong>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">WGS84:</span>
                    <span className="font-mono">{anchor.wgs84[0].toFixed(6)}, {anchor.wgs84[1].toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Local XY:</span>
                    <span className="font-mono">{anchor.local_xy[0]}, {anchor.local_xy[1]}</span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-background/95 backdrop-blur-sm p-3 rounded-lg border shadow-lg text-xs z-[1000]">
        <div className="font-semibold mb-2 text-foreground">Map Legend</div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-0.5 bg-[#ff8c00] border-t-2 border-dashed border-[#ff8c00]" />
            <span className="text-muted-foreground">Parcel Boundary</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#ff8c00] border-2 border-white shadow text-white text-[10px] font-bold flex items-center justify-center">A</span>
            <span className="text-muted-foreground">Geo Anchors</span>
          </div>
        </div>
      </div>
      
      {/* Parcel Info Card */}
      <div className="absolute top-4 left-4 bg-background/95 backdrop-blur-sm p-3 rounded-lg border shadow-lg text-xs z-[1000] max-w-[200px]">
        <div className="font-semibold text-foreground truncate">{submission.parcel.name}</div>
        <div className="text-muted-foreground mt-1 font-mono text-[10px]">{submission.parcel.parcel_id}</div>
        <div className="text-muted-foreground mt-1">{anchors.length} anchor point{anchors.length !== 1 ? 's' : ''}</div>
      </div>
    </div>
  );
};

export default MapViewer;