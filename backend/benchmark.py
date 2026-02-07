import asyncio
import json
import time
import httpx
import statistics

async def run_benchmark(n=5):
    url = "http://127.0.0.1:8000/process"
    payload = {
        "dom_data": {
            "title": "Benchmark Page",
            "url": "https://example.com/",
            "elements": [
                {"role": "button", "text": "Action", "selector": "#action"},
                {"role": "heading", "text": "Header", "selector": "h1"}
            ],
            "content_summary": "This is a benchmark page content."
        },
        "profile": {
            "cognitive_needs": True,
            "language_level": "simple"
        },
        "is_explicit": True
    }

    latencies = []
    process_times = []

    print(f"Starting benchmark with {n} iterations...")
    async with httpx.AsyncClient() as client:
        for i in range(n):
            start = time.perf_counter()
            try:
                response = await client.post(url, json=payload, timeout=60.0)
                end = time.perf_counter()
                
                if response.status_code == 200:
                    latency = end - start
                    latencies.append(latency)
                    
                    p_time = response.headers.get("X-Process-Time")
                    if p_time:
                        process_times.append(float(p_time))
                    
                    print(f"Iteration {i+1}: Latency={latency:.4f}s, X-Process-Time={p_time}s")
                else:
                    print(f"Iteration {i+1}: Failed with status {response.status_code}")
            except Exception as e:
                print(f"Iteration {i+1}: Exception: {e}")
            
            # Wait a bit between iterations to avoid aggressive throttling
            await asyncio.sleep(1)

    if latencies:
        print("\n--- Results ---")
        print(f"Avg Latency: {statistics.mean(latencies):.4f}s")
        print(f"Min Latency: {min(latencies):.4f}s")
        print(f"Max Latency: {max(latencies):.4f}s")
        
        if process_times:
            print(f"Avg X-Process-Time: {statistics.mean(process_times):.4f}s")
    else:
        print("No successful iterations.")

if __name__ == "__main__":
    asyncio.run(run_benchmark())