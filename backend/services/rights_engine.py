"""
Rights Engine — Server-Side (Python Port)
Direct port of surveyhub-registry/src/lib/rightsEngine.ts

This is the CANONICAL server-side engine for computing claims from
append-only rights events. Used during:
  - Approval: recompute claims_current before persisting
  - Audit validation: verify rights integrity server-side

CRITICAL RULES:
  - RULE 4: Auto-compute ACTIVE/ENDED for all right categories
  - RULE 5: No auto-cascade — explicit propagation only
  - RULE 7: Approval consistency
  - RULE 0: APPROVED submissions are fully read-only
"""

from datetime import datetime
from typing import List, Dict, Any, Optional
import uuid
import time
import random
import string


# ============ Helper Types ============

def _target_key(target: dict) -> str:
    """Create a unique key for a target (level:id)."""
    return f"{target.get('level', '')}:{target.get('id', '')}"


def _date_from_ts(ts: str) -> str:
    """Extract date portion from ISO timestamp."""
    if not ts:
        return ''
    return ts.split('T')[0]


# ============ Event Filtering ============

def get_active_events(events: List[dict]) -> List[dict]:
    """
    Get only ACTIVE events (filter out UNDONE draft events).
    Approved baseline events are always included.
    """
    result = []
    for e in events:
        origin = e.get('origin', '')
        if origin == 'APPROVED_BASELINE':
            result.append(e)
        elif origin == 'DRAFT':
            if e.get('draft_state') != 'UNDONE':
                result.append(e)
        else:
            # Legacy events without origin are included
            result.append(e)
    return result


def get_draft_events(events: List[dict]) -> List[dict]:
    """Get draft events only."""
    return [e for e in events if e.get('origin') == 'DRAFT']


def get_baseline_events(events: List[dict]) -> List[dict]:
    """Get baseline events only."""
    return [e for e in events if e.get('origin') == 'APPROVED_BASELINE']


# ============ Core Computation ============

def compute_claims_from_events(events: List[dict]) -> dict:
    """
    Compute all claims from a list of rights events.
    This is a PURE FUNCTION — events in, claims out.
    Only processes ACTIVE events (excludes UNDONE draft events).
    """
    active_events = get_active_events(events)

    # Sort by timestamp
    sorted_events = sorted(active_events, key=lambda e: e.get('ts', ''))

    ownership = []
    leases = []
    occupancies = []
    mortgages = []
    disputes = []
    easements = []

    for event in sorted_events:
        kind = event.get('kind', '')
        target = event.get('target', {})
        payload = event.get('payload', {})
        event_id = event.get('event_id', '')
        ts = event.get('ts', '')
        tk = _target_key(target)

        if kind == 'ADD_OWNERSHIP':
            # End any prior ACTIVE ownerships for this target
            for o in ownership:
                if o['status'] == 'ACTIVE' and _target_key(o['target']) == tk:
                    o['status'] = 'ENDED'
                    o['end_date'] = _date_from_ts(ts)
                    o['end_event_id'] = event_id
            ownership.append({
                'id': f'own_{event_id}',
                'target': target,
                'holder': payload.get('holder'),
                'share': payload.get('share'),
                'status': 'ACTIVE',
                'start_date': _date_from_ts(ts),
                'source_event_id': event_id,
            })

        elif kind == 'TRANSFER_OWNERSHIP':
            # End ALL prior active ownerships for this target
            for o in ownership:
                if o['status'] == 'ACTIVE' and _target_key(o['target']) == tk:
                    o['status'] = 'TRANSFERRED'
                    o['end_date'] = _date_from_ts(ts)
                    o['end_event_id'] = event_id
            ownership.append({
                'id': f'own_{event_id}',
                'target': target,
                'holder': payload.get('holder'),
                'share': payload.get('share'),
                'status': 'ACTIVE',
                'start_date': _date_from_ts(ts),
                'source_event_id': event_id,
            })

        elif kind == 'ADD_LEASE':
            for l in leases:
                if l['status'] == 'ACTIVE' and _target_key(l['target']) == tk:
                    l['status'] = 'ENDED'
                    l['end_date'] = _date_from_ts(ts)
                    l['end_event_id'] = event_id
            leases.append({
                'id': f'lease_{event_id}',
                'target': target,
                'lessor': payload.get('lessor'),
                'lessee': payload.get('lessee'),
                'rent_amount': payload.get('rent_amount'),
                'status': 'ACTIVE',
                'start_date': payload.get('start_date') or _date_from_ts(ts),
                'end_date': payload.get('end_date'),
                'source_event_id': event_id,
            })

        elif kind == 'END_LEASE':
            for l in leases:
                if l['status'] == 'ACTIVE' and _target_key(l['target']) == tk:
                    l['status'] = 'ENDED'
                    l['end_date'] = _date_from_ts(ts)
                    l['end_event_id'] = event_id

        elif kind == 'ADD_OCCUPANCY':
            for o in occupancies:
                if o['status'] == 'ACTIVE' and _target_key(o['target']) == tk:
                    o['status'] = 'ENDED'
                    o['end_date'] = _date_from_ts(ts)
                    o['end_event_id'] = event_id
            occupancies.append({
                'id': f'occ_{event_id}',
                'target': target,
                'occupant': payload.get('occupant'),
                'purpose': payload.get('purpose'),
                'status': 'ACTIVE',
                'start_date': _date_from_ts(ts),
                'source_event_id': event_id,
            })

        elif kind == 'END_OCCUPANCY':
            for o in occupancies:
                if o['status'] == 'ACTIVE' and _target_key(o['target']) == tk:
                    o['status'] = 'ENDED'
                    o['end_date'] = _date_from_ts(ts)
                    o['end_event_id'] = event_id

        elif kind == 'ADD_MORTGAGE':
            for m in mortgages:
                if m['status'] == 'ACTIVE' and _target_key(m['target']) == tk:
                    m['status'] = 'RELEASED'
                    m['end_date'] = _date_from_ts(ts)
                    m['end_event_id'] = event_id
            mortgages.append({
                'id': f'mort_{event_id}',
                'target': target,
                'mortgagor': payload.get('mortgagor'),
                'mortgagee': payload.get('mortgagee'),
                'principal': payload.get('principal'),
                'registration_no': payload.get('registration_no'),
                'status': 'ACTIVE',
                'start_date': _date_from_ts(ts),
                'source_event_id': event_id,
            })

        elif kind == 'RELEASE_MORTGAGE':
            for m in mortgages:
                if m['status'] == 'ACTIVE' and _target_key(m['target']) == tk:
                    m['status'] = 'RELEASED'
                    m['end_date'] = _date_from_ts(ts)
                    m['end_event_id'] = event_id

        elif kind == 'OPEN_DISPUTE':
            disputes.append({
                'id': f'disp_{event_id}',
                'target': target,
                'claimant': payload.get('claimant'),
                'respondent': payload.get('respondent'),
                'case_no': payload.get('case_no'),
                'nature': payload.get('nature'),
                'status': 'ACTIVE',
                'start_date': _date_from_ts(ts),
                'source_event_id': event_id,
            })

        elif kind == 'RESOLVE_DISPUTE':
            active_dispute = next(
                (d for d in disputes
                 if d['status'] == 'ACTIVE' and _target_key(d['target']) == tk),
                None
            )
            if active_dispute:
                active_dispute['status'] = 'RESOLVED'
                active_dispute['end_date'] = _date_from_ts(ts)
                active_dispute['resolution'] = payload.get('resolution')
                active_dispute['end_event_id'] = event_id

        elif kind == 'ADD_EASEMENT':
            nature = payload.get('nature')
            for e in easements:
                if (e['status'] == 'ACTIVE'
                        and _target_key(e['target']) == tk
                        and e.get('nature') == nature):
                    e['status'] = 'ENDED'
                    e['end_date'] = _date_from_ts(ts)
                    e['end_event_id'] = event_id
            easements.append({
                'id': f'ease_{event_id}',
                'target': target,
                'beneficiary': payload.get('beneficiary'),
                'nature': nature,
                'status': 'ACTIVE',
                'start_date': _date_from_ts(ts),
                'source_event_id': event_id,
            })

        elif kind == 'END_EASEMENT':
            for e in easements:
                if e['status'] == 'ACTIVE' and _target_key(e['target']) == tk:
                    e['status'] = 'ENDED'
                    e['end_date'] = _date_from_ts(ts)
                    e['end_event_id'] = event_id

    return {
        'ownership': ownership,
        'leases': leases,
        'occupancies': occupancies,
        'mortgages': mortgages,
        'disputes': disputes,
        'easements': easements,
    }


def compute_baseline_claims(events: List[dict]) -> dict:
    """Compute claims from APPROVED_BASELINE events only."""
    baseline = [e for e in events if e.get('origin') == 'APPROVED_BASELINE']
    return compute_claims_from_events(baseline)


def get_active_claims(claims: dict) -> dict:
    """Filter to only ACTIVE claims."""
    return {
        key: [c for c in items if c.get('status') == 'ACTIVE']
        for key, items in claims.items()
    }


def get_claim_counts(claims: dict) -> dict:
    """Get summary counts by category."""
    return {
        key: {
            'active': len([c for c in items if c.get('status') == 'ACTIVE']),
            'total': len(items),
        }
        for key, items in claims.items()
    }


# ============ Event Mutation Helpers ============

def mark_events_as_baseline(events: List[dict]) -> List[dict]:
    """Mark all events as APPROVED_BASELINE (called on approval)."""
    return [
        {**e, 'origin': 'APPROVED_BASELINE', 'draft_state': None}
        for e in events
    ]


def create_event_id() -> str:
    """Create a unique event ID."""
    rand = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
    return f"evt_{int(time.time() * 1000)}_{rand}"


def can_modify_draft_events(submission_status: str) -> bool:
    """Check if a submission allows undo/restore operations."""
    return submission_status in ('DRAFT', 'RETURNED')


def has_changes_from_baseline(events: List[dict]) -> bool:
    """Check if there are any draft changes."""
    return any(
        e.get('origin') == 'DRAFT' and e.get('draft_state') == 'ACTIVE'
        for e in events
    )
