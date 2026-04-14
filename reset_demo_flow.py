import requests
import json
import time
import os
import shutil

# Configuration
API_BASE = "http://localhost:5000/api"
DB_DIR = "c:\\Users\\DHC\\Desktop\\UDHBHA_FINAL\\database" 

def clear_database():
    """Wipe the database to ensure fresh start"""
    print("\n🧹 Clearing database...")
    try:
        # Simple file deletion for RealmDB (JSON files)
        # assuming they are in the root directory or a known location based on RealmDB init
        # Based on logs, it seems to use local files.
        # Ideally we'd call a 'drop' endpoint but let's just use Python to post 'delete' if available or just proceed.
        # Since we don't have a flush endpoint, we will just use new IDs which is safer.
        print("Using new IDs to simulate fresh start (Database wipe skipped to ensure stability)")
    except Exception as e:
        print(f"Warning clearing DB: {e}")

def create_perfect_flow():
    print("\nStarting End-to-End Perfect Flow Setup...")
    
    # 1. Load Perfect Input
    print("1. Loading perfect submission data...")
    with open('examples/input_perfect.json', 'r') as f:
        data = json.load(f)
    
    # Generate FRESH ID
    new_id = f"sub_{int(time.time() * 1000)}"
    data['meta']['submission_id'] = new_id
    data['meta']['status'] = 'SUBMITTED' # Start as submitted for Auditor view
    data['meta']['created_at'] = "2026-01-25T12:00:00Z"
    
    print(f"   CREATED ID: {new_id}")

    # 2. Surveyor Submit
    print("2. Surveyor: Creating submission...")
    resp = requests.post(f"{API_BASE}/submissions", json=data)
    if resp.status_code not in [200, 201]:
        print(f"❌ Failed to create submission: {resp.text}")
        return

    # 3. Auditor Approve (Create Audit Report)
    print("3. Auditor: Creating clean Audit Report (PASS)...")
    audit_report = {
        "audit_id": f"audit_{new_id}",
        "submission_id": new_id,
        "parent_submission_id": None,
        "auditor_id": "auditor@demo.gov",
        "audited_at": "2026-01-25T12:05:00Z",
        "decision": "PASS",
        "change_kind_detected": "BASELINE",
        "summary": {
            "topology_events": 0,
            "rights_events": 2,
            "docs_total": 4,
            "docs_required": 4,
            "docs_missing": 0,
            "checks_failed": 0
        },
        "checks": {
            "geometry": { 
                "status": "PASS", 
                "results": [{"check_id": "g1", "name": "All Valid", "status": "PASS", "message": "Perfect geometry"}] 
            },
            "rights": { 
                "status": "PASS", 
                "results": [{"check_id": "r1", "name": "All Valid", "status": "PASS", "message": "Perfect rights"}] 
            },
            "documents": { 
                "status": "PASS", 
                "doc_results": [
                    {"doc_id": "d1", "doc_name": "Deed", "required": True, "status": "VALID", "comment": "Verified"}
                ] 
            }
        },
        "reasons": [],
        "notes": { "public": "Approved for registration", "internal": "Clean record" },
        "integrity": { "audit_hash_preview": "hash1", "inputs_hash_preview": "hash2" },
        "fix_hints": { "entities": [] }
    }
    requests.post(f"{API_BASE}/audit-reports", json=audit_report)
    
    # Update status to AUDIT_PASSED
    data['meta']['status'] = 'AUDIT_PASSED'
    data['meta']['locked'] = True
    requests.post(f"{API_BASE}/submissions", json=data)

    # 4. Registrar Finalize (Create Registrar Record & Anchor)
    print("4. Registrar: Finalizing and Anchoring...")
    
    # Create Transparency Bundle first (registrar needs it)
    bundle = {
        "transparency_bundle": {
            "submission_id": new_id,
            "audit_report": audit_report,
            "submission_data": data
        }
    }
    requests.post(f"{API_BASE}/transparency-bundles", json=bundle)

    # Create Registrar Record
    registrar_record = {
        "record_id": f"reg_{new_id}",
        "submission_id": new_id,
        "registrar_id": "registrar@demo.gov",
        "decision": "APPROVED_FINAL",
        "decided_at": "2026-01-25T12:10:00Z",
        "notes": { "public": "Officially Registered", "internal": "" },
        "chain_anchor": {
            "tx_hash": "0x7a3f2c1b9e8d4a5f6c2b1a9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c",
            "block_number": 1000042,
            "bundle_hash": "0x9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8",
            "timestamp": "2026-01-25T12:10:00Z",
            "chain_id": "ethereum-mainnet",
            "status": "confirmed",
            "network": "Ethereum Mainnet"
        }
    }
    requests.post(f"{API_BASE}/registrar-records", json=registrar_record)

    # Update ID map for easy access
    print("\nPERFECT DEMO FLOW COMPLETE!")
    print(f"USE SUBMISSION ID: {new_id}")
    print(f"PARCEL ID: {data['parcel']['parcel_id']}")
    
    # Save this ID to a file so UI can potentially pick it up or user can copy
    with open('demo_id.txt', 'w') as f:
        f.write(new_id)

if __name__ == "__main__":
    create_perfect_flow()
