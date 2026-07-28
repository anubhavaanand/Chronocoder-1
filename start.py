"""
Quick start script for ChronoCoder
This script starts the Streamlit app with headless mode and no analytics.
"""

import subprocess
import os
import sys

def start_chronocoder():
    """Start ChronoCoder application."""
    print("🕰️ Starting ChronoCoder...")
    
    # Run streamlit
    try:
        subprocess.run([
            sys.executable, "-m", "streamlit", "run", "main.py",
            "--server.headless=true",
            "--browser.gatherUsageStats=false"
        ], cwd=os.path.dirname(os.path.abspath(__file__)))
    except KeyboardInterrupt:
        print("\n👋 ChronoCoder stopped.")

if __name__ == "__main__":
    start_chronocoder()
