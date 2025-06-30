#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
ChronoCoder Mobile-Friendly Launcher
Starts ChronoCoder with network access for mobile devices

Created by: Anubh
"""

import subprocess
import socket
import sys
import os

def get_local_ip():
    """Get the local IP address for mobile access."""
    try:
        # Connect to a remote server to determine local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception:
        return "localhost"

def start_chronocoder_mobile():
    """Start ChronoCoder with mobile access enabled."""
    print("🕰️ Starting ChronoCoder with Mobile Access")
    print("=" * 50)
    
    local_ip = get_local_ip()
    port = 8501
    
    print(f"📱 Mobile Access URLs:")
    print(f"   • Local: http://localhost:{port}")
    print(f"   • Network: http://{local_ip}:{port}")
    print(f"   • WiFi (mobile): http://192.168.1.3:{port}")
    print(f"   • WiFi (alt): http://192.168.1.8:{port}")
    print()
    print("🔧 Starting Streamlit server...")
    print("=" * 50)
    
    # Start Streamlit with network access
    try:
        cmd = [
            sys.executable, "-m", "streamlit", "run", "main.py",
            "--server.address", "0.0.0.0",
            "--server.port", str(port),
            "--server.headless", "false",
            "--browser.gatherUsageStats", "false"
        ]
        
        subprocess.run(cmd, cwd=os.path.dirname(os.path.abspath(__file__)))
        
    except KeyboardInterrupt:
        print("\n👋 ChronoCoder stopped by user.")
    except Exception as e:
        print(f"❌ Error starting ChronoCoder: {e}")

if __name__ == "__main__":
    start_chronocoder_mobile()
