#!/usr/bin/env python
"""
Quick ChronoCoder Deployment Script
Usage: python quick_deploy.py [local|docker|check]
"""

import subprocess
import sys
import os

def check_deployment():
    """Check if deployment is ready."""
    print("🔍 Checking ChronoCoder deployment readiness...")
    
    required_files = [
        "main.py", "mentors.py", "code_parser.py", "utils.py", 
        "anubhav_admin.py", "requirements.txt", "Dockerfile", "Procfile"
    ]
    
    missing = [f for f in required_files if not os.path.exists(f)]
    
    if missing:
        print(f"❌ Missing files: {', '.join(missing)}")
        return False
    
    print("✅ All deployment files ready!")
    print("📁 Available deployment options:")
    print("   - Local: python quick_deploy.py local")
    print("   - Docker: python quick_deploy.py docker")
    print("   - Streamlit Cloud: Push to GitHub and deploy at share.streamlit.io")
    print("   - Heroku: git push heroku main")
    
    return True

def deploy_local():
    """Deploy locally."""
    print("🚀 Starting local deployment...")
    try:
        subprocess.run([sys.executable, "-m", "streamlit", "run", "main.py"], check=True)
    except subprocess.CalledProcessError:
        print("❌ Failed to start. Make sure streamlit is installed:")
        print("   pip install streamlit")

def deploy_docker():
    """Deploy with Docker."""
    print("🐳 Starting Docker deployment...")
    try:
        print("📦 Building Docker image...")
        subprocess.run(["docker", "build", "-t", "chronocoder", "."], check=True)
        
        print("🚀 Starting container...")
        subprocess.run(["docker", "run", "-p", "8501:8501", "chronocoder"], check=True)
    except subprocess.CalledProcessError:
        print("❌ Docker deployment failed. Make sure Docker is installed and running.")
    except FileNotFoundError:
        print("❌ Docker not found. Please install Docker first.")

def main():
    if len(sys.argv) != 2:
        print("Usage: python quick_deploy.py [local|docker|check]")
        return
    
    command = sys.argv[1].lower()
    
    if command == "check":
        check_deployment()
    elif command == "local":
        deploy_local()
    elif command == "docker":
        deploy_docker()
    else:
        print("❌ Unknown command. Use: local, docker, or check")

if __name__ == "__main__":
    main()
