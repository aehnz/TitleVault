import json
import os
import requests

INPUT_FILE = r'c:\Users\DHC\Desktop\UDHBHA_FINAL\examples\input.json'
API_URL = 'http://localhost:5000/api/submissions'

# Define comprehensive demo documents for all validation requirements
DEMO_DOCS = {
    "doc_demo_sale_deed": {
        "id": "doc_demo_sale_deed",
        "name": "demo_sale_deed.pdf",
        "type": "sale_deed"
    },
    "doc_demo_survey": {
        "id": "doc_demo_survey",
        "name": "demo_survey.pdf",
        "type": "survey"
    },
    "doc_demo_plan": {
        "id": "doc_demo_plan",
        "name": "demo_plan.pdf",
        "type": "plan"
    },
    "doc_demo_general": {
        "id": "doc_demo_general",
        "name": "demo_doc.pdf",
        "type": "other"
    }
}

def inject_docs(obj, doc_types_to_add):
    """Recursively inject demo documents into all 'docs' arrays"""
    if isinstance(obj, dict):
        for key, value in obj.items():
            if key == 'docs':
                # Ensure it's a list
                if not isinstance(obj[key], list):
                    obj[key] = []
                
                # Add each demo doc type if not already present
                for doc_id in doc_types_to_add:
                    has_doc = False
                    for d in obj[key]:
                        if isinstance(d, str) and d == doc_id:
                            has_doc = True
                            break
                        elif isinstance(d, dict) and d.get('id') == doc_id:
                            has_doc = True
                            break
                    
                    if not has_doc:
                        obj[key].append(DEMO_DOCS[doc_id])
            else:
                inject_docs(value, doc_types_to_add)
    elif isinstance(obj, list):
        for item in obj:
            inject_docs(item, doc_types_to_add)

def run():
    print(f"Loading {INPUT_FILE}...")
    with open(INPUT_FILE, 'r') as f:
        data = json.load(f)

    print("Injecting comprehensive demo documents...")
    
    # Parcel: survey + general
    inject_docs(data['parcel'], ['doc_demo_survey', 'doc_demo_general'])
    
    # Buildings: plan + general
    for b in data.get('buildings', []):
        inject_docs(b, ['doc_demo_plan', 'doc_demo_general'])
    
    # Floors: plan + general
    for f in data.get('floors', []):
        inject_docs(f, ['doc_demo_plan', 'doc_demo_general'])
    
    # Components: general
    for c in data.get('components', []):
        inject_docs(c, ['doc_demo_general'])
    
    # Claims: sale_deed + general (for ownership)
    for cl in data.get('claims', []):
        if cl.get('kind') == 'OWNERSHIP':
            inject_docs(cl, ['doc_demo_sale_deed', 'doc_demo_general'])
        else:
            inject_docs(cl, ['doc_demo_general'])
    
    # Rights events: sale_deed for ownership, general for others
    for e in data.get('rights_events', []):
        if 'OWNERSHIP' in e.get('kind', ''):
            inject_docs(e, ['doc_demo_sale_deed', 'doc_demo_general'])
        else:
            inject_docs(e, ['doc_demo_general'])
    
    # Topology events: general
    for e in data.get('topology_events', []):
        inject_docs(e, ['doc_demo_general'])

    # Add to documents array (avoid duplicates)
    if 'documents' not in data:
        data['documents'] = []
    
    existing_doc_ids = {d.get('doc_id') for d in data['documents']}
    for doc_id, doc_info in DEMO_DOCS.items():
        if doc_id not in existing_doc_ids:
            data['documents'].append({
                "doc_id": doc_id,
                "type": doc_info["type"],
                "title": f"Hackathon Demo - {doc_info['name']}"
            })

    # Add to documents_index
    if 'documents_index' not in data:
        data['documents_index'] = {}
    
    for doc_id, doc_info in DEMO_DOCS.items():
        if doc_id not in data['documents_index']:
            data['documents_index'][doc_id] = {
                "id": doc_id,
                "name": doc_info["name"],
                "type": doc_info["type"],
                "mime": "application/pdf",
                "size": 1024000,
                "storage": {
                    "provider": "S3",
                    "ref": f"hackathon/{doc_info['name']}"
                },
                "hash": f"sha256_mock_hash_{doc_id}",
                "created_at": "2026-01-25T00:00:00Z",
                "created_by": data['meta']['created_by']
            }

    # Save updated input.json
    print(f"Saving updated {INPUT_FILE}...")
    with open(INPUT_FILE, 'w') as f:
        json.dump(data, f, indent=2)

    # Sync with database
    print("Syncing with backend database...")
    try:
        response = requests.post(API_URL, json=data)
        if response.status_code in [200, 201]:
            print("✅ Successfully synced with database!")
            print("\n📋 Demo documents added:")
            for doc_id, doc_info in DEMO_DOCS.items():
                print(f"  • {doc_info['name']} ({doc_info['type']})")
            print("\n🎉 Perfect demo ready! All validation checks will pass.")
        else:
            print(f"Failed to sync: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Error connecting to backend: {e}")

if __name__ == "__main__":
    run()
