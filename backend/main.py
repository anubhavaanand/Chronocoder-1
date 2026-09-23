"""
ChronoCoder v3 - Backend API
FastAPI Application Server
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import json
import asyncio
from datetime import datetime
from typing import AsyncGenerator, Optional
import aiohttp

# Import services
from backend.services.ai_service import AIGateway
from backend.utils.websocket_manager import ConnectionManager

app = FastAPI(
    title="ChronoCoder API",
    version="3.0.0",
    description="AI-Powered Python Learning Platform Backend",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Global state
manager = ConnectionManager()
ai_gateway: Optional[AIGateway] = None

# Mentor configurations
MENTORS = {
    "ada_lovelace": {
        "name": "Ada Lovelace",
        "era": "London, 1843",
        "icon": "🔮",
        "accent_color": "#c08585"
    },
    "linus_torvalds": {
        "name": "Linus Torvalds",
        "era": "Helsinki, 1991",
        "icon": "🐧",
        "accent_color": "#e0a458"
    },
    "grace_hopper": {
        "name": "Grace Hopper",
        "era": "Harvard, 1947",
        "icon": "💻",
        "accent_color": "#7492ad"
    },
    "alan_turing": {
        "name": "Alan Turing",
        "era": "Milton Keynes, 1941",
        "icon": "🧠",
        "accent_color": "#a3a380"
    },
    "margaret_hamilton": {
        "name": "Margaret Hamilton",
        "era": "MIT Apollo 11, 1969",
        "icon": "🚀",
        "accent_color": "#c4696f"
    },
    "dennis_ritchie": {
        "name": "Dennis Ritchie",
        "era": "Murray Hill, 1973",
        "icon": "⚡",
        "accent_color": "#9aa5ad"
    },
    "barbara_liskov": {
        "name": "Barbara Liskov",
        "era": "MIT, 1987",
        "icon": "🏛️",
        "accent_color": "#6f87c4"
    },
    "guido_van_rossum": {
        "name": "Guido van Rossum",
        "era": "CWI Amsterdam, 1990",
        "icon": "🐍",
        "accent_color": "#d9b64e"
    }
}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize AI gateway
    global ai_gateway
    api_key = "your_google_api_key_here"  # Load from environment in production
    ai_gateway = AIGateway(api_key=api_key)
    print("✅ Backend initialized successfully")
    yield
    # Shutdown: Cleanup resources
    print("👋 Backend shutting down")

app.router.lifespan_context = lifespan

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting (simple implementation)
request_counts: dict[str, list[datetime]] = {}
RATE_LIMIT = 30  # requests per minute

def check_rate_limit(user_id: str) -> bool:
    """Check if user is within rate limit"""
    now = datetime.now()
    minute_ago = now.timestamp() - 60
    
    if user_id not in request_counts:
        request_counts[user_id] = []
    
    # Clean old requests
    request_counts[user_id] = [
        ts for ts in request_counts[user_id] 
        if ts.timestamp() > minute_ago
    ]
    
    # Check limit
    if len(request_counts[user_id]) >= RATE_LIMIT:
        return False
    
    # Record this request
    request_counts[user_id].append(now)
    return True

@app.get("/")
async def root():
    """API health check endpoint"""
    return {
        "status": "healthy",
        "message": "ChronoCoder v3 API",
        "version": "3.0.0"
    }

@app.get("/api/health")
async def health_check():
    """Health check for monitoring"""
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "chronocoder-backend"
    }

@app.get("/api/mentors", tags=["mentors"])
async def get_mentors():
    """Get all available mentors"""
    return {
        "mentors": [
            {
                "id": mentor_id,
                **MENTORS[mentor_id],
                "greeting": MENTORS[mentor_id]["name"].split()[0] + "'s greeting placeholder",
                "expertise": "Custom expertise text"
            }
            for mentor_id in MENTORS.keys()
        ]
    }

@app.get("/api/mentors/{mentor_id}", tags=["mentors"])
async def get_mentor(mentor_id: str):
    """Get specific mentor details"""
    if mentor_id not in MENTORS:
        raise HTTPException(status_code=404, detail="Mentor not found")
    
    return {
        "id": mentor_id,
        **MENTORS[mentor_id],
        "greeting": f"{MENTORS[mentor_id]['name']}'s teaching philosophy",
        "expertise": "Personalized expertise area"
    }

@app.websocket("/ws/feedback", tags=["realtime"])
async def feedback_websocket(websocket: WebSocket):
    """WebSocket endpoint for real-time streaming feedback"""
    await manager.connect(websocket)
    
    try:
        while True:
            # Receive client message
            data = await websocket.receive_json()
            
            # Validate input
            mentor_id = data.get("mentor_id")
            user_code = data.get("user_code", "")
            session_id = data.get("session_id")
            
            if not mentor_id or not user_code:
                await websocket.send_json({
                    "type": "error",
                    "payload": {"code": "INVALID_INPUT", "message": "Missing mentor_id or user_code"}
                })
                continue
            
            # Check rate limit
            if not check_rate_limit(session_id or "anonymous"):
                await websocket.send_json({
                    "type": "error",
                    "payload": {
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": "Too many requests. Please wait.",
                        "retry_after": 60
                    }
                })
                continue
            
            # Send analysis complete event first
            local_analysis = analyze_code_locally(user_code)
            await websocket.send_json({
                "type": "analysis_complete",
                "payload": local_analysis
            })
            
            # Stream AI feedback
            if ai_gateway:
                try:
                    async for token in ai_gateway.get_feedback_streaming(
                        mentor_id=mentor_id,
                        user_code=user_code,
                        code_analysis=local_analysis
                    ):
                        await websocket.send_json({
                            "type": "feedback_token",
                            "payload": {
                                "token": token,
                                "progress": min(int(len(token) / 50), 100)  # Rough estimate
                            }
                        })
                        
                        # Small delay for readability
                        await asyncio.sleep(0.01)
                    
                    await websocket.send_json({
                        "type": "feedback_complete",
                        "payload": {"status": "success"}
                    })
                    
                except Exception as e:
                    await websocket.send_json({
                        "type": "error",
                        "payload": {"code": "AI_ERROR", "message": str(e)}
                    })
            else:
                await websocket.send_json({
                    "type": "error",
                    "payload": {"code": "AI_UNAVAILABLE", "message": "AI service temporarily unavailable"}
                })
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"❌ WebSocket error: {e}")
        manager.disconnect(websocket)

# Utility function for local code analysis
def analyze_code_locally(code: str) -> dict:
    """Perform static code analysis locally"""
    lines = code.split("\n")
    functions = len([l for l in code.split('\n') if 'def ' in l])
    classes = len([l for l in code.split('\n') if 'class ' in l])
    imports = len([l for l in code.split('\n') if l.strip().startswith('import ') or l.strip().startswith('from ')])
    
    # Simple complexity score
    complexity_score = min((functions * 2 + classes + imports), 10)
    
    return {
        "line_count": len(lines),
        "functions": functions,
        "classes": classes,
        "imports": imports,
        "complexity_score": complexity_score,
        "estimated_tokens": max(1, len(code) // 4)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
