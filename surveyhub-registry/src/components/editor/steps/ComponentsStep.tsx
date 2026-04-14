import React, { useState } from 'react';

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
import { Component, DocRef, SubmissionPayload } from '@udhbha/types';


interface ComponentsStepProps {
  submission: SubmissionPayload;
  onUpdate: (updates: Partial<SubmissionPayload>) => void;
  isEditable: boolean;
  setSelectedEntity: (entity: any) => void;
}

const COMPONENT_TYPES = componentTypeList;

const ComponentsStep: React.FC<ComponentsStepProps> = ({ submission, onUpdate, isEditable, setSelectedEntity }) => {
  const [selectedFloorId, setSelectedFloorId] = useState<string>(
    submission.floors[0]?.floor_id || ''
  );
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [componentToDelete, setComponentToDelete] = useState<Component | null>(null);
  const [editingComponent, setEditingComponent] = useState<Component | null>(null);
  const [selectedForMerge, setSelectedForMerge] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    label: '',
    type: 'shop' as Component['type'],
    geometry: '',
    activeFrom: new Date().toISOString().split('T')[0],
    activeTo: ''
  });
  const [mergeLabel, setMergeLabel] = useState('');

  const selectedFloor = submission.floors.find(f => f.floor_id === selectedFloorId);
  const selectedBuilding = submission.buildings.find(b => b.building_id === selectedFloor?.building_id);
  const floorComponents = submission.components
    .filter(c => c.floor_id === selectedFloorId && !c.active.to);

  const openAddDialog = () => {
    setFormData({
      label: '',
      type: 'shop',
      geometry: '',
      activeFrom: new Date().toISOString().split('T')[0],
      activeTo: ''
    });
    setEditingComponent(null);
    setShowAddDialog(true);
  };

  const openEditDialog = (component: Component) => {
    const geom = submission.geometry_store[component.geom_ref];
    setFormData({
      label: component.label,
      type: component.type,
      geometry: geom ? formatPolygon(geom.polygon) : '',
      activeFrom: component.active.from,
      activeTo: component.active.to || ''
    });
    setEditingComponent(component);
    setShowAddDialog(true);
  };

  const handleSave = () => {
    if (!formData.label.trim()) {
      toast.error('Component label is required');
      return;
    }

    const polygon = parsePolygon(formData.geometry);
    if (!polygon) {
      toast.error('Invalid geometry polygon format');
      return;
    }

    const geomId = `geom_cmp_${Date.now()}`;
    const newGeometryStore = {
      ...submission.geometry_store,
      [geomId]: { polygon }
    };

    if (editingComponent) {
      const updatedComponents = submission.components.map(c =>
        c.component_id === editingComponent.component_id
          ? {
            ...c,
            label: formData.label,
            type: formData.type,
            geom_ref: geomId,
            active: {
              from: formData.activeFrom,
              to: formData.activeTo || null
            }
          }
          : c
      );

      // Log geometry correction event (RULE 9: complete payload, RULE 12: full ISO timestamp)
      const correctionEvent = {
        event_id: `evt_${Date.now()}`,
        kind: 'GEOMETRY_CORRECTION' as const,
        ts: new Date().toISOString(), // Full ISO timestamp
        target: { entity: 'COMPONENT' as const, kind: 'component' as const, id: editingComponent.component_id },
        payload: {
          component_id: editingComponent.component_id,
          prev_geom: editingComponent.geom_ref,
          new_geom: geomId
        },
        from_geom: editingComponent.geom_ref,
        to_geom: geomId,
        docs: [],
        note: 'Component geometry updated'
      };

      onUpdate({
        components: updatedComponents,
        geometry_store: newGeometryStore,
        topology_events: [...submission.topology_events, correctionEvent]
      });
      toast.success('Component updated');
    } else {
      const componentId = `cmp_${Date.now()}`;
      const newComponent: Component = {
        component_id: componentId,
        floor_id: selectedFloorId,
        label: formData.label,
        type: formData.type,
        geom_ref: geomId,
        active: {
          from: formData.activeFrom,
          to: formData.activeTo || null
        },
        docs: []
      };

      const isRevision = !!submission.meta.parent_submission_id;
      const updates: Partial<SubmissionPayload> = {
        components: [...submission.components, newComponent],
        geometry_store: newGeometryStore
      };

      // For revisions, add a topology event (RULE 9: complete payload)
      if (isRevision) {
        const addComponentEvent = {
          event_id: `evt_${Date.now() + 1}`,
          kind: 'ADD_COMPONENT' as const,
          ts: new Date().toISOString(),
          target: { entity: 'FLOOR' as const, kind: 'floor' as const, id: selectedFloorId },
          payload: {
            component_id: componentId,
            floor_id: selectedFloorId,
            label: formData.label,
            type: formData.type,
            geom_ref: geomId
          },
          component_id: componentId,
          docs: [],
          note: `Component added in revision #${submission.meta.revision_number}`
        };
        updates.topology_events = [...submission.topology_events, addComponentEvent];
      }

      onUpdate(updates);
      toast.success('Component added');
    }

    setShowAddDialog(false);
  };

  const handleDeactivate = (componentId: string) => {
    const today = new Date().toISOString();
    const todayDate = today.split('T')[0];

    const deactivateEvent = {
      event_id: `evt_${Date.now()}`,
      kind: 'DEACTIVATE_COMPONENT' as const,
      ts: today, // Full ISO timestamp
      target: { entity: 'COMPONENT' as const, kind: 'component' as const, id: componentId },
      payload: {
        component_id: componentId,
        effective_from: todayDate
      },
      component_id: componentId,
      docs: [],
      note: 'Component deactivated'
    };

    onUpdate({
      components: submission.components.map(c =>
        c.component_id === componentId
          ? { ...c, active: { ...c.active, to: todayDate } }
          : c
      ),
      topology_events: [...submission.topology_events, deactivateEvent]
    });
    toast.success('Component deactivated');
  };

  // Permanently delete a component (for freshly added ones)
  const handleDelete = (component: Component) => {
    setComponentToDelete(component);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (!componentToDelete) return;

    // Remove component and its geometry
    const { [componentToDelete.geom_ref]: _, ...remainingGeom } = submission.geometry_store;

    onUpdate({
      components: submission.components.filter(c => c.component_id !== componentToDelete.component_id),
      geometry_store: remainingGeom
    });

    toast.success('Component deleted permanently');
    setShowDeleteDialog(false);
    setComponentToDelete(null);
  };

  // Duplicate a component with new ID
  const handleDuplicate = (component: Component) => {
    const geom = submission.geometry_store[component.geom_ref];
    const newGeomId = `geom_cmp_${Date.now()}`;
    const newComponentId = `cmp_${Date.now()}`;

    const duplicatedComponent: Component = {
      ...component,
      component_id: newComponentId,
      label: `${component.label} (Copy)`,
      geom_ref: newGeomId,
      docs: []
    };

    onUpdate({
      components: [...submission.components, duplicatedComponent],
      geometry_store: {
        ...submission.geometry_store,
        [newGeomId]: { polygon: [...geom.polygon] }
      }
    });

    toast.success('Component duplicated');
  };

  // Copy geometry to clipboard
  const handleCopyGeometry = (component: Component) => {
    const geom = submission.geometry_store[component.geom_ref];
    if (geom) {
      const formatted = formatPolygon(geom.polygon);
      navigator.clipboard.writeText(formatted);
      toast.success('Geometry copied to clipboard');
    }
  };

  const handleMerge = () => {
    if (selectedForMerge.length < 2) {
      toast.error('Select at least 2 components to merge');
      return;
    }
    if (!mergeLabel.trim()) {
      toast.error('Merged component label is required');
      return;
    }

    const today = new Date().toISOString();
    const todayDate = today.split('T')[0];
    const inputComponents = submission.components.filter(c => selectedForMerge.includes(c.component_id));

    // Combine polygons (simplified: just use first one for now)
    const firstGeom = submission.geometry_store[inputComponents[0].geom_ref];
    const outputGeomId = `geom_merged_${Date.now()}`;
    const mergedComponentId = `cmp_merged_${Date.now()}`;

    const mergedComponent: Component = {
      component_id: mergedComponentId,
      floor_id: selectedFloorId,
      label: mergeLabel,
      type: inputComponents[0].type,
      geom_ref: outputGeomId,
      active: { from: todayDate, to: null },
      docs: []
    };

    const mergeEvent = {
      event_id: `evt_${Date.now()}`,
      kind: 'MERGE_COMPONENTS' as const,
      ts: today, // Full ISO timestamp
      target: { entity: 'FLOOR' as const, kind: 'floor' as const, id: selectedFloorId },
      payload: {
        inputs: selectedForMerge,
        output_component_id: mergedComponentId,
        output_geom: outputGeomId
      },
      inputs: selectedForMerge,
      output: mergedComponentId,
      output_geom: outputGeomId,
      docs: [],
      note: `Merged ${selectedForMerge.length} components`
    };

    // Deactivate input components
    const updatedComponents = submission.components.map(c =>
      selectedForMerge.includes(c.component_id)
        ? { ...c, active: { ...c.active, to: todayDate } }
        : c
    );

    onUpdate({
      components: [...updatedComponents, mergedComponent],
      geometry_store: {
        ...submission.geometry_store,
        [outputGeomId]: firstGeom
      },
      topology_events: [...submission.topology_events, mergeEvent]
    });

    setShowMergeDialog(false);
    setSelectedForMerge([]);
    setMergeLabel('');
    toast.success('Components merged successfully');
  };

  const handleDocsChange = (componentId: string, docs: DocRef[]) => {
    onUpdate({
      components: submission.components.map(c =>
        c.component_id === componentId ? { ...c, docs } : c
      )
    });
  };

  const toggleMergeSelection = (componentId: string) => {
    setSelectedForMerge(prev =>
      prev.includes(componentId)
        ? prev.filter(id => id !== componentId)
        : [...prev, componentId]
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Step 4: Components</h2>
          <p className="text-muted-foreground">Define components on each floor</p>
        </div>
      </div>

      {/* Floor Selector Bar - REDESIGNED for vertical stacking */}
      {submission.floors.length > 0 ? (
        <div className="bg-muted/30 border-2 rounded-xl p-6 shadow-sm ring-1 ring-black/5">
          <div className="flex flex-col gap-6">
            {/* Primary Selector Part */}
            <div className="flex-1 min-w-0 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70 ml-1">
                Active Selection Context
              </label>
              <Select value={selectedFloorId} onValueChange={setSelectedFloorId}>
                <SelectTrigger className="w-full bg-background border-2 h-14 text-base font-semibold px-4 ring-offset-background focus:ring-2 focus:ring-primary/20 transition-all">
                  <div className="flex items-center gap-3 w-full overflow-hidden">
                    <div className="bg-primary/10 p-2 rounded-lg text-primary shrink-0">
                      <Layers className="w-5 h-5" />
                    </div>
                    <SelectValue placeholder="Identify floor context" className="truncate" />
                  </div>
                </SelectTrigger>
                <SelectContent className="max-w-[400px]">
                  {submission.floors.map((f) => {
                    const building = submission.buildings.find(b => b.building_id === f.building_id);
                    return (
                      <SelectItem key={f.floor_id} value={f.floor_id} className="py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-sm leading-tight">{building?.name || 'Building'}</span>
                          <span className="text-xs text-muted-foreground opacity-80">Level {f.level}: {f.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Context Actions Part - Forced Vertical Stack for Containment */}
            {isEditable && selectedFloorId && (
              <div className="flex flex-col gap-3 w-full">
                <Button onClick={openAddDialog} className="w-full h-14 gap-2 text-md shadow-lg shadow-primary/10 px-8 rounded-xl font-bold">
                  <Plus className="w-5 h-5" />
                  <span>Add New Component</span>
                </Button>
                {floorComponents.length >= 2 && (
                  <Button
                    variant="outline"
                    onClick={() => setShowMergeDialog(true)}
                    className="w-full h-14 gap-2 border-2 bg-background hover:bg-muted px-8 rounded-xl font-bold"
                  >
                    <Merge className="w-5 h-5" />
                    <span>Merge Units</span>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Layers className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Add floors first before defining components</p>
          </CardContent>
        </Card>
      )}

      {/* Components Grid */}
      {selectedFloorId && (
        <>
          {floorComponents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Box className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No active components on this floor</p>
                {isEditable && (
                  <Button onClick={openAddDialog} className="mt-4" variant="outline">
                    Add your first component
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
              {floorComponents.map((component) => (
                <div
                  key={component.component_id}
                  className="group bg-card border-2 rounded-2xl overflow-hidden hover:border-primary transition-all duration-300 hover:shadow-xl flex flex-col min-h-[380px]"
                >
                  {/* Card Header & Tools - Stacked Layout */}
                  <div className="p-5 space-y-4 border-b bg-muted/5">
                    {/* Level 1: Identification */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-sm"
                            style={{ backgroundColor: `${defaultPreset.componentTypeColors[component.type as ComponentType]}10`, borderColor: `${defaultPreset.componentTypeColors[component.type as ComponentType]}40` }}
                          >
                            <Box
                              className="w-5 h-5 shrink-0"
                              style={{ color: defaultPreset.componentTypeColors[component.type as ComponentType] || defaultPreset.componentTypeColors.common }}
                            />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold tracking-tight leading-none group-hover:text-primary transition-colors">
                              {component.label}
                            </h3>
                            <div className="flex gap-1.5 mt-1.5 flex-wrap">
                              <span
                                className="text-[9px] uppercase font-black px-2 py-0.5 rounded tracking-tighter text-white shrink-0"
                                style={{ backgroundColor: defaultPreset.componentTypeColors[component.type as ComponentType] || defaultPreset.componentTypeColors.common }}
                              >
                                {component.type}
                              </span>
                              <span className="bg-muted/80 px-2 py-0.5 rounded border text-[10px] font-mono text-muted-foreground uppercase tracking-tighter">
                                ID: {component.component_id.slice(-8)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Level 2: Core Actions - Dedicated Row to ensure width containment */}
                    {isEditable && (
                      <div className="grid grid-cols-5 gap-1 bg-muted/30 p-1 rounded-xl border-2 border-dashed">
                        {[
                          { icon: Copy, title: "Copy Geometry", action: () => handleCopyGeometry(component), color: "text-muted-foreground" },
                          { icon: CopyPlus, title: "Duplicate", action: () => handleDuplicate(component), color: "text-muted-foreground" },
                          { icon: Edit, title: "Edit Properties", action: () => openEditDialog(component), color: "text-primary" },
                          { icon: AlertTriangle, title: "Deactivate", action: () => handleDeactivate(component.component_id), color: "text-orange-500" },
                          { icon: Trash2, title: "Purge Record", action: () => handleDelete(component), color: "text-destructive" }
                        ].map((btn, idx) => (
                          <Button
                            key={idx}
                            size="icon"
                            variant="ghost"
                            className={cn("h-10 w-full hover:bg-background rounded-lg transition-all", btn.color)}
                            onClick={(e) => { e.stopPropagation(); btn.action(); }}
                            title={btn.title}
                          >
                            <btn.icon className="w-4 h-4" />
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Body: Metadata & Documentation */}
                  <div className="p-5 flex-1 flex flex-col gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <div className="w-1 h-3 bg-primary/30 rounded-full" />
                        Infrastructure Hook
                      </label>
                      <div className="bg-muted/40 p-3 rounded-xl border border-dashed flex items-center justify-between gap-4 overflow-hidden">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight shrink-0">Geometry Reference</span>
                        <span className="text-[10px] font-mono bg-background px-1.5 py-0.5 rounded border shadow-sm truncate">{component.geom_ref}</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t-2 border-dashed mt-auto">
                      {/* Document area - Using vertical tools if horizontal overflow is likely */}
                      <div className="rounded-xl bg-orange-50/10" onClick={(e) => e.stopPropagation()}>
                        <DocumentPicker
                          value={component.docs}
                          onChange={(docs) => handleDocsChange(component.component_id, docs)}
                          disabled={!isEditable}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingComponent ? 'Edit Component' : 'Add Component'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Label *</Label>
                <Input
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="e.g., Shop G-101"
                />
              </div>
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v as Component['type'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPONENT_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Geometry Polygon *</Label>
              <Textarea
                className="geometry-input min-h-24"
                value={formData.geometry}
                onChange={(e) => setFormData({ ...formData, geometry: e.target.value })}
                placeholder='[[18,20], [38,22], [36,40], [20,38], [18,20]]'
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
              {editingComponent ? 'Update' : 'Add'} Component
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Dialog */}
      <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Components</DialogTitle>
            <DialogDescription>
              Select components to merge and provide a new label
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              {floorComponents.map(c => (
                <div key={c.component_id} className="flex items-center gap-3 p-2 rounded hover:bg-muted">
                  <Checkbox
                    checked={selectedForMerge.includes(c.component_id)}
                    onCheckedChange={() => toggleMergeSelection(c.component_id)}
                  />
                  <span>{c.label} ({c.type})</span>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label>New Component Label *</Label>
              <Input
                value={mergeLabel}
                onChange={(e) => setMergeLabel(e.target.value)}
                placeholder="e.g., Merged Unit"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMergeDialog(false)}>Cancel</Button>
            <Button onClick={handleMerge} disabled={selectedForMerge.length < 2}>
              Merge {selectedForMerge.length} Components
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Component Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{componentToDelete?.label}</strong> and its geometry.
              This action cannot be undone. Use "Deactivate" if you want to preserve history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setComponentToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ComponentsStep;
