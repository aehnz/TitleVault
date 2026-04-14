import React from 'react';

import { SubmissionPayload } from '@udhbha/types';


interface InspectorPanelProps {
  submission: SubmissionPayload;
  selectedEntity: any;
}

const InspectorPanel: React.FC<InspectorPanelProps> = ({ submission, selectedEntity }) => {
  const stats = [
    { label: 'Anchors', value: submission.parcel.anchors.length, icon: MapPin },
    { label: 'Buildings', value: submission.buildings.length, icon: Building2 },
    { label: 'Floors', value: submission.floors.length, icon: Layers },
    { label: 'Components', value: submission.components.length, icon: Box },
    { label: 'Claims', value: submission.claims.length, icon: Gavel },
    { label: 'Documents', value: submission.documents.length, icon: FileText },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Inspector
      </h3>

      {/* Summary Stats */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Submission Summary</CardTitle>
        </CardHeader>
        <CardContent className="py-0 pb-3">
          <div className="space-y-2">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <stat.icon className="w-4 h-4" />
                  {stat.label}
                </span>
                <span className="font-medium">{stat.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Entity Details */}
      {selectedEntity && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Selected Entity</CardTitle>
          </CardHeader>
          <CardContent className="py-0 pb-3">
            <pre className="text-xs font-mono bg-muted p-2 rounded overflow-auto max-h-48">
              {JSON.stringify(selectedEntity, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Return Comment if present */}
      {submission.meta.return_comment && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="py-3">
            <CardTitle className="text-sm text-orange-700">Return Comments</CardTitle>
          </CardHeader>
          <CardContent className="py-0 pb-3">
            <p className="text-sm text-orange-600">{submission.meta.return_comment}</p>
          </CardContent>
        </Card>
      )}

      {/* Audit Trail */}
      {submission.meta.audit_trail && submission.meta.audit_trail.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Audit Trail</CardTitle>
          </CardHeader>
          <CardContent className="py-0 pb-3">
            <div className="space-y-3">
              {submission.meta.audit_trail.map((entry, i) => (
                <div key={i} className="text-xs border-l-2 border-primary/20 pl-2 py-1">
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-primary uppercase">
                      {entry.to}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {entry.ts ? new Date(entry.ts).toLocaleDateString() : ''}
                    </span>
                  </div>
                  {entry.from && (
                    <div className="text-[10px] text-muted-foreground underline decoration-dotted mb-1">
                      From: {entry.from}
                    </div>
                  )}
                  {entry.note && (
                    <p className="mt-1 italic text-muted-foreground leading-tight">
                      "{entry.note}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Geometry Store Preview */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Geometries</CardTitle>
        </CardHeader>
        <CardContent className="py-0 pb-3">
          <div className="space-y-1 text-xs font-mono">
            {Object.keys(submission.geometry_store).length === 0 ? (
              <p className="text-muted-foreground">No geometries defined</p>
            ) : (
              Object.keys(submission.geometry_store).slice(0, 8).map((key) => (
                <div key={key} className="truncate text-muted-foreground">
                  • {key}
                </div>
              ))
            )}
            {Object.keys(submission.geometry_store).length > 8 && (
              <p className="text-muted-foreground">
                +{Object.keys(submission.geometry_store).length - 8} more
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InspectorPanel;
