"""
Quick start script for ChronoCoder
This script bypasses the Streamlit email prompt
"""

import subprocess
import os
import sys

def start_chronocoder():
    """Start ChronoCoder application."""
    print("🕰️ Starting ChronoCoder...")
    
    # Set Streamlit configuration to skip email
    os.environ['STREAMLIT_EMAIL'] = ''
    
    # Run streamlit
    try:
        subprocess.run([
            sys.executable, "-m", "streamlit", "run", "main.py",
            "--server.headless", "true"
        ], cwd=os.path.dirname(os.path.abspath(__file__)))
    except KeyboardInterrupt:
        print("\n👋 ChronoCoder stopped.")

if __name__ == "__main__":
    start_chronocoder()
