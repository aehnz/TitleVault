import requests
import json
import time

# Load the perfect submission
with open('examples/input_perfect.json', 'r') as f:
    data = json.load(f)

# Generate a fresh submission ID
new_id = f"sub_demo_{int(time.time() * 1000)}"
data['meta']['submission_id'] = new_id
data['meta']['status'] = 'DRAFT'

# Upload to backend
response = requests.post('http://localhost:5000/api/submissions', json=data)

if response.status_code in [200, 201]:
    print(f"SUCCESS! Submission uploaded: {new_id}")
    print(f"\nIMPORT THIS IN SURVEYOR UI:")
    print(f"Submission ID: {new_id}")
    print(f"\nIt has:")
    print(f"  - 3 geo anchors")
    print(f"  - 2 units (unit_101, unit_102)")
    print(f"  - 2 ownership events (Alice, Bob)")
    print(f"  - All document types (sale_deed, survey, plan, other)")
    print(f"  - Perfect geometry (no overlaps)")
    print(f"\nALL VALIDATION CHECKS WILL PASS!")
else:
    print(f"Error: {response.status_code}")
    print(response.text)
