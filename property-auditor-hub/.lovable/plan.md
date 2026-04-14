
# Filter History Timeline for "Find My Holdings" Mode

## Problem

When using "Find My Holdings" mode (e.g., searching `did:user:ram`), the History Timeline shows ALL events for the parcel - topology changes, all ownership transfers, etc. This makes it impossible for the user to quickly find their specific ownership events and current land status.

**Expected Behavior:**
- Timeline should filter to show only events **relevant to the searched owner**
- Rights events where the user is `holder` or `previous_holder` should be shown
- Topology events for components the user owns should be included
- Revision headers should still show for context
- A clear visual indicator should show which events directly involve the user

---

## Solution Overview

Add a `filterOwnerId` prop to the `HistoryTimeline` component. When provided, the timeline will:
1. Show revision headers (for context)
2. Show audit/registrar decisions (for legal status)
3. Filter rights events to show only those involving the owner (as holder or previous_holder)
4. Filter topology events to show only those for components the owner currently owns
5. Highlight events where the owner is directly involved with an accent color

---

## Technical Implementation

### File 1: `src/features/public/components/HistoryTimeline.tsx`

**Change A - Add Props for Filtering**

```typescript
interface HistoryTimelineProps {
  submission: Submission;
  parent: Submission | null;
  auditReport: AuditReport | null;
  registrarRecord: RegistrarRecord | null;
  selectedItemId?: string | null;
  onSelectItem?: (item: TimelineItem) => void;
  // NEW: Filter timeline to show only events for this owner
  filterOwnerId?: string | null;
  // NEW: Set of component IDs owned by the filterOwnerId
  ownedComponentIds?: Set<string>;
}
```

**Change B - Add Owner Relevance Field to TimelineItem**

Extend the `buildRightsItem` function to track if the event involves the searched owner:

```typescript
function buildRightsItem(e: RightsEvent, revNum: number, filterOwnerId?: string): TimelineItem {
  const entityType = e.target.level === 'UNIT' ? 'COMPONENT' : e.target.level;
  
  // Check if this event involves the filtered owner
  const isOwnerInvolved = filterOwnerId ? (
    e.payload.holder?.toLowerCase() === filterOwnerId.toLowerCase() ||
    e.payload.previous_holder?.toLowerCase() === filterOwnerId.toLowerCase()
  ) : false;
  
  return {
    id: e.event_id,
    type: 'RIGHTS_EVENT',
    // ... existing fields ...
    isOwnerRelevant: isOwnerInvolved, // NEW field
  };
}
```

**Change C - Filter Timeline Items Based on Owner**

Add filtering logic in the `useMemo` block that builds `timelineItems`:

```typescript
const timelineItems = useMemo(() => {
  const items: TimelineItem[] = [];
  // ... build all items as before ...

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
```

**Change D - Visual Highlight for Owner-Relevant Events**

Add distinct styling for events where the owner is involved:

```typescript
// In the render loop
const isOwnerRelevant = item.isOwnerRelevant;

<div
  className={`
    flex items-start gap-3 p-2 rounded-lg transition-all cursor-pointer
    ${isOwnerRelevant 
      ? 'border-l-4' 
      : ''
    }
    // ... existing classes
  `}
  style={isOwnerRelevant ? { 
    borderLeftColor: getClaimColor('OWNERSHIP'),
    backgroundColor: `${getClaimColor('OWNERSHIP')}10`
  } : undefined}
>
```

**Change E - Update Header to Show Filter Mode**

```typescript
<CardHeader className="pb-2">
  <div className="flex items-center justify-between">
    <CardTitle className="text-base">
      {filterOwnerId ? 'Your History' : 'History Timeline'}
    </CardTitle>
    {filterOwnerId && (
      <Badge 
        className="text-xs text-white"
        style={{ backgroundColor: getClaimColor('OWNERSHIP') }}
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
```

---

### File 2: `src/features/public/types.ts`

**Add `isOwnerRelevant` to TimelineItem interface**

```typescript
export interface TimelineItem {
  id: string;
  type: TimelineItemType;
  revisionNumber: number;
  timestamp: string;
  title: string;
  subtitle?: string;
  actorType: 'SURVEYOR' | 'AUDITOR' | 'REGISTRAR';
  entityId?: string;
  entityType?: 'PARCEL' | 'BUILDING' | 'FLOOR' | 'COMPONENT';
  eventKind?: string;
  status?: 'PASS' | 'FAIL' | 'RETURNED' | 'APPROVED_FINAL' | 'REJECTED_FINAL';
  isOwnerRelevant?: boolean; // NEW: true if this event involves the searched owner
}
```

---

### File 3: `src/features/public/pages/TransparencyPage.tsx`

**Pass filter props to HistoryTimeline**

```typescript
<HistoryTimeline
  submission={recordData.submission}
  parent={recordData.parent}
  auditReport={recordData.auditReport}
  registrarRecord={recordData.registrarRecord}
  selectedItemId={selectedTimelineItem}
  onSelectItem={handleTimelineSelect}
  // NEW: Pass filter when in FIND_HOLDINGS mode
  filterOwnerId={currentSearchMode === 'FIND_HOLDINGS' ? searchedOwnerId : null}
  ownedComponentIds={ownershipFilter?.ownedComponentIds}
/>
```

---

## Visual Result

**Before (FIND_HOLDINGS mode):**
```
▢ Revision 1 (Baseline)
  ▢ Add floor: Ground Floor
  ▢ Add floor: Level 1
  ▢ Add component: Shop-1
  ▢ Add component: Shop-2
  ▢ Add ownership: Shop-1 → did:user:ram
  ▢ Add ownership: Shop-2 → did:user:seeta
▢ Revision 2
  ▢ Add floor: Level 2
  ▢ Add component: Office-1
  ▢ Transfer ownership: Shop-1 → did:user:kumar
  ▢ Audit: PASS
  ▢ Registrar: APPROVED
```

**After (FIND_HOLDINGS mode for `did:user:ram`):**
```
▢ Revision 1 (Baseline)
  ████ Add ownership: Shop-1 → did:user:ram     [ORANGE HIGHLIGHT]
▢ Revision 2
  ████ Transfer ownership: Shop-1 → did:user:kumar   [ORANGE HIGHLIGHT - shows departure]
  ▢ Audit: PASS
  ▢ Registrar: APPROVED
```

The user can immediately see:
1. When they acquired ownership (Add ownership in Rev 1)
2. When they lost ownership (Transfer in Rev 2)
3. Current legal status (Approved by Registrar)

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/features/public/types.ts` | Add `isOwnerRelevant` to TimelineItem |
| `src/features/public/components/HistoryTimeline.tsx` | Add filter props, filter logic, owner highlight styling |
| `src/features/public/pages/TransparencyPage.tsx` | Pass filterOwnerId and ownedComponentIds to HistoryTimeline |

---

## Color Reference

- Owner-relevant events use `getClaimColor('OWNERSHIP')` = `#FF7A00` (orange)
- This matches the 3D viewer ownership highlighting for consistency
