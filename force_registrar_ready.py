import requests
import json
import time
import uuid

# Configuration
API_BASE = "http://localhost:5000/api"
SUBMISSION_ID = "sub_demo_1769340183530"  # The perfect demo submission ID

def force_registrar_ready():
    print(f"fixing submission {SUBMISSION_ID} for Registrar...")

    # 1. Fetch the submission
    print("Fetching submission...")
    resp = requests.get(f"{API_BASE}/submissions/{SUBMISSION_ID}")
    if resp.status_code != 200:
        print(f"Error fetching submission: {resp.status_code}")
        return
    submission = resp.json()

    # 2. Force Status to AUDIT_PASSED
    print("Setting status to AUDIT_PASSED...")
    submission['meta']['status'] = 'AUDIT_PASSED'
    submission['meta']['locked'] = True
    
    requests.post(f"{API_BASE}/submissions", json=submission)

    # 3. Create Mock Audit Report
    print("Generating mock Audit Report...")
    audit_report = {
        "audit_id": f"audit_{int(time.time())}",
        "submission_id": SUBMISSION_ID,
        "parent_submission_id": None,
        "auditor_id": "auditor@demo.gov",
        "audited_at": "2026-01-25T12:00:00Z",
        "decision": "PASS",
        "change_kind_detected": "BASELINE",
        "summary": {
            "topology_events": len(submission.get('topology_events', [])),
            "rights_events": len(submission.get('rights_events', [])),
            "docs_total": 4,
            "docs_required": 4,
            "docs_missing": 0,
            "checks_failed": 0
        },
        "checks": {
            "geometry": {
                "status": "PASS",
                "results": [
                    {"check_id": "chk_geom_1", "name": "All Geometry Valid", "status": "PASS", "message": "All geometry checks passed successfully"}
                ]
            },
            "rights": {
                "status": "PASS",
                "results": [
                    {"check_id": "chk_right_1", "name": "All Rights Valid", "status": "PASS", "message": "All rights checks passed successfully"}
                ]
            },
            "documents": {
                "status": "PASS",
                "doc_results": [
                    {"doc_id": "doc_demo_sale_deed", "doc_name": "demo_sale_deed.pdf", "required": True, "status": "VALID", "comment": "Verified"},
                    {"doc_id": "doc_demo_survey", "doc_name": "demo_survey.pdf", "required": True, "status": "VALID", "comment": "Verified"}
                ]
            }
        },
        "reasons": [],
        "notes": {
            "public": "Excellent submission. All checks passed.",
            "internal": "Auto-generated for demo."
        },
        "integrity": {
            "audit_hash_preview": "sha256_mock_audit_hash",
            "inputs_hash_preview": "sha256_mock_inputs_hash"
        },
        "fix_hints": { "entities": [] }
    }

    # 4. Save Audit Report
    print("Saving Audit Report to backend...")
    resp = requests.post(f"{API_BASE}/audit-reports", json=audit_report)
    
    if resp.status_code in [200, 201]:
        print("✅ Success! Audit Report created.")
        print("🚀 Registrar UI should now open without errors.")
    else:
        print(f"❌ Failed to save audit report: {resp.text}")

if __name__ == "__main__":
    force_registrar_ready()
