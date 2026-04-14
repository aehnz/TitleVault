"""
Phase 6.2: Configurable Audit Rule Engine
Data-driven validation rules that auditors can extend without code changes.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class RuleViolation:
    rule_id: str
    severity: str  # CRITICAL, WARNING, INFO
    message: str
    details: dict = field(default_factory=dict)


# ── Rule Definitions ────────────────────────────────────────────────
# Each rule is declarative — new rules can be added without modifying engine code.

AUDIT_RULES = [
    {
        'id': 'RULE_001',
        'name': 'Ownership transfer requires notarized deed',
        'trigger': {'event_kind': 'TRANSFER_OWNERSHIP'},
        'check': 'has_doc_type',
        'params': {'required_doc_type': 'sale_deed'},
        'severity': 'CRITICAL',
        'message': 'Ownership transfer requires a sale deed document',
    },
    {
        'id': 'RULE_002',
        'name': 'Lease requires signed agreement',
        'trigger': {'event_kind': 'ADD_LEASE'},
        'check': 'has_doc_type',
        'params': {'required_doc_type': 'lease'},
        'severity': 'CRITICAL',
        'message': 'Lease registration requires a lease agreement document',
    },
    {
        'id': 'RULE_003',
        'name': 'Minimum 3 survey anchors',
        'trigger': {'entity_type': 'PARCEL'},
        'check': 'min_anchors',
        'params': {'min_count': 3},
        'severity': 'CRITICAL',
        'message': 'Parcel must have at least 3 survey anchor points',
    },
    {
        'id': 'RULE_004',
        'name': 'Building must have at least one floor',
        'trigger': {'entity_type': 'BUILDING'},
        'check': 'building_has_floors',
        'params': {},
        'severity': 'WARNING',
        'message': 'Building has no associated floors',
    },
    {
        'id': 'RULE_005',
        'name': 'Schema version present',
        'trigger': {'entity_type': 'META'},
        'check': 'has_schema_version',
        'params': {},
        'severity': 'WARNING',
        'message': 'Submission is missing a schema version',
    },
    {
        'id': 'RULE_006',
        'name': 'Parcel must have a name',
        'trigger': {'entity_type': 'PARCEL'},
        'check': 'parcel_has_name',
        'params': {},
        'severity': 'CRITICAL',
        'message': 'Parcel name is required',
    },
    {
        'id': 'RULE_007',
        'name': 'Ownership shares must not exceed 100%',
        'trigger': {'entity_type': 'RIGHTS'},
        'check': 'ownership_total',
        'params': {'max_share': 1.0},
        'severity': 'CRITICAL',
        'message': 'Total ownership share exceeds 100%',
    },
]


class RuleEngine:
    """Evaluates declarative audit rules against a submission payload."""

    def __init__(self, rules: list[dict] = None):
        self.rules = rules or AUDIT_RULES

    def evaluate(self, payload: dict) -> list[RuleViolation]:
        """Evaluate all rules against the submission payload."""
        violations = []

        for rule in self.rules:
            if not self._should_trigger(rule, payload):
                continue

            checker = getattr(self, f"_check_{rule['check']}", None)
            if not checker:
                continue

            result = checker(payload, rule)
            if result:
                violations.append(RuleViolation(
                    rule_id=rule['id'],
                    severity=rule['severity'],
                    message=rule['message'],
                    details=result if isinstance(result, dict) else {},
                ))

        return violations

    # ── Trigger Logic ─────────────────────────────────────────────

    def _should_trigger(self, rule: dict, payload: dict) -> bool:
        """Check if the rule's trigger condition is met."""
        trigger = rule.get('trigger', {})

        if 'event_kind' in trigger:
            events = payload.get('rights_events', [])
            return any(e.get('kind') == trigger['event_kind'] for e in events)

        if 'entity_type' in trigger:
            return True  # Entity-level rules always trigger

        return True  # Default: trigger

    # ── Check Implementations ─────────────────────────────────────

    def _check_has_doc_type(self, payload: dict, rule: dict) -> Optional[dict]:
        required = rule['params']['required_doc_type']
        doc_types = {d.get('type') for d in payload.get('documents', [])}
        if required not in doc_types:
            return {'required': required, 'found': list(doc_types)}
        return None

    def _check_min_anchors(self, payload: dict, rule: dict) -> Optional[dict]:
        anchors = payload.get('parcel', {}).get('anchors', [])
        min_count = rule['params']['min_count']
        if len(anchors) < min_count:
            return {'found': len(anchors), 'required': min_count}
        return None

    def _check_building_has_floors(self, payload: dict, rule: dict) -> Optional[dict]:
        buildings = payload.get('buildings', [])
        floors = payload.get('floors', [])
        floor_building_ids = {f.get('building_id') for f in floors}

        empty_buildings = [
            b['building_id'] for b in buildings
            if b.get('building_id') not in floor_building_ids
        ]
        if empty_buildings:
            return {'buildings_without_floors': empty_buildings}
        return None

    def _check_has_schema_version(self, payload: dict, rule: dict) -> Optional[dict]:
        version = payload.get('meta', {}).get('schema_version')
        if not version:
            return {'missing': 'schema_version'}
        return None

    def _check_parcel_has_name(self, payload: dict, rule: dict) -> Optional[dict]:
        name = payload.get('parcel', {}).get('name', '').strip()
        if not name:
            return {'missing': 'parcel.name'}
        return None

    def _check_ownership_total(self, payload: dict, rule: dict) -> Optional[dict]:
        from collections import defaultdict
        max_share = rule['params']['max_share']
        events = payload.get('rights_events', [])

        by_target = defaultdict(float)
        for evt in events:
            if evt.get('kind') == 'GRANT_OWNERSHIP' and evt.get('origin') != 'SUPERSEDED':
                key = f"{evt['target']['level']}:{evt['target']['id']}"
                by_target[key] += evt.get('payload', {}).get('share', 0)

        violations = {k: v for k, v in by_target.items() if v > max_share}
        if violations:
            return {'targets_exceeding': violations}
        return None
