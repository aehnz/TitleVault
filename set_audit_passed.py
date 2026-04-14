import requests
import json

# Get the perfect submission
response = requests.get('http://localhost:5000/api/submissions/sub_demo_1769340183530')
if response.status_code == 200:
    data = response.json()
    
    # Change status to AUDIT_PASSED so it appears in Registrar
    data['meta']['status'] = 'AUDIT_PASSED'
    data['meta']['locked'] = True
    
    # Update in database
    update_response = requests.post('http://localhost:5000/api/submissions', json=data)
    
    if update_response.status_code in [200, 201]:
        print("SUCCESS! Submission is now AUDIT_PASSED")
        print(f"Submission ID: {data['meta']['submission_id']}")
        print(f"Status: {data['meta']['status']}")
        print("\nGo to REGISTRAR UI - it will show up now!")
    else:
        print(f"Error: {update_response.status_code}")
else:
    print(f"Could not find submission: {response.status_code}")
