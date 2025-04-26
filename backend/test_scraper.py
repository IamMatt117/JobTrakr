import requests
import json

url = "http://localhost:5000/api/jobs"
data = {
    "url": "https://www.linkedin.com/jobs/view/4203304462/?alternateChannel=search&refId=8l9HvvolANnKiSV10UuBpg%3D%3D&trackingId=IjGQ2E3ETmTRO7dowZ8r0A%3D%3D"
}

response = requests.post(url, json=data)
print("Status Code:", response.status_code)
print("Response:", json.dumps(response.json(), indent=2)) 