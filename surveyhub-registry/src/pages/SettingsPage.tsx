import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Database, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CollapsibleSection from '@/components/shared/CollapsibleSection';
import { saveSubmission } from '@/lib/storage';
import { COMPLEX_DEMO_SUBMISSION } from '@/lib/complexDemoData';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();

  const handleClearData = () => {
    if (confirm('Are you sure you want to clear all local data? This cannot be undone.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleLoadComplexDemo = () => {
    saveSubmission(COMPLEX_DEMO_SUBMISSION);
    toast.success('Complex demo data loaded!');
    navigate(`/app/viewer/${COMPLEX_DEMO_SUBMISSION.meta.submission_id}`);
  };

  const handleExportComplexJson = () => {
    const jsonString = JSON.stringify(COMPLEX_DEMO_SUBMISSION, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'complex_building_demo.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Complex JSON exported');
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage application preferences</p>
      </div>

      <CollapsibleSection title="Data Management" icon={<Database className="w-4 h-4" />} variant="card">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Clear All Data</p>
              <p className="text-sm text-muted-foreground">
                Remove all submissions and user data from local storage
              </p>
            </div>
            <Button variant="destructive" size="sm" onClick={handleClearData} className="gap-1">
              <Trash2 className="w-4 h-4" />
              Clear Data
            </Button>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Demo Data" icon={<Download className="w-4 h-4" />} variant="card">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Load Complex Building Demo</p>
              <p className="text-sm text-muted-foreground">
                3 buildings, 15 floors, 25+ components, multiple claims
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLoadComplexDemo} className="gap-1">
              <Database className="w-4 h-4" />
              Load Demo
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Export Complex JSON</p>
              <p className="text-sm text-muted-foreground">
                Download the complex building structure as JSON file
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportComplexJson} className="gap-1">
              <Download className="w-4 h-4" />
              Export JSON
            </Button>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="About" variant="card" defaultOpen={false}>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p><strong>Surveyor Panel</strong> - Property Registry System</p>
          <p>Version: 1.0.0</p>
          <p>Schema Version: v1</p>
          <p>This application uses localStorage for data persistence.</p>
        </div>
      </CollapsibleSection>
    </div>
  );
};

export default SettingsPage;
