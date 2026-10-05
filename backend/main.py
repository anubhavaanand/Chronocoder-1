"""
ChronoCoder v4 - Backend API
FastAPI Application Server with Supabase Auth + Structured AI Feedback
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import json
import asyncio
from datetime import datetime
from typing import AsyncGenerator, Optional, List
import aiohttp
import os
from jose import jwt, JWTError
from supabase import create_client, Client

# Import services
from backend.services.ai_service import AIGateway
from backend.utils.websocket_manager import ConnectionManager
from backend.db.session_repo import get_session_repo

app = FastAPI(
    title="ChronoCoder API",
    version="4.0.0",
    description="AI-Powered Python Learning Platform Backend",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Global state
manager = ConnectionManager()
ai_gateway: Optional[AIGateway] = None
supabase: Optional[Client] = None

# Supabase config
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# Rate limiting
request_counts: dict[str, list[datetime]] = {}
RATE_LIMIT = 30  # requests per minute


def get_supabase_client() -> Client:
    global supabase
    if supabase is None:
        if not SUPABASE_URL or not SUPABASE_ANON_KEY:
            raise RuntimeError("SUPABASE_URL and SUPABASE_ANON_KEY required")
        supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    return supabase


async def verify_jwt_token(authorization: Optional[str] = Header(None)) -> str:
    """Extract and verify Supabase JWT, return user_id."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    
    token = authorization.split(" ")[1]
    
    if not SUPABASE_JWT_SECRET:
        # Dev mode: allow anonymous
        return "anonymous"
    
    try:
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: missing sub")
        return user_id
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


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


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global ai_gateway
    if not GOOGLE_API_KEY:
        print("⚠️ GOOGLE_API_KEY not set - AI features will be unavailable")
    else:
        ai_gateway = AIGateway(api_key=GOOGLE_API_KEY)
        print("✅ AI Gateway initialized")
    
    # Verify Supabase connection
    if SUPABASE_URL and SUPABASE_ANON_KEY:
        try:
            get_supabase_client()
            print("✅ Supabase client initialized")
        except Exception as e:
            print(f"⚠️ Supabase init failed: {e}")
    
    print("✅ Backend initialized successfully")
    yield
    # Shutdown
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


@app.get("/")
async def root():
    return {"status": "healthy", "message": "ChronoCoder v4 API", "version": "4.0.0"}


@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "chronocoder-backend"
    }


# Auth-protected endpoints
@app.get("/api/mentors", tags=["mentors"])
async def get_mentors(user_id: str = Depends(verify_jwt_token)):
    if not ai_gateway:
        raise HTTPException(status_code=503, detail="AI service unavailable")
    return {"mentors": ai_gateway.list_mentors()}


@app.get("/api/mentors/{mentor_id}", tags=["mentors"])
async def get_mentor(mentor_id: str, user_id: str = Depends(verify_jwt_token)):
    if not ai_gateway:
        raise HTTPException(status_code=503, detail="AI service unavailable")
    config = ai_gateway.get_mentor_config(mentor_id)
    if not config:
        raise HTTPException(status_code=404, detail="Mentor not found")
    return {
        "id": config.mentor_id,
        "name": config.name,
        "era": config.era,
        "icon": config.icon,
        "accent_color": config.accent_color,
        "signature_opening": config.signature_opening,
    }


# Session persistence endpoint
@app.post("/api/sessions", tags=["sessions"])
async def create_session(
    session_data: dict,
    user_id: str = Depends(verify_jwt_token)
):
    repo = get_session_repo()
    # For now, just acknowledge - full persistence in session_repo
    return {"status": "received", "session_id": session_data.get("sessionId")}


# WebSocket endpoint with auth
@app.websocket("/ws/feedback", tags=["realtime"])
async def feedback_websocket(websocket: WebSocket):
    await manager.connect(websocket)
    
    try:
        while True:
            data = await websocket.receive_json()
            
            mentor_id = data.get("mentor_id")
            user_code = data.get("user_code", "")
            session_id = data.get("session_id")
            
            if not mentor_id or not user_code:
                await websocket.send_json({
                    "type": "error",
                    "payload": {"code": "INVALID_INPUT", "message": "Missing mentor_id or user_code"}
                })
                continue
            
            # Rate limit by session_id (could be enhanced with user_id from token)
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
            
            # Stream AI feedback with structured output
            if ai_gateway:
                try:
                    async for chunk in ai_gateway.get_feedback_streaming(
                        mentor_id=mentor_id,
                        user_code=user_code,
                        code_analysis=local_analysis
                    ):
                        # chunk is already a dict with type/payload from new AIGateway
                        await websocket.send_json(chunk)
                        await asyncio.sleep(0.01)
                    
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


def analyze_code_locally(code: str) -> dict:
    lines = code.split("\n")
    functions = len([l for l in code.split('\n') if 'def ' in l])
    classes = len([l for l in code.split('\n') if 'class ' in l])
    imports = len([l for l in code.split('\n') if l.strip().startswith('import ') or l.strip().startswith('from ')])
    
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