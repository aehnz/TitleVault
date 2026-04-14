// ============================================
// HISTORY TIMELINE
// Vertical timeline of revisions and events
// ============================================

import { 
  Layers, 
  Box, 
  ArrowRightLeft, 
  Key, 
  Lock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Stamp,
  User,
  Clock
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

import { AuditReport, RegistrarRecord, RightsEvent, Submission, TimelineItem, TimelineItemType, TopologyEvent } from '@udhbha/types';


interface HistoryTimelineProps {
  submission: Submission;
  parent: Submission | null;
  auditReport: AuditReport | null;
  registrarRecord: RegistrarRecord | null;
  selectedItemId?: string | null;
  onSelectItem?: (item: TimelineItem) => void;
  // Filter timeline to show only events for this owner
  filterOwnerId?: string | null;
  // Set of component IDs owned by the filterOwnerId
  ownedComponentIds?: Set<string>;
}

const EVENT_ICONS: Record<string, React.FC<{ className?: string }>> = {
  ADD_FLOOR: Layers,
  REMOVE_FLOOR: Layers,
  ADD_COMPONENT: Box,
  REMOVE_COMPONENT: Box,
  UPDATE_GEOMETRY: Box,
  ADD_OWNERSHIP: User,
  TRANSFER_OWNERSHIP: ArrowRightLeft,
  REMOVE_OWNERSHIP: User,
  ADD_LEASE: Key,
  REMOVE_LEASE: Key,
  ADD_MORTGAGE: Lock,
  REMOVE_MORTGAGE: Lock,
  MARK_DISPUTE: AlertTriangle,
  RESOLVE_DISPUTE: AlertTriangle,
};

export function HistoryTimeline({
  submission,
  parent,
  auditReport,
  registrarRecord,
  selectedItemId,
  onSelectItem,
  filterOwnerId,
  ownedComponentIds,
}: HistoryTimelineProps) {
  
  // Build timeline items with owner relevance tracking
  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [];
    const revisionNumber = submission.meta.revision_number || 1;
    
    // Add parent events if exists (baseline)
    if (parent) {
      const parentRevision = parent.meta.revision_number || 0;
      
      // Baseline header
      items.push({
        id: `baseline-header`,
        type: 'REVISION_HEADER',
        revisionNumber: parentRevision,
        timestamp: parent.meta.updated_at || parent.meta.created_at || '',
        title: `Revision ${parentRevision} (Baseline)`,
        subtitle: parent.meta.change_note || 'Initial registration',
        actorType: 'SURVEYOR',
      });
      
      // Parent topology events
      parent.topology_events
        .filter(e => e.draft_state !== 'UNDONE')
        .forEach(e => {
          items.push(buildTopologyItem(e, parentRevision));
        });
      
      // Parent rights events
      parent.rights_events
        .filter(e => e.draft_state !== 'UNDONE')
        .forEach(e => {
          items.push(buildRightsItem(e, parentRevision, filterOwnerId));
        });
    }
    
    // Current revision header
    items.push({
      id: `revision-${revisionNumber}-header`,
      type: 'REVISION_HEADER',
      revisionNumber,
      timestamp: submission.meta.updated_at || submission.meta.created_at || '',
      title: `Revision ${revisionNumber}`,
      subtitle: submission.meta.change_note || 'Submission update',
      actorType: 'SURVEYOR',
    });
    
    // Current topology events
    submission.topology_events
      .filter(e => e.draft_state !== 'UNDONE')
      .forEach(e => {
        items.push(buildTopologyItem(e, revisionNumber));
      });
    
    // Current rights events
    submission.rights_events
      .filter(e => e.draft_state !== 'UNDONE')
      .forEach(e => {
        items.push(buildRightsItem(e, revisionNumber, filterOwnerId));
      });
    
    // Audit decision
    if (auditReport) {
      items.push({
        id: `audit-${submission.meta.submission_id}`,
        type: 'AUDIT_DECISION',
        revisionNumber,
        timestamp: auditReport.audited_at,
        title: `Audit: ${auditReport.decision}`,
        subtitle: auditReport.notes.public || undefined,
        actorType: 'AUDITOR',
        status: auditReport.decision as 'PASS' | 'FAIL' | 'RETURNED',
      });
    }
    
    // Registrar decision
    if (registrarRecord) {
      items.push({
        id: `registrar-${submission.meta.submission_id}`,
        type: 'REGISTRAR_DECISION',
        revisionNumber,
        timestamp: registrarRecord.decided_at,
        title: `Registrar: ${registrarRecord.decision.replace('_FINAL', '')}`,
        subtitle: registrarRecord.notes.public || undefined,
        actorType: 'REGISTRAR',
        status: registrarRecord.decision as 'APPROVED_FINAL' | 'REJECTED_FINAL',
      });
    }
    
    // If filterOwnerId is provided, filter the items
    if (filterOwnerId) {
      return items.filter(item => {
        // Always keep revision headers and decisions
        if (item.type === 'REVISION_HEADER') return true;
        if (item.type === 'AUDIT_DECISION') return true;
        if (item.type === 'REGISTRAR_DECISION') return true;
        
        // Keep rights events that involve the owner
        if (item.type === 'RIGHTS_EVENT') {
          return item.isOwnerRelevant;
        }
        
        // Keep topology events for owned components
        if (item.type === 'TOPOLOGY_EVENT' && ownedComponentIds) {
          return ownedComponentIds.has(item.entityId || '');
        }
        
        return false;
      });
    }
    
    return items;
  }, [submission, parent, auditReport, registrarRecord, filterOwnerId, ownedComponentIds]);

  function buildTopologyItem(e: TopologyEvent, revNum: number): TimelineItem {
    return {
      id: e.event_id,
      type: 'TOPOLOGY_EVENT',
      revisionNumber: revNum,
      timestamp: e.ts,
      title: formatEventKind(e.kind),
      subtitle: e.target.id,
      actorType: 'SURVEYOR',
      entityId: e.target.id,
      entityType: e.target.entity as 'PARCEL' | 'BUILDING' | 'FLOOR' | 'COMPONENT',
      eventKind: e.kind,
    };
  }

  function buildRightsItem(e: RightsEvent, revNum: number, ownerFilter?: string | null): TimelineItem {
    const entityType = e.target.level === 'UNIT' ? 'COMPONENT' : e.target.level;
    
    // Check if this event involves the filtered owner
    const isOwnerInvolved = ownerFilter ? (
      (e.payload.holder as string)?.toLowerCase() === ownerFilter.toLowerCase() ||
      (e.payload.previous_holder as string)?.toLowerCase() === ownerFilter.toLowerCase()
    ) : false;
    
    return {
      id: e.event_id,
      type: 'RIGHTS_EVENT',
      revisionNumber: revNum,
      timestamp: e.ts,
      title: formatEventKind(e.kind),
      subtitle: `${e.target.id}${e.payload.holder ? ` → ${maskHolder(e.payload.holder as string)}` : ''}`,
      actorType: 'SURVEYOR',
      entityId: e.target.id,
      entityType: entityType as 'PARCEL' | 'BUILDING' | 'FLOOR' | 'COMPONENT',
      eventKind: e.kind,
      isOwnerRelevant: isOwnerInvolved,
    };
  }

  function formatEventKind(kind: string): string {
    return kind.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
  }

  function maskHolder(holder: string): string {
    if (holder.length <= 8) return holder;
    const parts = holder.split(':');
    if (parts.length > 1) {
      const last = parts[parts.length - 1];
      return `${parts.slice(0, -1).join(':')}:${last[0]}***${last[last.length - 1]}`;
    }
    return `${holder[0]}***${holder[holder.length - 1]}`;
  }

  function getItemIcon(item: TimelineItem) {
    if (item.type === 'REVISION_HEADER') return Clock;
    if (item.type === 'AUDIT_DECISION') {
      return item.status === 'PASS' ? CheckCircle : item.status === 'FAIL' ? XCircle : Clock;
    }
    if (item.type === 'REGISTRAR_DECISION') {
      return item.status === 'APPROVED_FINAL' ? Stamp : XCircle;
    }
    return EVENT_ICONS[item.eventKind || ''] || Box;
  }

  function getItemColor(item: TimelineItem): string {
    if (item.type === 'REVISION_HEADER') return 'bg-primary';
    if (item.type === 'AUDIT_DECISION') {
      if (item.status === 'PASS') return `bg-[${getStatusColor('APPROVED')}]`;
      if (item.status === 'FAIL') return `bg-[${getStatusColor('REJECTED')}]`;
      return `bg-[${getStatusColor('NEEDS_FIX')}]`;
    }
    if (item.type === 'REGISTRAR_DECISION') {
      if (item.status === 'APPROVED_FINAL') return `bg-[${getStatusColor('APPROVED')}]`;
      return `bg-[${getStatusColor('REJECTED')}]`;
    }
    if (item.type === 'TOPOLOGY_EVENT') return `bg-[${getStatusColor('SUBMITTED')}]`;
    if (item.type === 'RIGHTS_EVENT') return `bg-[${getClaimColor('OWNERSHIP')}]`;
    return 'bg-muted';
  }

  // Group items by revision
  const groupedByRevision = useMemo(() => {
    const groups: { revision: number; items: TimelineItem[] }[] = [];
    let currentGroup: { revision: number; items: TimelineItem[] } | null = null;
    
    for (const item of timelineItems) {
      if (item.type === 'REVISION_HEADER') {
        if (currentGroup) groups.push(currentGroup);
        currentGroup = { revision: item.revisionNumber, items: [item] };
      } else if (currentGroup) {
        currentGroup.items.push(item);
      }
    }
    if (currentGroup) groups.push(currentGroup);
    
    return groups;
  }, [timelineItems]);

  const ownershipColor = getClaimColor('OWNERSHIP');

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {filterOwnerId ? 'Your History' : 'History Timeline'}
          </CardTitle>
          {filterOwnerId && (
            <Badge 
              className="text-xs text-white"
              style={{ backgroundColor: ownershipColor }}
            >
              Filtered
            </Badge>
          )}
        </div>
        {filterOwnerId && (
          <p className="text-xs text-muted-foreground mt-1">
            Showing events for: {filterOwnerId}
          </p>
        )}
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[480px]">
          <div className="p-4 space-y-6">
            {groupedByRevision.map((group) => (
              <div key={group.revision} className="space-y-2">
                {group.items.map((item) => {
                  const Icon = getItemIcon(item);
                  const isSelected = selectedItemId === item.id;
                  const isHeader = item.type === 'REVISION_HEADER';
                  const isOwnerRelevant = item.isOwnerRelevant;
                  
                  return (
                    <div
                      key={item.id}
                      className={`
                        flex items-start gap-3 p-2 rounded-lg transition-all cursor-pointer
                        ${isSelected && isHeader 
                          ? 'bg-primary/10 border-2 border-primary/50 shadow-sm' 
                          : isSelected 
                          ? 'bg-primary/10 border border-primary/30' 
                          : 'hover:bg-muted/50 border border-transparent'
                        }
                        ${isHeader ? 'mt-4 first:mt-0' : 'ml-4'}
                        ${isOwnerRelevant ? 'border-l-4' : ''}
                      `}
                      style={isOwnerRelevant ? { 
                        borderLeftColor: ownershipColor,
                        backgroundColor: `${ownershipColor}15`
                      } : undefined}
                      onClick={() => onSelectItem?.(item)}
                    >
                      <div 
                        className={`
                          w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                          ${isHeader ? getItemColor(item) : 'bg-muted'}
                        `}
                        style={isOwnerRelevant && !isHeader ? { backgroundColor: `${ownershipColor}30` } : undefined}
                      >
                        <Icon 
                          className={`w-4 h-4 ${isHeader ? 'text-white' : 'text-foreground'}`}
                          style={isOwnerRelevant && !isHeader ? { color: ownershipColor } : undefined}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span 
                            className={`font-medium text-sm ${isHeader ? '' : 'text-muted-foreground'}`}
                            style={isOwnerRelevant ? { color: ownershipColor } : undefined}
                          >
                            {item.title}
                          </span>
                          {item.type === 'AUDIT_DECISION' && (
                            <Badge 
                              className="text-xs text-white"
                              style={{ 
                                backgroundColor: item.status === 'PASS' 
                                  ? getStatusColor('APPROVED') 
                                  : getStatusColor('REJECTED') 
                              }}
                            >
                              {item.status}
                            </Badge>
                          )}
                          {item.type === 'REGISTRAR_DECISION' && (
                            <Badge 
                              className="text-xs text-white"
                              style={{ 
                                backgroundColor: item.status === 'APPROVED_FINAL' 
                                  ? getStatusColor('APPROVED') 
                                  : getStatusColor('REJECTED') 
                              }}
                            >
                              {item.status?.replace('_FINAL', '')}
                            </Badge>
                          )}
                          {isOwnerRelevant && (
                            <Badge 
                              className="text-xs text-white"
                              style={{ backgroundColor: ownershipColor }}
                            >
                              Your Event
                            </Badge>
                          )}
                        </div>
                        {item.subtitle && (
                          <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                        )}
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {format(new Date(item.timestamp), 'dd MMM yyyy, HH:mm')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
