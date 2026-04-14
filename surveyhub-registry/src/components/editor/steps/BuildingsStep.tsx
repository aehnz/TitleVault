import React, { useState } from 'react';

import { Building, DocRef, SubmissionPayload } from '@udhbha/types';
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

interface BuildingsStepProps {
  submission: SubmissionPayload;
  onUpdate: (updates: Partial<SubmissionPayload>) => void;
  isEditable: boolean;
  setSelectedEntity: (entity: any) => void;
}

const BuildingsStep: React.FC<BuildingsStepProps> = ({ submission, onUpdate, isEditable, setSelectedEntity }) => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [buildingToDelete, setBuildingToDelete] = useState<Building | null>(null);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    footprint: ''
  });

  const openAddDialog = () => {
    setFormData({ name: '', footprint: '' });
    setEditingBuilding(null);
    setShowAddDialog(true);
  };

  const openEditDialog = (building: Building) => {
    const geom = submission.geometry_store[building.footprint_geom];
    setFormData({
      name: building.name,
      footprint: geom ? formatPolygon(geom.polygon) : ''
    });
    setEditingBuilding(building);
    setShowAddDialog(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Building name is required');
      return;
    }

    const polygon = parsePolygon(formData.footprint);
    if (!polygon) {
      toast.error('Invalid footprint polygon format');
      return;
    }

    const geomId = `geom_bld_${Date.now()}`;
    const newGeometryStore = {
      ...submission.geometry_store,
      [geomId]: { polygon }
    };

    if (editingBuilding) {
      // Update existing
      const updatedBuildings = submission.buildings.map(b => 
        b.building_id === editingBuilding.building_id
          ? { ...b, name: formData.name, footprint_geom: geomId }
          : b
      );
      onUpdate({
        buildings: updatedBuildings,
        geometry_store: newGeometryStore
      });
      toast.success('Building updated');
    } else {
      // Add new
      const newBuilding: Building = {
        building_id: `bld_${Date.now()}`,
        parcel_id: submission.parcel.parcel_id,
        name: formData.name,
        footprint_geom: geomId,
        docs: []
      };
      onUpdate({
        buildings: [...submission.buildings, newBuilding],
        geometry_store: newGeometryStore
      });
      toast.success('Building added');
    }

    setShowAddDialog(false);
  };

  const handleDeleteClick = (building: Building) => {
    setBuildingToDelete(building);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (!buildingToDelete) return;
    
    // Get related floors and components
    const floorIds = submission.floors.filter(f => f.building_id === buildingToDelete.building_id).map(f => f.floor_id);
    
    // Remove geometry for building
    const { [buildingToDelete.footprint_geom]: _, ...remainingGeom } = submission.geometry_store;
    
    // Also remove floor and component geometries
    let finalGeomStore = remainingGeom;
    submission.floors
      .filter(f => f.building_id === buildingToDelete.building_id)
      .forEach(f => {
        const { [f.outline_geom]: _, ...rest } = finalGeomStore;
        finalGeomStore = rest;
      });
    submission.components
      .filter(c => floorIds.includes(c.floor_id))
      .forEach(c => {
        const { [c.geom_ref]: _, ...rest } = finalGeomStore;
        finalGeomStore = rest;
      });
    
    onUpdate({
      buildings: submission.buildings.filter(b => b.building_id !== buildingToDelete.building_id),
      floors: submission.floors.filter(f => f.building_id !== buildingToDelete.building_id),
      components: submission.components.filter(c => !floorIds.includes(c.floor_id)),
      geometry_store: finalGeomStore
    });
    
    toast.success('Building and related entities removed');
    setShowDeleteDialog(false);
    setBuildingToDelete(null);
  };

  // Duplicate building with new ID
  const handleDuplicate = (building: Building) => {
    const geom = submission.geometry_store[building.footprint_geom];
    const newGeomId = `geom_bld_${Date.now()}`;
    const newBuildingId = `bld_${Date.now()}`;
    
    const duplicatedBuilding: Building = {
      ...building,
      building_id: newBuildingId,
      name: `${building.name} (Copy)`,
      footprint_geom: newGeomId,
      docs: []
    };

    onUpdate({
      buildings: [...submission.buildings, duplicatedBuilding],
      geometry_store: {
        ...submission.geometry_store,
        [newGeomId]: { polygon: [...geom.polygon] }
      }
    });
    
    toast.success('Building duplicated');
  };

  // Copy geometry to clipboard
  const handleCopyGeometry = (building: Building) => {
    const geom = submission.geometry_store[building.footprint_geom];
    if (geom) {
      const formatted = formatPolygon(geom.polygon);
      navigator.clipboard.writeText(formatted);
      toast.success('Geometry copied to clipboard');
    }
  };

  const handleDocsChange = (buildingId: string, docs: DocRef[]) => {
    onUpdate({
      buildings: submission.buildings.map(b =>
        b.building_id === buildingId ? { ...b, docs } : b
      )
    });
  };

  // Get floor and component counts
  const getFloorCount = (buildingId: string) => 
    submission.floors.filter(f => f.building_id === buildingId).length;
  
  const getComponentCount = (buildingId: string) => {
    const floorIds = submission.floors.filter(f => f.building_id === buildingId).map(f => f.floor_id);
    return submission.components.filter(c => floorIds.includes(c.floor_id) && !c.active.to).length;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Step 2: Buildings</h2>
          <p className="text-muted-foreground">Define buildings within the parcel</p>
        </div>
        {isEditable && (
          <Button onClick={openAddDialog} className="gap-1">
            <Plus className="w-4 h-4" />
            Add Building
          </Button>
        )}
      </div>

      {submission.buildings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No buildings defined yet</p>
            {isEditable && (
              <Button onClick={openAddDialog} className="mt-4" variant="outline">
                Add your first building
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {submission.buildings.map((building) => (
            <Card 
              key={building.building_id} 
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedEntity(building)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    {building.name}
                  </CardTitle>
                  {isEditable && (
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyGeometry(building);
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
                          handleDuplicate(building);
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
                          openEditDialog(building);
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
                          handleDeleteClick(building);
                        }}
                        title="Delete Building"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <CardDescription className="font-mono text-xs">
                  ID: {building.building_id}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Footprint:</span>
                    <span className="ml-2 font-mono text-xs">{building.footprint_geom}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Floors:</span>
                    <span className="ml-2 font-medium">{getFloorCount(building.building_id)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Components:</span>
                    <span className="ml-2 font-medium">{getComponentCount(building.building_id)}</span>
                  </div>
                </div>
                <div className="mt-4" onClick={(e) => e.stopPropagation()}>
                  <DocumentPicker
                    value={building.docs}
                    onChange={(docs) => handleDocsChange(building.building_id, docs)}
                    disabled={!isEditable}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBuilding ? 'Edit Building' : 'Add Building'}</DialogTitle>
            <DialogDescription>
              Define building name and footprint geometry
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Building Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Main Building"
              />
            </div>
            <div className="space-y-2">
              <Label>Footprint Polygon *</Label>
              <Textarea
                className="geometry-input min-h-24"
                value={formData.footprint}
                onChange={(e) => setFormData({ ...formData, footprint: e.target.value })}
                placeholder='[[10,10], [80,10], [80,80], [10,80], [10,10]]'
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleSave}>
              {editingBuilding ? 'Update' : 'Add'} Building
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Building Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{buildingToDelete?.name}</strong> along with:
              <ul className="list-disc ml-6 mt-2">
                <li><strong>{buildingToDelete ? getFloorCount(buildingToDelete.building_id) : 0}</strong> floors</li>
                <li><strong>{buildingToDelete ? getComponentCount(buildingToDelete.building_id) : 0}</strong> components</li>
              </ul>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBuildingToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BuildingsStep;
