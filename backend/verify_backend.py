import asyncio

import httpx


async def verify() -> None:
    """Verifies the backend API endpoints."""
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        # Test health
        print("Testing /health...")
        try:
            r = await client.get("/health")
            print(f"Health: {r.json()}")
        except Exception as e:
            print(f"Server not running? {e}")
            return

        # Test explain
        print("\nTesting /explain...")
        mock_dom = {
            "title": "Example Shop",
            "url": "https://shop.example.com",
            "elements": [
                {"role": "heading", "text": "Welcome to our Shop"},
                {"role": "button", "text": "Add to Cart", "selector": "#add-btn"},
                {"role": "link", "text": "Checkout", "selector": "#checkout-link"}
            ]
        }
        r = await client.post("/explain", json={"dom_data": mock_dom})
        print(f"Explain response: {r.json()}")

        # Test action
        print("\nTesting /action...")
        r = await client.post("/action", json={
            "dom_data": mock_dom,
            "query": "I want to buy these items"
        })
        print(f"Action response: {r.json()}")

if __name__ == "__main__":
    asyncio.run(verify())
