import React, { useState } from 'react';

import { DocRef, Floor, SubmissionPayload, TopologyEvent } from '@udhbha/types';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import DocumentPicker from '@/components/shared/DocumentPicker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FloorsStepProps {
  submission: SubmissionPayload;
  onUpdate: (updates: Partial<SubmissionPayload>) => void;
  isEditable: boolean;
  setSelectedEntity: (entity: any) => void;
}

const FloorsStep: React.FC<FloorsStepProps> = ({ submission, onUpdate, isEditable, setSelectedEntity }) => {
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(
    submission.buildings[0]?.building_id || ''
  );
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [floorToDelete, setFloorToDelete] = useState<Floor | null>(null);
  const [editingFloor, setEditingFloor] = useState<Floor | null>(null);
  const [formData, setFormData] = useState({
    level: 0,
    label: '',
    outline: '',
    activeFrom: new Date().toISOString().split('T')[0],
    activeTo: ''
  });

  const selectedBuilding = submission.buildings.find(b => b.building_id === selectedBuildingId);
  const buildingFloors = submission.floors
    .filter(f => f.building_id === selectedBuildingId)
    .sort((a, b) => b.level - a.level); // Sort descending (highest floor first)

  const isRevision = !!submission.meta.parent_submission_id;

  const openAddDialog = () => {
    // Calculate next suggested level
    const existingLevels = buildingFloors.map(f => f.level);
    const suggestedLevel = existingLevels.length > 0 ? Math.max(...existingLevels) + 1 : 0;
    
    setFormData({
      level: suggestedLevel,
      label: `Level ${suggestedLevel}`,
      outline: '',
      activeFrom: new Date().toISOString().split('T')[0],
      activeTo: ''
    });
    setEditingFloor(null);
    setShowAddDialog(true);
  };

  const openEditDialog = (floor: Floor) => {
    const geom = submission.geometry_store[floor.outline_geom];
    setFormData({
      level: floor.level,
      label: floor.label,
      outline: geom ? formatPolygon(geom.polygon) : '',
      activeFrom: floor.active.from,
      activeTo: floor.active.to || ''
    });
    setEditingFloor(floor);
    setShowAddDialog(true);
  };

  const handleSave = () => {
    if (!formData.label.trim()) {
      toast.error('Floor label is required');
      return;
    }

    const polygon = parsePolygon(formData.outline);
    if (!polygon) {
      toast.error('Invalid outline polygon format');
      return;
    }

    // Use collision-prevention ID generation
    const geomId = generateUniqueGeomId('geom_fl', submission.geometry_store);
    const newGeometryStore = {
      ...submission.geometry_store,
      [geomId]: { polygon }
    };

    if (editingFloor) {
      // Update existing floor
      const updatedFloors = submission.floors.map(f =>
        f.floor_id === editingFloor.floor_id
          ? {
              ...f,
              level: formData.level,
              label: formData.label,
              outline_geom: geomId,
              active: {
                from: formData.activeFrom,
                to: formData.activeTo || null
              }
            }
          : f
      );

      // Add geometry correction event if in revision (RULE 9: complete event payload)
      const updates: Partial<SubmissionPayload> = {
        floors: updatedFloors,
        geometry_store: newGeometryStore
      };

      if (isRevision) {
        const correctionEvent: TopologyEvent = {
          event_id: `evt_${Date.now()}`,
          kind: 'GEOMETRY_CORRECTION',
          ts: new Date().toISOString(), // RULE 12: Full ISO timestamp
          target: { entity: 'FLOOR', kind: 'floor', id: editingFloor.floor_id },
          payload: {
            floor_id: editingFloor.floor_id,
            prev_outline_geom: editingFloor.outline_geom,
            new_outline_geom: geomId,
            reason: 'Manual geometry update'
          },
          from_geom: editingFloor.outline_geom,
          to_geom: geomId,
          docs: [],
          note: `Floor geometry updated (Rev. #${submission.meta.revision_number})`
        };
        updates.topology_events = [...submission.topology_events, correctionEvent];
      }

      onUpdate(updates);
      toast.success('Floor updated');
    } else {
      // Generate unique floor ID
      const floorId = generateUniqueFloorId(formData.level, submission.floors);

      const newFloor: Floor = {
        floor_id: floorId,
        building_id: selectedBuildingId,
        level: formData.level,
        label: formData.label,
        outline_geom: geomId,
        active: {
          from: formData.activeFrom,
          to: formData.activeTo || null
        },
        docs: []
      };

      // For revisions, add a topology event (RULE 9: complete payload)
      const updates: Partial<SubmissionPayload> = {
        floors: [...submission.floors, newFloor],
        geometry_store: newGeometryStore
      };

      if (isRevision) {
        const addFloorEvent: TopologyEvent = {
          event_id: `evt_${Date.now()}`,
          kind: 'ADD_FLOOR',
          ts: new Date().toISOString(), // RULE 12: Full ISO timestamp
          floor_id: floorId,
          target: { entity: 'BUILDING', kind: 'building', id: selectedBuildingId },
          payload: {
            building_id: selectedBuildingId,
            floor_id: floorId,
            level: formData.level,
            label: formData.label,
            outline_geom: geomId
          },
          docs: [],
          note: `Floor added in revision #${submission.meta.revision_number}`
        };
        updates.topology_events = [...submission.topology_events, addFloorEvent];
      }

      onUpdate(updates);
      toast.success('Floor added');
    }

    setShowAddDialog(false);
  };

  const handleDeleteClick = (floor: Floor) => {
    setFloorToDelete(floor);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (!floorToDelete) return;
    
    // Remove floor and its components
    const { [floorToDelete.outline_geom]: _, ...remainingGeom } = submission.geometry_store;
    
    // Also remove geometries for components on this floor
    const componentsOnFloor = submission.components.filter(c => c.floor_id === floorToDelete.floor_id);
    let finalGeomStore = remainingGeom;
    componentsOnFloor.forEach(c => {
      const { [c.geom_ref]: _, ...rest } = finalGeomStore;
      finalGeomStore = rest;
    });
    
    onUpdate({
      floors: submission.floors.filter(f => f.floor_id !== floorToDelete.floor_id),
      components: submission.components.filter(c => c.floor_id !== floorToDelete.floor_id),
      geometry_store: finalGeomStore
    });
    
    toast.success('Floor and its components deleted');
    setShowDeleteDialog(false);
    setFloorToDelete(null);
  };

  // Duplicate floor with new ID
  const handleDuplicate = (floor: Floor) => {
    const geom = submission.geometry_store[floor.outline_geom];
    const newGeomId = generateUniqueGeomId('geom_fl', submission.geometry_store);
    const newFloorId = generateUniqueFloorId(floor.level + 1, submission.floors);
    
    const duplicatedFloor: Floor = {
      ...floor,
      floor_id: newFloorId,
      level: floor.level + 1,
      label: `${floor.label} (Copy)`,
      outline_geom: newGeomId,
      docs: []
    };

    onUpdate({
      floors: [...submission.floors, duplicatedFloor],
      geometry_store: {
        ...submission.geometry_store,
        [newGeomId]: { polygon: [...geom.polygon] }
      }
    });
    
    toast.success('Floor duplicated');
  };

  // Copy geometry to clipboard
  const handleCopyGeometry = (floor: Floor) => {
    const geom = submission.geometry_store[floor.outline_geom];
    if (geom) {
      const formatted = formatPolygon(geom.polygon);
      navigator.clipboard.writeText(formatted);
      toast.success('Geometry copied to clipboard');
    }
  };

  const handleDocsChange = (floorId: string, docs: DocRef[]) => {
    onUpdate({
      floors: submission.floors.map(f =>
        f.floor_id === floorId ? { ...f, docs } : f
      )
    });
  };

  // Get component count for a floor
  const getComponentCount = (floorId: string) => 
    submission.components.filter(c => c.floor_id === floorId && !c.active.to).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Step 3: Floors</h2>
          <p className="text-muted-foreground">Define floors within each building</p>
        </div>
      </div>

      {/* Revision Context Banner */}
      {isRevision && (
        <Alert className="border-blue-500/50 bg-blue-50 dark:bg-blue-950/20">
          <GitBranch className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            Adding floors to Revision #{submission.meta.revision_number}. 
            New floors will be tracked with topology events.
          </AlertDescription>
        </Alert>
      )}

      {/* Building Selector */}
      {submission.buildings.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select Building</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4 flex-wrap">
            <Select value={selectedBuildingId} onValueChange={setSelectedBuildingId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a building" />
              </SelectTrigger>
              <SelectContent>
                {submission.buildings.map((b) => (
                  <SelectItem key={b.building_id} value={b.building_id}>
                    <span className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      {b.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isEditable && selectedBuildingId && (
              <Button onClick={openAddDialog} className="gap-1">
                <Plus className="w-4 h-4" />
                Add Floor
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Add buildings first before defining floors</p>
          </CardContent>
        </Card>
      )}

      {/* Floors List */}
      {selectedBuildingId && (
        <>
          {buildingFloors.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Layers className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No floors defined for this building</p>
                {isEditable && (
                  <Button onClick={openAddDialog} className="mt-4" variant="outline">
                    Add your first floor
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {buildingFloors.map((floor) => (
                <Card 
                  key={floor.floor_id}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setSelectedEntity(floor)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Layers className="w-4 h-4 text-primary" />
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          floor.level < 0 
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        }`}>
                          L{floor.level}
                        </span>
                        {floor.label}
                      </CardTitle>
                      {isEditable && (
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyGeometry(floor);
                            }}
                            title="Copy Geometry"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicate(floor);
                            }}
                            title="Duplicate"
                          >
                            <CopyPlus className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog(floor);
                            }}
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(floor);
                            }}
                            title="Delete Floor"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <CardDescription className="font-mono text-xs">
                      ID: {floor.floor_id}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Outline:</span>
                        <span className="ml-2 font-mono text-xs">{floor.outline_geom}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Components:</span>
                        <span className="ml-2 font-medium">{getComponentCount(floor.floor_id)}</span>
                      </div>
                    </div>
                    <div className="mt-4" onClick={(e) => e.stopPropagation()}>
                      <DocumentPicker
                        value={floor.docs}
                        onChange={(docs) => handleDocsChange(floor.floor_id, docs)}
                        disabled={!isEditable}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFloor ? 'Edit Floor' : 'Add Floor'}</DialogTitle>
            <DialogDescription>
              Define floor level and outline geometry for {selectedBuilding?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Level * <span className="text-xs text-muted-foreground">(negative for basement)</span></Label>
                <Input
                  type="number"
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Label *</Label>
                <Input
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="e.g., Ground Floor"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Outline Polygon *</Label>
              <Textarea
                className="geometry-input min-h-24"
                value={formData.outline}
                onChange={(e) => setFormData({ ...formData, outline: e.target.value })}
                placeholder='[[10,10], [80,10], [80,80], [10,80], [10,10]]'
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Active From</Label>
                <Input
                  type="date"
                  value={formData.activeFrom}
                  onChange={(e) => setFormData({ ...formData, activeFrom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Active To (optional)</Label>
                <Input
                  type="date"
                  value={formData.activeTo}
                  onChange={(e) => setFormData({ ...formData, activeTo: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleSave}>
              {editingFloor ? 'Update' : 'Add'} Floor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Floor Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{floorToDelete?.label}</strong> (Level {floorToDelete?.level}) 
              and all <strong>{floorToDelete ? getComponentCount(floorToDelete.floor_id) : 0} components</strong> on it.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFloorToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Floor & Components
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FloorsStep;
