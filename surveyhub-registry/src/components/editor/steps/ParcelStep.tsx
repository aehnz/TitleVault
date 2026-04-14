import React, { useState } from 'react';

import { toast } from 'sonner';
import DocumentPicker from '@/components/shared/DocumentPicker';
import { Anchor, DocRef, SubmissionPayload } from '@udhbha/types';


interface ParcelStepProps {
  submission: SubmissionPayload;
  onUpdate: (updates: Partial<SubmissionPayload>) => void;
  isEditable: boolean;
  setSelectedEntity: (entity: any) => void;
}

const ParcelStep: React.FC<ParcelStepProps> = ({ submission, onUpdate, isEditable, setSelectedEntity }) => {
  const [newAnchor, setNewAnchor] = useState({
    id: '',
    lat: '',
    lng: '',
    x: '',
    y: ''
  });

  const [boundaryInput, setBoundaryInput] = useState(() => {
    const geom = submission.geometry_store[submission.parcel.boundary_geom];
    return geom ? formatPolygon(geom.polygon) : '';
  });

  const handleParcelNameChange = (name: string) => {
    onUpdate({
      parcel: { ...submission.parcel, name }
    });
  };

  const handleAddAnchor = () => {
    if (!newAnchor.id || !newAnchor.lat || !newAnchor.lng || !newAnchor.x || !newAnchor.y) {
      toast.error('All anchor fields are required');
      return;
    }

    const anchor: Anchor = {
      id: newAnchor.id,
      wgs84: [parseFloat(newAnchor.lat), parseFloat(newAnchor.lng)],
      local_xy: [parseFloat(newAnchor.x), parseFloat(newAnchor.y)]
    };

    onUpdate({
      parcel: {
        ...submission.parcel,
        anchors: [...submission.parcel.anchors, anchor]
      }
    });

    setNewAnchor({ id: '', lat: '', lng: '', x: '', y: '' });
    toast.success('Anchor added');
  };

  const handleRemoveAnchor = (id: string) => {
    onUpdate({
      parcel: {
        ...submission.parcel,
        anchors: submission.parcel.anchors.filter(a => a.id !== id)
      }
    });
  };

  const handleBoundaryChange = () => {
    const polygon = parsePolygon(boundaryInput);
    if (!polygon) {
      toast.error('Invalid polygon format. Use [[x,y], [x,y], ...]');
      return;
    }

    const geomId = `geom_parcel_${Date.now()}`;
    onUpdate({
      parcel: { ...submission.parcel, boundary_geom: geomId },
      geometry_store: {
        ...submission.geometry_store,
        [geomId]: { polygon }
      }
    });
    toast.success('Boundary geometry saved');
  };

  const handleDocumentsChange = (docs: DocRef[]) => {
    onUpdate({
      parcel: { ...submission.parcel, docs }
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold">Step 1: Parcel Definition</h2>
        <p className="text-muted-foreground">Define the parcel, reference frame, and geo anchors</p>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parcel Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="parcelId">Parcel ID</Label>
              <Input
                id="parcelId"
                value={submission.parcel.parcel_id}
                disabled
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parcelName">Parcel Name *</Label>
              <Input
                id="parcelName"
                value={submission.parcel.name}
                onChange={(e) => handleParcelNameChange(e.target.value)}
                placeholder="Enter parcel name"
                disabled={!isEditable}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Reference Frame</Label>
              <Input value="local_planar" disabled />
            </div>
            <div className="space-y-2">
              <Label>Units</Label>
              <Input value="meters (m)" disabled />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Geo Anchors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Geo Anchors (min 3 required)
          </CardTitle>
          <CardDescription>
            Define anchor points with WGS84 coordinates and local XY positions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {submission.parcel.anchors.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Lat (WGS84)</TableHead>
                  <TableHead>Lng (WGS84)</TableHead>
                  <TableHead>X (local)</TableHead>
                  <TableHead>Y (local)</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submission.parcel.anchors.map((anchor) => (
                  <TableRow 
                    key={anchor.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedEntity(anchor)}
                  >
                    <TableCell className="font-mono">{anchor.id}</TableCell>
                    <TableCell>{anchor.wgs84[0]}</TableCell>
                    <TableCell>{anchor.wgs84[1]}</TableCell>
                    <TableCell>{anchor.local_xy[0]}</TableCell>
                    <TableCell>{anchor.local_xy[1]}</TableCell>
                    <TableCell>
                      {isEditable && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveAnchor(anchor.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {isEditable && (
            <div className="anchor-row">
              <Input
                placeholder="ID (e.g., A1)"
                value={newAnchor.id}
                onChange={(e) => setNewAnchor({ ...newAnchor, id: e.target.value })}
              />
              <Input
                placeholder="Lat"
                type="number"
                step="any"
                value={newAnchor.lat}
                onChange={(e) => setNewAnchor({ ...newAnchor, lat: e.target.value })}
              />
              <Input
                placeholder="Lng"
                type="number"
                step="any"
                value={newAnchor.lng}
                onChange={(e) => setNewAnchor({ ...newAnchor, lng: e.target.value })}
              />
              <Input
                placeholder="X"
                type="number"
                step="any"
                value={newAnchor.x}
                onChange={(e) => setNewAnchor({ ...newAnchor, x: e.target.value })}
              />
              <Input
                placeholder="Y"
                type="number"
                step="any"
                value={newAnchor.y}
                onChange={(e) => setNewAnchor({ ...newAnchor, y: e.target.value })}
              />
              <Button onClick={handleAddAnchor} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}

          {submission.parcel.anchors.length < 3 && (
            <p className="text-sm text-destructive">
              ⚠ At least 3 anchors are required for submission
            </p>
          )}
        </CardContent>
      </Card>

      {/* Boundary Geometry */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Base Boundary Geometry</CardTitle>
          <CardDescription>
            Define the parcel boundary as a polygon array: [[x,y], [x,y], ...]
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Polygon Coordinates</Label>
            <Textarea
              className="geometry-input min-h-24"
              placeholder='[[0,0], [100,0], [100,100], [0,100], [0,0]]'
              value={boundaryInput}
              onChange={(e) => setBoundaryInput(e.target.value)}
              disabled={!isEditable}
            />
          </div>
          {isEditable && (
            <Button onClick={handleBoundaryChange} variant="secondary">
              Save Boundary Geometry
            </Button>
          )}
          {submission.parcel.boundary_geom && (
            <p className="text-xs text-muted-foreground">
              Geometry ID: <code>{submission.parcel.boundary_geom}</code>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Attached Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentPicker
            value={submission.parcel.docs}
            onChange={handleDocumentsChange}
            disabled={!isEditable}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ParcelStep;
