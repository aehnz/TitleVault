"""
Phase 6.1: Conflict Detection Engine
Checks submissions for ownership conflicts, boundary overlaps, and data inconsistencies.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from collections import defaultdict
from typing import Optional


@dataclass
class ConflictIssue:
    type: str
    severity: str  # CRITICAL, HIGH, WARNING, INFO
    target: str
    message: str
    details: dict = field(default_factory=dict)


class ConflictDetector:
    """Detects ownership conflicts, boundary issues, and data inconsistencies."""

    @staticmethod
    def check_all(submission_payload: dict, all_approved: list[dict] = None) -> list[ConflictIssue]:
        """Run all conflict checks on a submission."""
        issues = []
        issues.extend(ConflictDetector.check_overlapping_ownership(submission_payload))
        issues.extend(ConflictDetector.check_orphaned_components(submission_payload))
        issues.extend(ConflictDetector.check_missing_required_docs(submission_payload))
        issues.extend(ConflictDetector.check_duplicate_entities(submission_payload))
        issues.extend(ConflictDetector.check_geometry_consistency(submission_payload))

        if all_approved:
            issues.extend(ConflictDetector.check_boundary_adjacency(submission_payload, all_approved))

        return issues

    @staticmethod
    def check_overlapping_ownership(payload: dict) -> list[ConflictIssue]:
        """Check if ownership shares for any target exceed 100%."""
        issues = []
        events = payload.get('rights_events', [])

        # Group active ownership events by target
        by_target: dict[str, list] = defaultdict(list)
        for evt in events:
            if evt.get('kind') == 'GRANT_OWNERSHIP' and evt.get('origin') != 'SUPERSEDED':
                key = f"{evt['target']['level']}:{evt['target']['id']}"
                by_target[key].append(evt)

        for target_key, ownerships in by_target.items():
            total_share = sum(
                o.get('payload', {}).get('share', 0) for o in ownerships
            )
            if total_share > 1.0:
                issues.append(ConflictIssue(
                    type='OWNERSHIP_EXCEEDS_100',
                    severity='CRITICAL',
                    target=target_key,
                    message=f"Total ownership share is {total_share * 100:.0f}% (exceeds 100%)",
                    details={'total_share': total_share, 'event_count': len(ownerships)},
                ))

        return issues

    @staticmethod
    def check_orphaned_components(payload: dict) -> list[ConflictIssue]:
        """Check for components referencing non-existent floors or buildings."""
        issues = []
        floor_ids = {f['floor_id'] for f in payload.get('floors', [])}
        building_ids = {b['building_id'] for b in payload.get('buildings', [])}

        for comp in payload.get('components', []):
            if comp.get('floor_id') and comp['floor_id'] not in floor_ids:
                issues.append(ConflictIssue(
                    type='ORPHANED_COMPONENT',
                    severity='HIGH',
                    target=comp.get('component_id', 'unknown'),
                    message=f"Component references non-existent floor '{comp['floor_id']}'",
                ))

        for floor in payload.get('floors', []):
            if floor.get('building_id') and floor['building_id'] not in building_ids:
                issues.append(ConflictIssue(
                    type='ORPHANED_FLOOR',
                    severity='HIGH',
                    target=floor.get('floor_id', 'unknown'),
                    message=f"Floor references non-existent building '{floor['building_id']}'",
                ))

        return issues

    @staticmethod
    def check_missing_required_docs(payload: dict) -> list[ConflictIssue]:
        """Check that ownership transfers have sale deed documents."""
        issues = []
        events = payload.get('rights_events', [])
        doc_types = {d.get('type') for d in payload.get('documents', [])}

        has_transfer = any(e['kind'] == 'TRANSFER_OWNERSHIP' for e in events if e.get('kind'))
        if has_transfer and 'sale_deed' not in doc_types:
            issues.append(ConflictIssue(
                type='MISSING_REQUIRED_DOC',
                severity='CRITICAL',
                target='documents',
                message='Ownership transfer requires a sale deed document',
            ))

        has_lease = any(e['kind'] == 'ADD_LEASE' for e in events if e.get('kind'))
        if has_lease and 'lease' not in doc_types:
            issues.append(ConflictIssue(
                type='MISSING_REQUIRED_DOC',
                severity='CRITICAL',
                target='documents',
                message='Lease registration requires a lease agreement document',
            ))

        return issues

    @staticmethod
    def check_duplicate_entities(payload: dict) -> list[ConflictIssue]:
        """Check for duplicate IDs within entity arrays."""
        issues = []

        for entity_type, key_field in [
            ('buildings', 'building_id'),
            ('floors', 'floor_id'),
            ('components', 'component_id'),
        ]:
            ids = [e.get(key_field) for e in payload.get(entity_type, [])]
            dupes = [id_ for id_ in ids if ids.count(id_) > 1]
            if dupes:
                issues.append(ConflictIssue(
                    type='DUPLICATE_ENTITY_ID',
                    severity='CRITICAL',
                    target=entity_type,
                    message=f"Duplicate {key_field}(s) found: {set(dupes)}",
                ))

        return issues

    @staticmethod
    def check_geometry_consistency(payload: dict) -> list[ConflictIssue]:
        """Check that geometry refs actually exist in the geometry store."""
        issues = []
        geom_store = payload.get('geometry_store', {})

        # Check parcel boundary ref
        parcel = payload.get('parcel', {})
        boundary_ref = parcel.get('boundary_geom')
        if boundary_ref and boundary_ref not in geom_store:
            issues.append(ConflictIssue(
                type='MISSING_GEOMETRY',
                severity='HIGH',
                target='parcel',
                message=f"Parcel boundary references missing geometry '{boundary_ref}'",
            ))

        # Check component geometry refs
        for comp in payload.get('components', []):
            geom_ref = comp.get('geom')
            if geom_ref and geom_ref not in geom_store:
                issues.append(ConflictIssue(
                    type='MISSING_GEOMETRY',
                    severity='WARNING',
                    target=comp.get('component_id', 'unknown'),
                    message=f"Component references missing geometry '{geom_ref}'",
                ))

        return issues

    @staticmethod
    def check_boundary_adjacency(payload: dict, all_approved: list[dict]) -> list[ConflictIssue]:
        """Check if parcel boundary overlaps with existing approved parcels.
        Uses simple bounding-box overlap check (no shapely dependency).
        """
        issues = []
        geom_store = payload.get('geometry_store', {})
        parcel = payload.get('parcel', {})
        boundary_ref = parcel.get('boundary_geom')

        if not boundary_ref or boundary_ref not in geom_store:
            return issues

        sub_coords = geom_store[boundary_ref].get('polygon', [])
        if not sub_coords or len(sub_coords) < 3:
            return issues

        sub_bbox = _compute_bbox(sub_coords)

        for other_payload in all_approved:
            other_geom_store = other_payload.get('geometry_store', {})
            other_parcel = other_payload.get('parcel', {})
            other_ref = other_parcel.get('boundary_geom')

            if not other_ref or other_ref not in other_geom_store:
                continue

            other_coords = other_geom_store[other_ref].get('polygon', [])
            if not other_coords or len(other_coords) < 3:
                continue

            other_bbox = _compute_bbox(other_coords)

            if _bboxes_overlap(sub_bbox, other_bbox):
                issues.append(ConflictIssue(
                    type='BOUNDARY_OVERLAP',
                    severity='HIGH',
                    target=other_parcel.get('parcel_id', 'unknown'),
                    message=f"Bounding box overlaps with approved parcel '{other_parcel.get('name', 'Unknown')}'",
                ))

        return issues


def _compute_bbox(coords: list) -> tuple:
    """Compute (min_x, min_y, max_x, max_y) from a list of [x, y] coords."""
    xs = [c[0] for c in coords if len(c) >= 2]
    ys = [c[1] for c in coords if len(c) >= 2]
    return (min(xs), min(ys), max(xs), max(ys))


def _bboxes_overlap(a: tuple, b: tuple) -> bool:
    """Check if two bounding boxes overlap."""
    return not (a[2] < b[0] or a[0] > b[2] or a[3] < b[1] or a[1] > b[3])
