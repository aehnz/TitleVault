import React, { useState } from 'react';

import { Document, SubmissionPayload } from '@udhbha/types';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DocumentsEditorProps {
  submission: SubmissionPayload;
  documentIds: string[];
  onChange: (docs: string[]) => void;
  isEditable: boolean;
}

const DOC_TYPES = ['survey', 'plan', 'sale_deed', 'lease', 'title', 'permit', 'certificate', 'other'];

const DocumentsEditor: React.FC<DocumentsEditorProps> = ({ 
  submission, 
  documentIds, 
  onChange, 
  isEditable 
}) => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    type: 'survey',
    title: ''
  });

  const linkedDocs = submission.documents.filter(d => documentIds.includes(d.doc_id));

  const handleAddDocument = () => {
    if (!formData.title.trim()) {
      toast.error('Document title is required');
      return;
    }

    const newDocId = `doc_${Date.now()}`;
    const newDoc: Document = {
      doc_id: newDocId,
      type: formData.type,
      title: formData.title,
      hash: `hash_${Date.now()}`
    };

    // Add to documents array and link to entity
    const existingDocs = submission.documents.filter(d => d.doc_id !== newDocId);
    // Note: The parent component needs to handle adding the document to the submission
    // For now, we directly update via the context
    onChange([...documentIds, newDocId]);
    
    // We need to also add the document to the global documents array
    // This is a bit of a workaround since we're updating both the entity docs and global docs
    const updatedSubmission = {
      ...submission,
      documents: [...submission.documents, newDoc]
    };
    // The parent will handle this through onUpdate
    
    setShowAddDialog(false);
    setFormData({ type: 'survey', title: '' });
    toast.success('Document attached');
  };

  const handleRemoveDocument = (docId: string) => {
    onChange(documentIds.filter(id => id !== docId));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Documents ({documentIds.length})
        </Label>
        {isEditable && (
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-7 gap-1"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="w-3 h-3" />
            Attach
          </Button>
        )}
      </div>

      {linkedDocs.length > 0 && (
        <div className="space-y-1">
          {linkedDocs.map(doc => (
            <div 
              key={doc.doc_id} 
              className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary uppercase">
                  {doc.type}
                </span>
                <span className="truncate">{doc.title}</span>
              </div>
              {isEditable && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 flex-shrink-0 text-destructive"
                  onClick={() => handleRemoveDocument(doc.doc_id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {documentIds.length === 0 && (
        <p className="text-xs text-muted-foreground">No documents attached</p>
      )}

      {/* Add Document Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attach Document</DialogTitle>
            <DialogDescription>
              Add a document reference to this entity
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(v) => setFormData({ ...formData, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Document Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Parcel Survey Report"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddDocument}>Attach Document</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentsEditor;
