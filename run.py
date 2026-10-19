"""
SAR Sentinel - Application Launcher
NASA Space Apps Challenge 2026: Dancing with the SARs
Team: SAR Sentinel
"""

import sys
import os
import webbrowser
import uvicorn

# Ensure UTF-8 output encoding on Windows
if sys.platform.startswith("win"):
    sys.stdout.reconfigure(encoding="utf-8")

def main():
    print("=" * 65)
    print("SAR SENTINEL - NASA-ISRO RADAR EARTH OBSERVATION PLATFORM")
    print("NASA Space Apps Challenge 2026 | Team: SAR Sentinel")
    print("=" * 65)
    print("\n[+] Initializing FastAPI Server & NASA ASF DAAC Client...")
    print("[+] Launching Mission Control UI at http://127.0.0.1:8000\n")
    
    # Auto-open browser after 1.5 seconds
    import threading
    import time
    def open_browser():
        time.sleep(1.5)
        webbrowser.open("http://127.0.0.1:8000")
        
    threading.Thread(target=open_browser, daemon=True).start()

    # Run Uvicorn server
    uvicorn.run("backend.app:app", host="127.0.0.1", port=8000, reload=False)

if __name__ == "__main__":
    main()
