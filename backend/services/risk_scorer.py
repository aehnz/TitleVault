"""
Phase 6.3: Risk Scoring Model
Heuristic-based risk scoring for submissions — highlights suspicious patterns for auditor review.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional


@dataclass
class RiskScore:
    score: int  # 0-100
    level: str  # LOW, MEDIUM, HIGH
    factors: list[str] = field(default_factory=list)


class RiskScorer:
    """Score submissions for potential issues based on heuristic patterns."""

    WEIGHTS = {
        'rapid_transfers': 30,        # Multiple ownership transfers within 6 months
        'missing_docs': 25,           # Missing required documents
        'large_share_transfer': 15,   # >50% ownership change in single event
        'first_time_submitter': 5,    # New surveyor — informational only
        'many_rights_events': 10,     # Unusually high number of rights events
        'geometry_anomaly': 10,       # Missing or broken geometry
        'no_anchors': 5,              # Parcel has no survey anchors
    }

    @staticmethod
    def score(submission_payload: dict, submitter_history_count: int = 0) -> RiskScore:
        """Compute a risk score for a submission payload."""
        total = 0
        factors: list[str] = []

        # ── Rapid transfers ─────────────────────────────────────
        transfers = [
            e for e in submission_payload.get('rights_events', [])
            if e.get('kind') == 'TRANSFER_OWNERSHIP'
        ]
        if len(transfers) >= 2:
            dates = sorted(e.get('ts', '') for e in transfers)
            try:
                first = datetime.fromisoformat(dates[0].replace('Z', '+00:00'))
                last = datetime.fromisoformat(dates[-1].replace('Z', '+00:00'))
                if (last - first) < timedelta(days=180):
                    total += RiskScorer.WEIGHTS['rapid_transfers']
                    factors.append(f"{len(transfers)} ownership transfers within 6 months")
            except (ValueError, IndexError):
                pass

        # ── Large share transfer ────────────────────────────────
        for evt in submission_payload.get('rights_events', []):
            share = evt.get('payload', {}).get('share', 0)
            if evt.get('kind') == 'TRANSFER_OWNERSHIP' and share > 0.5:
                total += RiskScorer.WEIGHTS['large_share_transfer']
                factors.append(f"Large ownership transfer ({share * 100:.0f}%)")
                break  # Only count once

        # ── Missing documents ───────────────────────────────────
        doc_count = len(submission_payload.get('documents', []))
        if doc_count == 0:
            total += RiskScorer.WEIGHTS['missing_docs']
            factors.append("No documents attached")

        # ── Many rights events ──────────────────────────────────
        event_count = len(submission_payload.get('rights_events', []))
        if event_count > 10:
            total += RiskScorer.WEIGHTS['many_rights_events']
            factors.append(f"Unusually high number of rights events ({event_count})")

        # ── Geometry anomalies ──────────────────────────────────
        geom_store = submission_payload.get('geometry_store', {})
        parcel = submission_payload.get('parcel', {})
        boundary_ref = parcel.get('boundary_geom')
        if boundary_ref and boundary_ref not in geom_store:
            total += RiskScorer.WEIGHTS['geometry_anomaly']
            factors.append("Parcel boundary geometry reference is broken")

        # ── No anchors ──────────────────────────────────────────
        anchors = parcel.get('anchors', [])
        if len(anchors) < 3:
            total += RiskScorer.WEIGHTS['no_anchors']
            factors.append(f"Only {len(anchors)} survey anchors (minimum expected: 3)")

        # ── First-time submitter ────────────────────────────────
        if submitter_history_count == 0:
            total += RiskScorer.WEIGHTS['first_time_submitter']
            factors.append("First-time submitter")

        # ── Clamp ───────────────────────────────────────────────
        score = min(total, 100)
        if score > 60:
            level = 'HIGH'
        elif score > 30:
            level = 'MEDIUM'
        else:
            level = 'LOW'

        return RiskScore(score=score, level=level, factors=factors)
