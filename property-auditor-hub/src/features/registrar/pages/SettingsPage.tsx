// ============================================
// REGISTRAR SETTINGS PAGE
// Configuration for registrar behavior
// ============================================

import { toast } from 'sonner';

export function SettingsPage() {
  const { settings, updateSetting, resetToDefaults } = useRegistrarSettings();

  const handleReset = () => {
    resetToDefaults();
    toast.success('Settings reset to defaults');
  };

  return (
    <>
      <RegistrarHeader />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">Registrar Settings</h1>
            <p className="text-muted-foreground">
              Configure registrar panel behavior and approval rules
            </p>
          </div>

          {/* Chain & Anchoring */}
          <Card>
            <CardHeader>
              <CardTitle>Blockchain Anchoring</CardTitle>
              <CardDescription>
                Control blockchain integration settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Demo Chain Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Use simulated blockchain transactions
                  </p>
                </div>
                <Switch
                  checked={settings.demoChainEnabled}
                  onCheckedChange={(v) => updateSetting('demoChainEnabled', v)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Approve Without Anchor</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow final approval without blockchain anchoring
                  </p>
                </div>
                <Switch
                  checked={settings.allowApproveWithoutAnchor}
                  onCheckedChange={(v) => updateSetting('allowApproveWithoutAnchor', v)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Approval Rules */}
          <Card>
            <CardHeader>
              <CardTitle>Approval Rules</CardTitle>
              <CardDescription>
                Configure requirements for final approval
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Strict Audit Pass Required</Label>
                  <p className="text-sm text-muted-foreground">
                    Only approve submissions with AUDIT_PASSED status and PASS decision
                  </p>
                </div>
                <Switch
                  checked={settings.strictApproveOnlyAuditPass}
                  onCheckedChange={(v) => updateSetting('strictApproveOnlyAuditPass', v)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Transparency */}
          <Card>
            <CardHeader>
              <CardTitle>Transparency Options</CardTitle>
              <CardDescription>
                Configure public transparency bundle generation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Masking Options</Label>
                  <p className="text-sm text-muted-foreground">
                    Display holder and document masking toggles in transparency tab
                  </p>
                </div>
                <Switch
                  checked={settings.showMaskingOptions}
                  onCheckedChange={(v) => updateSetting('showMaskingOptions', v)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Reset */}
          <Card>
            <CardHeader>
              <CardTitle>Reset Settings</CardTitle>
              <CardDescription>
                Restore all settings to their default values
              </CardDescription>
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
