"""
Submission Service — Business logic for submission lifecycle.
Enforces status transitions, computes claims on approval, manages audit trail.
"""

from datetime import datetime
from typing import Optional
from models.submission import Submission
from repositories.submission_repo import SubmissionRepo
from services.rights_engine import compute_claims_from_events, mark_events_as_baseline


# Strict state machine — maps current status → allowed next statuses
ALLOWED_TRANSITIONS = {
    'DRAFT': ['SUBMITTED'],
    'SUBMITTED': ['RETURNED', 'APPROVED', 'AUDIT_PASSED', 'AUDIT_FAILED'],
    'RETURNED': ['SUBMITTED', 'DRAFT'],
    'APPROVED': [],          # Terminal — no further transitions
    'AUDIT_PASSED': ['APPROVED'],
    'AUDIT_FAILED': ['RETURNED'],
}


class SubmissionService:

    @staticmethod
    def create_submission(data: dict, actor_email: str) -> Submission:
        """Create a new submission with initial audit trail entry."""
        meta = data.get('meta', {})

        # Initialize audit trail
        meta['audit_trail'] = [{
            'from': None,
            'to': meta.get('status', 'DRAFT'),
            'ts': datetime.utcnow().isoformat(),
            'note': 'Initial creation',
            'actor': actor_email,
        }]
        data['meta'] = meta

        return SubmissionRepo.create(data)

    @staticmethod
    def update_submission(submission: Submission, data: dict, actor_email: str) -> Submission:
        """
        Update a submission. If the status changed, enforce state machine
        and log the transition in the audit trail.
        """
        old_status = submission.status
        new_status = data.get('meta', {}).get('status', old_status)

        # If status is changing, enforce the state machine
        if old_status != new_status:
            allowed = ALLOWED_TRANSITIONS.get(old_status, [])
            if new_status not in allowed:
                raise ValueError(
                    f"Cannot transition from {old_status} to {new_status}. "
                    f"Allowed: {allowed}"
                )

            # Build audit trail entry
            trail_entry = {
                'from': old_status,
                'to': new_status,
                'ts': datetime.utcnow().isoformat(),
                'note': (data.get('meta', {}).get('change_note')
                         or data.get('meta', {}).get('return_comment')
                         or ''),
                'actor': actor_email,
            }

            # Append to existing trail
            audit_trail = list(submission.audit_trail or [])
            audit_trail.append(trail_entry)
            data.setdefault('meta', {})['audit_trail'] = audit_trail

            # On APPROVED: compute claims server-side and lock submission
            if new_status == 'APPROVED':
                data = SubmissionService._finalize_approval(data)

        return SubmissionRepo.update(submission, data)

    @staticmethod
    def _finalize_approval(data: dict) -> dict:
        """
        Called when a submission transitions to APPROVED.
        Recomputes claims from rights events and marks events as baseline.
        """
        rights_events = data.get('rights_events', [])

        if rights_events:
            # Compute final claims snapshot server-side
            computed_claims = compute_claims_from_events(rights_events)
            data['claims_current'] = computed_claims

            # Mark all events as baseline (immutable from this point)
            data['rights_events'] = mark_events_as_baseline(rights_events)

        # Lock the submission
        data.setdefault('meta', {})['locked'] = True

        return data

    @staticmethod
    def get_counts() -> dict:
        """Get submission counts by status, using SQL aggregation."""
        status_counts = SubmissionRepo.count_by_status()
        return {
            'drafts': status_counts.get('DRAFT', 0),
            'submitted': status_counts.get('SUBMITTED', 0),
            'returned': status_counts.get('RETURNED', 0),
            'approved': status_counts.get('APPROVED', 0),
            'audit_passed': status_counts.get('AUDIT_PASSED', 0),
            'audit_failed': status_counts.get('AUDIT_FAILED', 0),
            'total': sum(status_counts.values()),
        }

    @staticmethod
    def auto_classify_change(parent_payload: dict, child_payload: dict) -> dict:
        """Phase 6.6: Auto-detect what kind of change a revision represents.
        Returns a classification dict with the detected change kind and evidence.
        """
        evidence = []

        # Topology changes (buildings/floors/components added or removed)
        parent_buildings = len(parent_payload.get('buildings', []))
        child_buildings = len(child_payload.get('buildings', []))
        parent_floors = len(parent_payload.get('floors', []))
        child_floors = len(child_payload.get('floors', []))
        parent_comps = len(parent_payload.get('components', []))
        child_comps = len(child_payload.get('components', []))

        has_topo = (
            parent_buildings != child_buildings or
            parent_floors != child_floors or
            parent_comps != child_comps
        )
        if has_topo:
            evidence.append({
                'type': 'TOPOLOGY_CHANGE',
                'details': {
                    'buildings': f"{parent_buildings}→{child_buildings}",
                    'floors': f"{parent_floors}→{child_floors}",
                    'components': f"{parent_comps}→{child_comps}",
                }
            })

        # Rights changes
        parent_rights = len(parent_payload.get('rights_events', []))
        child_rights = len(child_payload.get('rights_events', []))
        has_rights = parent_rights != child_rights
        if has_rights:
            evidence.append({
                'type': 'RIGHTS_CHANGE',
                'details': {'events': f"{parent_rights}→{child_rights}"}
            })

        # Geometry changes
        parent_geom_keys = set(parent_payload.get('geometry_store', {}).keys())
        child_geom_keys = set(child_payload.get('geometry_store', {}).keys())
        has_geom = parent_geom_keys != child_geom_keys
        if has_geom:
            added = child_geom_keys - parent_geom_keys
            removed = parent_geom_keys - child_geom_keys
            evidence.append({
                'type': 'GEOMETRY_CHANGE',
                'details': {'added': list(added), 'removed': list(removed)}
            })

        # Document changes
        parent_docs = len(parent_payload.get('documents', []))
        child_docs = len(child_payload.get('documents', []))
        has_docs = parent_docs != child_docs
        if has_docs:
            evidence.append({
                'type': 'DOCUMENT_CHANGE',
                'details': {'documents': f"{parent_docs}→{child_docs}"}
            })

        # Parcel name/boundary changes
        parent_parcel = parent_payload.get('parcel', {})
        child_parcel = child_payload.get('parcel', {})
        has_parcel = (
            parent_parcel.get('name') != child_parcel.get('name') or
            parent_parcel.get('boundary_geom') != child_parcel.get('boundary_geom')
        )
        if has_parcel:
            evidence.append({'type': 'PARCEL_CHANGE', 'details': {}})

        # Classify based on evidence
        if has_topo and has_rights:
            kind = 'MAJOR_AMENDMENT'
        elif has_topo:
            kind = 'STRUCTURAL_CHANGE'
        elif has_rights:
            kind = 'RIGHTS_AMENDMENT'
        elif has_geom:
            kind = 'SURVEY_CORRECTION'
        elif has_parcel:
            kind = 'BOUNDARY_CORRECTION'
        elif has_docs:
            kind = 'DOCUMENTATION_UPDATE'
        else:
            kind = 'MINOR_CORRECTION'

        return {
            'detected_kind': kind,
            'evidence': evidence,
            'confidence': 'HIGH' if len(evidence) <= 2 else 'MEDIUM',
        }
