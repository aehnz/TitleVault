// ============================================
// SETTINGS PAGE
// Demo toggles and strict mode configuration
// ============================================

import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';

export function SettingsPage() {
  const { settings, updateSetting, resetToDefaults } = useAuditorSettings();

  const handleReset = () => {
    resetToDefaults();
    toast.success('Settings reset to defaults');
  };

  return (
    <>
      <AuditorHeader
        title="Settings"
        subtitle="Configure auditor panel behavior"
      />
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto p-6 space-y-6">
          {/* Strict Mode */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" />
                Validation Mode
              </CardTitle>
              <CardDescription>
                Configure how strictly the auditor enforces validation rules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="strict-mode" className="text-base">
                    Strict Mode
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, requires all documents to be viewable and blocks PASS if any required doc cannot be verified
                  </p>
                </div>
                <Switch
                  id="strict-mode"
                  checked={settings.strictMode}
                  onCheckedChange={(checked) => updateSetting('strictMode', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="require-checks" className="text-base">
                    Require Checks Before Decision
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Auditor must run geometry, rights, and document checks before submitting any decision
                  </p>
                </div>
                <Switch
                  id="require-checks"
                  checked={settings.requireChecksBeforeDecision}
                  onCheckedChange={(checked) => updateSetting('requireChecksBeforeDecision', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Document Requirements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Document Requirements
              </CardTitle>
              <CardDescription>
                Configure which documents are required for different event types
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="require-docs" className="text-base">
                    Require Documents by Rules
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Enforce document requirements based on event types (e.g., sale_deed for ownership transfers)
                  </p>
                </div>
                <Switch
                  id="require-docs"
                  checked={settings.requireDocsByRules}
                  onCheckedChange={(checked) => updateSetting('requireDocsByRules', checked)}
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <Label htmlFor="doc-preset">Document Requirement Preset</Label>
                <Select
                  value={settings.docRequirementPreset}
                  onValueChange={(value: DocRequirementPreset) => 
                    updateSetting('docRequirementPreset', value)
                  }
                >
                  <SelectTrigger id="doc-preset" className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hackathon">
                      <div className="flex flex-col items-start">
                        <span>Hackathon</span>
                        <span className="text-xs text-muted-foreground">Minimal requirements</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="strict">
                      <div className="flex flex-col items-start">
                        <span>Strict</span>
                        <span className="text-xs text-muted-foreground">Full compliance</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="relaxed">
                      <div className="flex flex-col items-start">
                        <span>Relaxed</span>
                        <span className="text-xs text-muted-foreground">Warnings only</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="p-3 bg-muted/50 rounded-lg text-sm">
                  <strong>Hackathon preset rules:</strong>
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    <li>• ADD_FLOOR → requires <code className="bg-muted px-1 rounded">plan</code> document</li>
                    <li>• TRANSFER_OWNERSHIP → requires <code className="bg-muted px-1 rounded">sale_deed</code> document</li>
                    <li>• ADD_OWNERSHIP → requires <code className="bg-muted px-1 rounded">sale_deed</code> document</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reset */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Reset Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={handleReset} className="gap-2">
                <RotateCcw className="w-4 h-4" />
                Reset to Defaults
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
