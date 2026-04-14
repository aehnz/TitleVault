"""
Phase 6.5: Integrity Hashing Service
Deterministic SHA-256 hashing for submissions and audit reports — provides tamper-detection
and chain-of-custody verification.
"""

import hashlib
import json
from typing import Optional


class IntegrityService:
    """Deterministic hashing for tamper detection and chain of custody."""

    @staticmethod
    def compute_submission_hash(payload: dict) -> str:
        """Compute a deterministic hash of the submission payload.
        Uses canonical JSON (sorted keys, no whitespace) for reproducibility.
        """
        # Strip volatile fields that change on every save
        hashable = _strip_volatile(payload)
        canonical = json.dumps(hashable, sort_keys=True, separators=(',', ':'), default=str)
        return f"sha256:{hashlib.sha256(canonical.encode('utf-8')).hexdigest()}"

    @staticmethod
    def compute_audit_hash(report: dict, submission_hash: str) -> str:
        """Hash the audit report chained to the submission hash.
        This creates a verifiable chain: submission → audit → registrar.
        """
        combined = json.dumps({
            'submission_hash': submission_hash,
            'decision': report.get('decision'),
            'auditor_id': report.get('auditor_id'),
            'audited_at': report.get('audited_at'),
            'reasons': report.get('reasons', []),
        }, sort_keys=True, separators=(',', ':'), default=str)
        return f"sha256:{hashlib.sha256(combined.encode('utf-8')).hexdigest()}"

    @staticmethod
    def compute_document_chain_hash(doc_hashes: list[str]) -> str:
        """Compute a Merkle-like root hash from a list of document hashes.
        Allows verifying that the exact set of documents was present.
        """
        if not doc_hashes:
            return "sha256:" + hashlib.sha256(b"EMPTY_DOC_SET").hexdigest()

        sorted_hashes = sorted(doc_hashes)
        combined = "|".join(sorted_hashes)
        return f"sha256:{hashlib.sha256(combined.encode('utf-8')).hexdigest()}"

    @staticmethod
    def verify_submission(payload: dict, expected_hash: str) -> bool:
        """Verify that a submission payload matches its recorded hash."""
        actual = IntegrityService.compute_submission_hash(payload)
        return actual == expected_hash

    @staticmethod
    def generate_integrity_bundle(payload: dict, audit_report: Optional[dict] = None) -> dict:
        """Generate a complete integrity verification bundle."""
        sub_hash = IntegrityService.compute_submission_hash(payload)

        # Document hashes
        doc_hashes = []
        for doc in payload.get('documents', []):
            if doc.get('hash'):
                doc_hashes.append(doc['hash'])
        doc_chain_hash = IntegrityService.compute_document_chain_hash(doc_hashes)

        bundle = {
            'submission_hash': sub_hash,
            'document_chain_hash': doc_chain_hash,
            'entity_counts': {
                'buildings': len(payload.get('buildings', [])),
                'floors': len(payload.get('floors', [])),
                'components': len(payload.get('components', [])),
                'rights_events': len(payload.get('rights_events', [])),
                'documents': len(payload.get('documents', [])),
            },
        }

        if audit_report:
            bundle['audit_hash'] = IntegrityService.compute_audit_hash(audit_report, sub_hash)
            bundle['chain'] = [sub_hash, bundle['audit_hash']]

        return bundle


def _strip_volatile(payload: dict) -> dict:
    """Remove fields that change on every save (timestamps, etc.) so the hash is stable."""
    import copy
    p = copy.deepcopy(payload)

    # Strip meta volatile fields
    meta = p.get('meta', {})
    for key in ['updated_at', 'created_at', 'locked']:
        meta.pop(key, None)

    return p
