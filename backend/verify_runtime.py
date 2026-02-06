import asyncio
import httpx
import json

async def verify_runtime():
    url = "http://127.0.0.1:8000/process"
    
    payload = {
        "dom_data": {
            "title": "Test Page",
            "url": "https://example.com",
            "elements": [
                {"role": "button", "text": "Login", "selector": "#login", "aria_label": "Login to your account"},
                {"role": "heading", "text": "Welcome", "selector": "h1"},
                {"role": "link", "text": "Forgot Password?", "selector": ".forgot-pass"}
            ]
        },
        "profile": {
            "cognitive_needs": True,
            "language_level": "simple"
        },
        "logs": ["user scrolled rapidly", "user hovered over login button for 5 seconds"]
    }
    
    print(f"Sending request to {url}...")
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, timeout=30.0)
            print(f"Status Code: {response.status_code}")
            if response.status_code == 200:
                print("Response Body:")
                print(json.dumps(response.json(), indent=2))
            else:
                print(f"Error: {response.text}")
        except Exception as e:
            print(f"Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(verify_runtime())
