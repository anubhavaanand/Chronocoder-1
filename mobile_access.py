#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
QR Code Generator for ChronoCoder Mobile Access
Creates QR codes for easy mobile scanning

Created by: Anubh
"""

import socket

def get_local_ip():
    """Get the local IP address."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception:
        return "192.168.1.8"  # Fallback

def generate_access_info():
    """Generate access information for mobile devices."""
    local_ip = get_local_ip()
    port = 8501
    
    print("📱 ChronoCoder Mobile Access Information")
    print("=" * 50)
    print(f"🌐 Browser URLs:")
    print(f"   Desktop: http://localhost:{port}")
    print(f"   Mobile: http://{local_ip}:{port}")
    print(f"   WiFi: http://192.168.1.3:{port}")
    print(f"   Alt WiFi: http://192.168.1.8:{port}")
    print()
    print("📋 Mobile Instructions:")
    print("1. Connect your mobile to the same WiFi network")
    print("2. Open any browser on your mobile device")
    print("3. Type one of the mobile URLs above")
    print("4. Enjoy ChronoCoder on your mobile!")
    print()
    print("🎯 Features available on mobile:")
    print("   ✅ Full mentor selection")
    print("   ✅ Code input and analysis") 
    print("   ✅ Responsive design")
    print("   ✅ Admin mode access")
    print("   ✅ Easter egg hunting")
    print()
    print("💡 Pro Tips:")
    print("   • Use landscape mode for better experience")
    print("   • Bookmark the URL for quick access")
    print("   • Try voice-to-text for code input")

if __name__ == "__main__":
    generate_access_info()
