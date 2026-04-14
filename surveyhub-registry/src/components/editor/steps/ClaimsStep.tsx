import React, { useState } from 'react';

import { toast } from 'sonner';
import DocumentPicker from '@/components/shared/DocumentPicker';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Claim, DocRef, SubmissionPayload } from '@udhbha/types';


interface ClaimsStepProps {
  submission: SubmissionPayload;
  onUpdate: (updates: Partial<SubmissionPayload>) => void;
  isEditable: boolean;
  setSelectedEntity: (entity: any) => void;
}

const CLAIM_KINDS = claimKindList;
const TARGET_KINDS = ['parcel', 'building', 'floor', 'component'] as const;

const ClaimsStep: React.FC<ClaimsStepProps> = ({ submission, onUpdate, isEditable, setSelectedEntity }) => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingClaim, setEditingClaim] = useState<Claim | null>(null);
  const [formData, setFormData] = useState({
    kind: 'OWNERSHIP' as Claim['kind'],
    targetKind: 'component' as Claim['target']['kind'],
    targetId: '',
    holder: '',
    tenant: '',
    share: '1.0',
    areaGeom: '',
    activeFrom: new Date().toISOString().split('T')[0],
    activeTo: ''
  });

  const getTargetOptions = (kind: Claim['target']['kind']) => {
    switch (kind) {
      case 'parcel':
        return [{ id: submission.parcel.parcel_id, label: submission.parcel.name || 'Parcel' }];
      case 'building':
        return submission.buildings.map(b => ({ id: b.building_id, label: b.name }));
      case 'floor':
        return submission.floors.map(f => ({ id: f.floor_id, label: `L${f.level}: ${f.label}` }));
      case 'component':
        return submission.components.filter(c => !c.active.to).map(c => ({ id: c.component_id, label: c.label }));
      default:
        return [];
    }
  };

  const openAddDialog = () => {
    setFormData({
      kind: 'OWNERSHIP',
      targetKind: 'component',
      targetId: '',
      holder: '',
      tenant: '',
      share: '1.0',
      areaGeom: '',
      activeFrom: new Date().toISOString().split('T')[0],
      activeTo: ''
    });
    setEditingClaim(null);
    setShowAddDialog(true);
  };

  const openEditDialog = (claim: Claim) => {
    setFormData({
      kind: claim.kind,
      targetKind: claim.target.kind,
      targetId: claim.target.id,
      holder: claim.holder,
      tenant: claim.tenant,
      share: claim.share.toString(),
      areaGeom: claim.area_geom || '',
      activeFrom: claim.active.from,
      activeTo: claim.active.to || ''
    });
    setEditingClaim(claim);
    setShowAddDialog(true);
  };

  const handleSave = () => {
    if (!formData.targetId) {
      toast.error('Target is required');
      return;
    }

    let areaGeomId: string | null = null;
    if (formData.areaGeom.trim()) {
      const polygon = parsePolygon(formData.areaGeom);
      if (!polygon) {
        toast.error('Invalid area geometry polygon format');
        return;
      }
      areaGeomId = `geom_claim_${Date.now()}`;
      onUpdate({
        geometry_store: {
          ...submission.geometry_store,
          [areaGeomId]: { polygon }
        }
      });
    }

    if (editingClaim) {
      const updatedClaims = submission.claims.map(c =>
        c.claim_id === editingClaim.claim_id
          ? {
              ...c,
              kind: formData.kind,
              target: { kind: formData.targetKind, id: formData.targetId },
              holder: formData.holder,
              tenant: formData.tenant,
              share: parseFloat(formData.share),
              area_geom: areaGeomId,
              active: { from: formData.activeFrom, to: formData.activeTo || null }
            }
          : c
      );
      onUpdate({ claims: updatedClaims });
      toast.success('Claim updated');
    } else {
      const newClaim: Claim = {
        claim_id: `clm_${Date.now()}`,
        kind: formData.kind,
        target: { kind: formData.targetKind, id: formData.targetId },
        holder: formData.holder,
        tenant: formData.tenant,
        share: parseFloat(formData.share),
        area_geom: areaGeomId,
        active: { from: formData.activeFrom, to: formData.activeTo || null },
        docs: []
      };
      onUpdate({ claims: [...submission.claims, newClaim] });
      toast.success('Claim added');
    }

    setShowAddDialog(false);
  };

  const handleDelete = (claimId: string) => {
    onUpdate({
      claims: submission.claims.filter(c => c.claim_id !== claimId)
    });
    toast.success('Claim removed');
  };

  const handleDocsChange = (claimId: string, docs: DocRef[]) => {
    onUpdate({
      claims: submission.claims.map(c =>
        c.claim_id === claimId ? { ...c, docs } : c
      )
    });
  };

  const getClaimColor = (kind: ClaimKind) => defaultPreset.claimKindColors[kind];

  const getClaimColorStyle = (kind: ClaimKind) => ({
    borderLeftColor: getClaimColor(kind),
    borderLeftWidth: '4px'
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Step 5: Rights / Claims</h2>
          <p className="text-muted-foreground">Define ownership, leases, disputes, and occupancy</p>
        </div>
        {isEditable && (
          <Button onClick={openAddDialog} className="gap-1">
            <Plus className="w-4 h-4" />
            Add Claim
          </Button>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        {CLAIM_KINDS.map(kind => (
          <span key={kind} className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded" 
              style={{ backgroundColor: getClaimColor(kind) }} 
            /> 
            <span className="capitalize">{kind.toLowerCase()}</span>
          </span>
        ))}
      </div>

      {submission.claims.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Gavel className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No claims defined yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {submission.claims.map((claim) => (
            <Card 
              key={claim.claim_id}
              className="cursor-pointer hover:shadow-md transition-all"
              style={getClaimColorStyle(claim.kind as ClaimKind)}
              onClick={() => setSelectedEntity(claim)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Gavel className="w-4 h-4" />
                    {claim.kind}
                    <span className="text-xs text-muted-foreground font-normal">
                      on {claim.target.kind}: {claim.target.id}
                    </span>
                  </CardTitle>
                  {isEditable && (
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(claim);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(claim.claim_id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <CardDescription className="font-mono text-xs">
                  ID: {claim.claim_id}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Holder:</span>
                    <span className="ml-2">{claim.holder || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tenant:</span>
                    <span className="ml-2">{claim.tenant || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Share:</span>
                    <span className="ml-2">{claim.share * 100}%</span>
                  </div>
                </div>
                <div className="mt-4" onClick={(e) => e.stopPropagation()}>
                  <DocumentPicker
                    value={claim.docs}
                    onChange={(docs) => handleDocsChange(claim.claim_id, docs)}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingClaim ? 'Edit Claim' : 'Add Claim'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Claim Type *</Label>
                <Select 
                  value={formData.kind} 
                  onValueChange={(v) => setFormData({ ...formData, kind: v as Claim['kind'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLAIM_KINDS.map(kind => (
                      <SelectItem key={kind} value={kind}>{kind}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target Type *</Label>
                <Select 
                  value={formData.targetKind} 
                  onValueChange={(v) => setFormData({ ...formData, targetKind: v as Claim['target']['kind'], targetId: '' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TARGET_KINDS.map(kind => (
                      <SelectItem key={kind} value={kind}>{kind}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Target *</Label>
              <Select 
                value={formData.targetId} 
                onValueChange={(v) => setFormData({ ...formData, targetId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select target" />
                </SelectTrigger>
                <SelectContent>
                  {getTargetOptions(formData.targetKind).map(opt => (
                    <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Holder</Label>
                <Input
                  value={formData.holder}
                  onChange={(e) => setFormData({ ...formData, holder: e.target.value })}
                  placeholder="e.g., did:user:ali"
                />
              </div>
              <div className="space-y-2">
                <Label>Tenant</Label>
                <Input
                  value={formData.tenant}
                  onChange={(e) => setFormData({ ...formData, tenant: e.target.value })}
                  placeholder="e.g., did:user:tenant"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Share (0.0 - 1.0)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={formData.share}
                onChange={(e) => setFormData({ ...formData, share: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Area Mask Polygon (optional)</Label>
              <Textarea
                className="geometry-input min-h-20"
                value={formData.areaGeom}
                onChange={(e) => setFormData({ ...formData, areaGeom: e.target.value })}
                placeholder='[[x,y], [x,y], ...]'
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
              {editingClaim ? 'Update' : 'Add'} Claim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClaimsStep;
