# ChronoCoder Deployment Guide

Created by: Anubhav
Version: 1.0.0
Description: AI-Powered Mentor Chatbot for Python Learning

## Deployment Options

### 1. Local Development
```bash
# Install dependencies
pip install -r requirements.txt

# Run the application
streamlit run main.py
```

### 2. Streamlit Cloud
1. Fork this repository to your GitHub account
2. Go to share.streamlit.io
3. Connect your GitHub account
4. Deploy from your repository
5. Set up secrets using secrets_example.toml as reference

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

## Project Structure
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

## Configuration

### Environment Variables
- STREAMLIT_SERVER_PORT: Port for the application (default: 8501)
- STREAMLIT_SERVER_ADDRESS: Server address (default: 0.0.0.0)

### Secrets (for production)
Copy secrets_example.toml and configure:
- Admin credentials
- Any API keys (if added later)

## Features
- 8 AI Mentor Personalities
- Real-time Python code analysis
- Session logging and export
- Mobile-responsive design
- Admin panel for creators
- Easter eggs and fun interactions

## Troubleshooting

### Common Issues
1. Port already in use: Change port in config or kill existing processes
2. Module import errors: Check all files are present and requirements installed
3. Permission errors: Ensure logs directory is writable

### Support
- Contact: Create an issue on GitHub
- Documentation: See README.md in main directory

---
Created with love by Anubhav | Powered by Python & Streamlit
