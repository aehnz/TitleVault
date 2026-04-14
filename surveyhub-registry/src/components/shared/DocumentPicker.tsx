import React, { useState, useEffect, useRef } from 'react';

import {
  storeDocument,
  listDocuments,
  previewDocument,
  getStorageStatus
} from '@/lib/documentStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Plus,
  FileText,
  Trash2,
  Eye,
  Upload,
  Library,
  Check,
  AlertCircle
} from 'lucide-react';
import { DOC_TYPE_COLORS, DOC_TYPE_LABELS, DocRef, DocumentType } from '@udhbha/types';


interface DocumentPickerProps {
  value: DocRef[];
  onChange: (docs: DocRef[]) => void;
  disabled?: boolean;
  label?: string;
}

const DOC_TYPES: DocumentType[] = [
  'survey', 'plan', 'sale_deed', 'lease', 'title',
  'permit', 'certificate', 'mortgage', 'court_order', 'agreement', 'other'
];

interface DocWithStatus extends DocRef {
  status?: 'LOCAL' | 'MISSING';
}

const DocumentPicker: React.FC<DocumentPickerProps> = ({
  value,
  onChange,
  disabled = false,
  label = 'Documents'
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showLibraryPopover, setShowLibraryPopover] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    type: 'other' as DocumentType
  });
  const [docsWithStatus, setDocsWithStatus] = useState<DocWithStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Load status for each doc
  useEffect(() => {
    let active = true;
    const loadStatuses = async () => {
      const withStatus = await Promise.all(
        value.map(async (doc) => {
          try {
            // Add timeout to prevent hanging on IndexedDB
            const statusPromise = getStorageStatus(doc.id);
            const timeoutPromise = new Promise<'MISSING'>(resolve => setTimeout(() => resolve('MISSING'), 1000));
            const status = await Promise.race([statusPromise, timeoutPromise]);
            return { ...doc, status };
          } catch {
            return { ...doc, status: 'MISSING' as const };
          }
        })
      );
      if (active) setDocsWithStatus(withStatus);
    };
    loadStatuses();
    return () => { active = false; };
  }, [value]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Only PDF files are supported');
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      setUploadForm({
        name: file.name.replace(/\.pdf$/i, ''),
        type: 'other'
      });
      setShowUploadDialog(true);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Upload the file
  const handleUpload = async () => {
    if (!selectedFile || !uploadForm.name.trim()) {
      toast.error('Please provide a document name');
      return;
    }

    setIsUploading(true);
    try {
      const { docRef } = await storeDocument(
        selectedFile,
        { name: uploadForm.name.trim(), type: uploadForm.type },
        user?.email || 'unknown'
      );

      // Check for duplicates
      if (value.some(d => d.id === docRef.id)) {
        toast.warning('Document already attached');
      } else {
        onChange([...value, docRef]);
        toast.success('Document uploaded and attached');
      }

      setShowUploadDialog(false);
      setSelectedFile(null);
    } catch (error) {
      toast.error('Failed to upload document');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  // Select from library
  const handleSelectFromLibrary = (docMeta: { id: string; name: string; type: string }) => {
    // Check for duplicates
    if (value.some(d => d.id === docMeta.id)) {
      toast.warning('Document already attached');
      return;
    }

    const docRef: DocRef = {
      id: docMeta.id,
      name: docMeta.name,
      type: docMeta.type as DocumentType
    };

    onChange([...value, docRef]);
    setShowLibraryPopover(false);
    toast.success('Document attached');
  };

  // Remove document reference (NOT the file)
  const handleRemove = (docId: string) => {
    onChange(value.filter(d => d.id !== docId));
  };

  // Preview document
  const handlePreview = async (docId: string) => {
    await previewDocument(docId);
  };

  const libraryDocs = listDocuments();

  // Filter out already attached docs from library
  const availableLibraryDocs = libraryDocs.filter(
    doc => !value.some(v => v.id === doc.id)
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-1 pb-1">
        <Label className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary/70 flex items-center gap-2 min-w-fit">
          <FileText className="w-3.5 h-3.5" />
          {label} <span className="bg-primary/10 px-1.5 py-0.5 rounded-full text-[9px]">{value.length}</span>
        </Label>
        {!disabled && (
          <div className="flex items-center gap-1 ml-auto">
            {/* Upload Button */}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-6 text-[9px] gap-1 px-1.5 border-primary/20 hover:bg-primary/5 shadow-none shrink-0"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-3 h-3" />
              Upload
            </Button>

            {/* Library Button */}
            <Popover open={showLibraryPopover} onOpenChange={setShowLibraryPopover}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-6 text-[9px] gap-1 px-1.5 border-primary/20 hover:bg-primary/5 shadow-none shrink-0"
                >
                  <Library className="w-3 h-3" />
                  Library
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-2" align="end">
                <div className="text-sm font-medium mb-2">Select from Library</div>
                {availableLibraryDocs.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    No documents in library
                  </p>
                ) : (
                  <ScrollArea className="h-48">
                    <div className="space-y-1">
                      {availableLibraryDocs.map(doc => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-2 rounded hover:bg-muted cursor-pointer"
                          onClick={() => handleSelectFromLibrary(doc)}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge
                              variant="secondary"
                              className={cn("text-[10px] px-1.5", DOC_TYPE_COLORS[doc.type] || DOC_TYPE_COLORS.other)}
                            >
                              {doc.type}
                            </Badge>
                            <span className="text-sm truncate">{doc.name}</span>
                          </div>
                          <Plus className="w-3 h-3 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </PopoverContent>
            </Popover>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        )}
      </div>

      {/* Attached documents list */}
      {value.length > 0 ? (
        <div className="space-y-1">
          {value.map(doc => {
            const docWithStatus = docsWithStatus.find(d => d.id === doc.id);
            const status = docWithStatus?.status;

            return (
              <div
                key={doc.id}
                className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Badge
                    variant="secondary"
                    className={cn("text-[10px] px-1.5 shrink-0", DOC_TYPE_COLORS[doc.type] || DOC_TYPE_COLORS.other)}
                  >
                    {doc.type}
                  </Badge>
                  <span className="truncate">{doc.name}</span>
                  {status === 'LOCAL' ? (
                    <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                  ) : status === 'MISSING' ? (
                    <span title="File missing">
                      <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                    </span>
                  ) : null}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {status === 'LOCAL' && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => handlePreview(doc.id)}
                      title="Preview"
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                  )}
                  {!disabled && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-destructive"
                      onClick={() => handleRemove(doc.id)}
                      title="Remove reference"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No documents attached</p>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Add a PDF document to the library and attach it
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedFile && (
              <div className="p-3 bg-muted rounded text-sm">
                <span className="font-medium">File:</span> {selectedFile.name}
                <span className="text-muted-foreground ml-2">
                  ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            )}
            <div className="space-y-2">
              <Label>Document Name *</Label>
              <Input
                value={uploadForm.name}
                onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                placeholder="e.g., Sale Deed G-101"
              />
            </div>
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select
                value={uploadForm.type}
                onValueChange={(v) => setUploadForm({ ...uploadForm, type: v as DocumentType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {DOC_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUploadDialog(false);
                setSelectedFile(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={isUploading}>
              {isUploading ? 'Uploading...' : 'Upload & Attach'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentPicker;
