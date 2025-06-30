#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
ChronoCoder Deployment Script

Created by: Anubhav
Project: ChronoCoder - AI Mentor Chatbot

This script helps deploy ChronoCoder to various platforms:
- Local deployment
- Streamlit Cloud
- Heroku
- Docker
"""

import os
import sys
import subprocess
import json
from datetime import datetime

class ChronoCoderDeployment:
    """Handle deployment of ChronoCoder to various platforms."""
    
    def __init__(self):
        self.project_name = "ChronoCoder"
        self.version = "1.0.0"
        self.author = "Anubhav"
        self.description = "AI-Powered Mentor Chatbot for Python Learning"
        
    def check_requirements(self):
        """Check if all required files exist."""
        required_files = [
            "main.py",
            "mentors.py", 
            "code_parser.py",
            "utils.py",
            "anubhav_admin.py",
            "requirements.txt",
            ".streamlit/config.toml"
        ]
        
        missing_files = []
        for file in required_files:
            if not os.path.exists(file):
                missing_files.append(file)
        
        if missing_files:
            print(f"❌ Missing required files: {', '.join(missing_files)}")
            return False
        
        print("✅ All required files found!")
        return True
    
    def create_dockerfile(self):
        """Create Dockerfile for containerized deployment."""
        dockerfile_content = f'''# ChronoCoder Dockerfile
# Created by: {self.author}

FROM python:3.9-slim

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 8501

# Health check
HEALTHCHECK CMD curl --fail http://localhost:8501/_stcore/health

# Run the application
CMD ["streamlit", "run", "main.py", "--server.port=8501", "--server.address=0.0.0.0"]
'''
        
        with open("Dockerfile", "w") as f:
            f.write(dockerfile_content)
        
        print("✅ Dockerfile created!")
    
    def create_docker_compose(self):
        """Create docker-compose.yml for easy deployment."""
        compose_content = f'''version: '3.8'

services:
  chronocoder:
    build: .
    container_name: chronocoder-app
    ports:
      - "8501:8501"
    volumes:
      - ./logs:/app/logs
    environment:
      - STREAMLIT_SERVER_PORT=8501
      - STREAMLIT_SERVER_ADDRESS=0.0.0.0
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8501/_stcore/health"]
      interval: 30s
      timeout: 10s
      retries: 3
'''
        
        with open("docker-compose.yml", "w") as f:
            f.write(compose_content)
        
        print("✅ docker-compose.yml created!")
    
    def create_heroku_files(self):
        """Create files needed for Heroku deployment."""
        # Procfile
        with open("Procfile", "w") as f:
            f.write("web: streamlit run main.py --server.port=$PORT --server.address=0.0.0.0\n")
        
        # runtime.txt
        with open("runtime.txt", "w") as f:
            f.write("python-3.9.19\n")
        
        # app.json for Heroku Button
        app_json = {
            "name": self.project_name,
            "description": self.description,
            "repository": "https://github.com/yourusername/chronocoder",
            "keywords": ["python", "streamlit", "ai", "mentor", "education"],
            "env": {
                "STREAMLIT_SERVER_PORT": {
                    "description": "Port for Streamlit server",
                    "value": "8501"
                }
            },
            "formation": {
                "web": {
                    "quantity": 1,
                    "size": "free"
                }
            },
            "buildpacks": [
                {
                    "url": "heroku/python"
                }
            ]
        }
        
        with open("app.json", "w") as f:
            json.dump(app_json, f, indent=2)
        
        print("✅ Heroku deployment files created!")
    
    def create_streamlit_cloud_config(self):
        """Create configuration for Streamlit Cloud deployment."""
        secrets_example = f'''# Streamlit Cloud Secrets Example
# Copy this to your Streamlit Cloud secrets settings

[general]
app_name = "{self.project_name}"
version = "{self.version}"
author = "{self.author}"

[admin]
# Add your admin credentials here
admin_username = "your_admin_username"
admin_password = "your_admin_password"
'''
        
        with open("secrets_example.toml", "w") as f:
            f.write(secrets_example)
        
        print("✅ Streamlit Cloud configuration created!")
    
    def create_deployment_readme(self):
        """Create deployment README."""
        readme_content = f'''# {self.project_name} Deployment Guide

🚀 **Created by:** {self.author}  
📅 **Version:** {self.version}  
📝 **Description:** {self.description}

## 🌐 Deployment Options

### 1. Local Development
```bash
# Install dependencies
pip install -r requirements.txt

# Run the application
streamlit run main.py
```

### 2. Streamlit Cloud
1. Fork this repository to your GitHub account
2. Go to [share.streamlit.io](https://share.streamlit.io)
3. Connect your GitHub account
4. Deploy from your repository
5. Set up secrets using `secrets_example.toml` as reference

### 3. Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t chronocoder .
docker run -p 8501:8501 chronocoder
```

### 4. Heroku Deployment
1. Create a Heroku account
2. Install Heroku CLI
3. Login and create app:
```bash
heroku login
heroku create your-chronocoder-app
git push heroku main
```

### 5. One-Click Heroku Deploy
[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

## 📁 Project Structure
```
chronocoder/
├── main.py              # Main Streamlit application
├── mentors.py           # AI mentor personalities
├── code_parser.py       # Python code analysis
├── utils.py             # Utility functions
├── anubhav_admin.py     # Admin functionality
├── requirements.txt     # Python dependencies
├── .streamlit/          # Streamlit configuration
├── logs/               # Session logs
└── deployment files    # Docker, Heroku, etc.
```

## 🔧 Configuration

### Environment Variables
- `STREAMLIT_SERVER_PORT`: Port for the application (default: 8501)
- `STREAMLIT_SERVER_ADDRESS`: Server address (default: 0.0.0.0)

### Secrets (for production)
Copy `secrets_example.toml` and configure:
- Admin credentials
- Any API keys (if added later)

## 🎯 Features
- ✅ 8 AI Mentor Personalities
- ✅ Real-time Python code analysis
- ✅ Session logging and export
- ✅ Mobile-responsive design
- ✅ Admin panel for creators
- ✅ Easter eggs and fun interactions

## 🛠️ Troubleshooting

### Common Issues
1. **Port already in use**: Change port in config or kill existing processes
2. **Module import errors**: Check all files are present and requirements installed
3. **Permission errors**: Ensure logs directory is writable

### Support
- 📧 Contact: Create an issue on GitHub
- 📚 Documentation: See README.md in main directory

---
**Created with ❤️ by {self.author} | Powered by Python & Streamlit**
'''
        
        with open("DEPLOYMENT.md", "w") as f:
            f.write(readme_content)
        
        print("✅ Deployment README created!")
    
    def deploy_local(self):
        """Deploy locally for testing."""
        print("🚀 Starting local deployment...")
        
        # Check if Streamlit is installed
        try:
            import streamlit
            print(f"✅ Streamlit {streamlit.__version__} found")
        except ImportError:
            print("❌ Streamlit not found. Installing...")
            subprocess.check_call([sys.executable, "-m", "pip", "install", "streamlit"])
        
        # Run the application
        print("🌐 Starting ChronoCoder...")
        subprocess.run([sys.executable, "-m", "streamlit", "run", "main.py"])
    
    def create_all_deployment_files(self):
        """Create all deployment files at once."""
        print(f"🚀 Creating deployment files for {self.project_name}...")
        print(f"📝 Author: {self.author}")
        print(f"📅 Version: {self.version}")
        print("-" * 50)
        
        if not self.check_requirements():
            return False
        
        try:
            self.create_dockerfile()
            self.create_docker_compose()
            self.create_heroku_files()
            self.create_streamlit_cloud_config()
            self.create_deployment_readme()
            
            print("-" * 50)
            print("🎉 All deployment files created successfully!")
            print("📚 Check DEPLOYMENT.md for deployment instructions")
            print("🔧 Configure secrets_example.toml for production")
            
            return True
            
        except Exception as e:
            print(f"❌ Error creating deployment files: {e}")
            return False

def main():
    """Main deployment function."""
    print("🕰️ ChronoCoder Deployment Manager")
    print("=" * 50)
    
    deployer = ChronoCoderDeployment()
    
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == "local":
            deployer.deploy_local()
        elif command == "files":
            deployer.create_all_deployment_files()
        elif command == "docker":
            deployer.create_dockerfile()
            deployer.create_docker_compose()
        elif command == "heroku":
            deployer.create_heroku_files()
        elif command == "streamlit":
            deployer.create_streamlit_cloud_config()
        else:
            print(f"❌ Unknown command: {command}")
            print("Usage: python deploy.py [local|files|docker|heroku|streamlit]")
    else:
        # Interactive mode
        print("Select deployment option:")
        print("1. Create all deployment files")
        print("2. Deploy locally")
        print("3. Create Docker files only")
        print("4. Create Heroku files only")
        print("5. Create Streamlit Cloud config only")
        
        choice = input("\nEnter your choice (1-5): ").strip()
        
        if choice == "1":
            deployer.create_all_deployment_files()
        elif choice == "2":
            deployer.deploy_local()
        elif choice == "3":
            deployer.create_dockerfile()
            deployer.create_docker_compose()
        elif choice == "4":
            deployer.create_heroku_files()
        elif choice == "5":
            deployer.create_streamlit_cloud_config()
        else:
            print("❌ Invalid choice!")

if __name__ == "__main__":
    main()
