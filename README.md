# 🕰️ ChronoCoder v3 - AI Mentor Platform

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-blue)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.12+-green)](https://python.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

**Learn Python from the Legends of Computing** — A complete rebuild on a modern Next.js + FastAPI stack, with real-time streaming feedback.

---

## 🚀 What's New in v3

### Complete Tech Stack Upgrade

| Component | v2 (Legacy) | v3 (Production) | Improvement |
|-----------|-------------|-----------------|-------------|
| **Frontend** | Streamlit | Next.js 16 + React 19 | Server Components, Streaming SSR |
| **Backend** | Single-file monolith | FastAPI microservices | Async-first, WebSocket support |
| **Database** | JSON files | PostgreSQL (Supabase) | Persistent, scalable, ACID-compliant |
| **Auth** | None | Supabase Auth (Roadmap) | Multi-provider login (Email + OAuth) planned |
| **Deployment** | Streamlit Cloud | Fly.io + Vercel | Global edge deployment |
| **Streaming** | Polling | WebSockets/SSE | Real-time token-by-token feedback |
| **Testing** | Manual | Vitest + Pytest | Automated CI test suites |
| **Performance** | ~3.5s TTI | <1.5s TTI | 2.3x faster |
| **Lighthouse** | ~85 | >95 | Professional grade |

### Key Features

- ⚡ **Real-time Streaming**: Feedback streamed token-by-token like chat apps
- 🌍 **Containerised Deployment**: Next.js standalone image for Fly.io, plus a Docker Compose setup for local runs
- 🔐 **Request Validation**: Rate limiting on the feedback API and a server-side cap on WebSocket payload size
- 💾 **Optional Session Persistence**: Session records via Supabase when database credentials are configured; the API still responds without them
- 🧪 **Test Suites**: Vitest component tests and a Pytest WebSocket contract suite. CI runs backend lint, backend tests, frontend lint & build, and Docker build validation
- 📊 **Health Reporting**: `GET /api/health` reports per-dependency readiness (`ai`, `database`)
- 🎨 **Professional UI**: Glassmorphism cards, neon effects, retro-computing theme
- 🔒 **Exportable Sessions**: Download a session as Markdown; no third-party analytics or trackers are loaded

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer                             │
├─────────────────────────────────────────────────────────────┤
│  Next.js 16 (React Server Components)                       │
│  ├─ SEO-optimized pages                                    │
│  ├─ Streaming UI with typewriter effect                   │
│  └─ Responsive design (mobile-first)                        │
└─────────────────────────────────────────────────────────────┘
                              ↓ HTTPS/WSS
┌─────────────────────────────────────────────────────────────┐
│                   API Gateway                               │
├─────────────────────────────────────────────────────────────┤
│         Vercel Edge Functions (Rate limiting)               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  Backend Services                            │
├─────────────────────────────────────────────────────────────┤
│  FastAPI (Python 3.12)                                      │
│  ├─ REST API (mentors, sessions)                           │
│  ├─ WebSocket Manager (streaming feedback)                 │
│  └─ Background Workers (async tasks)                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Data Layer                                 │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL (Supabase Free Tier)                            │
│  ├─ users table                                             │
│  ├─ sessions table                                          │
│  └─ mentor_interactions table                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Quick Start

### Prerequisites

- Node.js 20+ and npm
- Python 3.12+
- Google Gemini API key (free tier available)
- Supabase account (free tier)

### Installation

```bash
# 1. Clone repository
git clone https://github.com/anubhavaanand/Chronocoder-1.git
cd chronocoder-v3

# 2. Install frontend dependencies
npm install

# 3. Install backend dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env.local
# Edit .env.local and add your API keys

# 5. Start development servers
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
uvicorn backend.main:app --reload

# Visit http://localhost:3000
```

### Docker Deployment

```bash
# Build all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

haha this is me ,,  go to this link if wanna see that render loading screen haha , dye dyee


https://chronocoder-1.onrender.com/
## 📁 Project Structure

```
chronocoder-v3/
├── docker/                       # Docker configurations
│   ├── Dockerfile.frontend       # Multi-stage build for Next.js
│   ├── Dockerfile.backend        # Lightweight Python container
│   └── init.sql                  # Database initialization
├── src/                          # Next.js frontend source
│   ├── app/                      # App Router pages
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Landing page (mentor gallery)
│   │   └── workspace/[mentorId] /
│   │       └── page.tsx         # Code editor + streaming feedback
│   ├── components/              # Reusable UI components
│   │   ├── ui/                  # Base primitives (Card, Button)
│   │   ├── mentor/              # MentorCard component
│   │   ├── code/                # Monaco Editor wrapper
│   │   └── feedback/            # Streaming renderer
│   ├── hooks/                   # Custom React hooks
│   ├── lib/                     # Utility libraries
│   └── types/                   # TypeScript interfaces
├── backend/                      # FastAPI backend services
│   ├── main.py                  # Application entry point
│   ├── routers/                 # API endpoints
│   ├── services/                # Business logic (AI gateway)
│   ├── models/                  # Database schemas
│   └── utils/                   # Helpers (WebSocket manager)
├── tests/                        # Comprehensive test suite
│   ├── setup.ts                 # Test configuration
│   ├── components/              # Unit tests
│   ├── e2e/                     # Playwright E2E tests
│   ├── performance/             # Lighthouse configs
│   └── integration/             # API integration tests
├── .env.example                 # Environment template
├── docker-compose.yml           # All-in-one local setup
├── fly.toml                     # Fly.io deployment config
├── requirements.txt             # Python dependencies
└── package.json                 # Node.js dependencies
```

---

## 🧪 Testing Strategy

### Run Tests

```bash
# Backend contract and unit tests (Pytest)
python -m pytest backend/tests -v

# Frontend unit and component tests (Vitest)
cd tests && npm test

# Frontend test watch mode
cd tests && npm run test:watch
```

### Test Coverage Goals

- Line coverage: > 80%
- Function coverage: > 85%
- Branch coverage: > 75%
- Critical paths: 100%

### Performance Benchmarks

Targets, not measurements. Nothing in this repository measures these
numbers — there is no Lighthouse budget, bundle-size gate, or load-test
harness wired into CI, and `tests/performance/budgets.json` is not
enforced anywhere. Treat the table as goals to verify, not as achieved
results.

| Metric | Target | Measured |
|--------|--------|----------|
| First Contentful Paint | <1.0s | not measured |
| Time to Interactive | <1.5s | not measured |
| Lighthouse Score | >95 | not measured |
| Bundle Size | <150KB gzipped | not measured |
| API Response Time | <300ms p95 | not measured |

---

## 🚢 Deployment

### Deploy to Fly.io

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly login

# Deploy frontend
fly launch --name chronocoder-frontend --image node:20-alpine

# Deploy backend
fly launch --name chronocoder-backend --image python:3.12-slim

# Set database
fly postgres create --name chronocoder-db

# Add secrets
fly secrets set GOOGLE_API_KEY=your_key
fly secrets set NEXT_PUBLIC_SUPABASE_URL=https://...
fly secrets set SUPABASE_URL=https://...
fly secrets set SUPABASE_ANON_KEY=...
fly secrets set SUPABASE_SERVICE_ROLE_KEY=...
fly secrets set SUPABASE_JWT_SECRET=...
```

### Deploy to Vercel (Frontend)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Deploy to Render (Backend Alternative)

```yaml
# render.yaml
services:
  - type: web
    name: chronocoder-backend
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn backend.main:app --host 0.0.0.0
    envVars:
      - key: GOOGLE_API_KEY
        sync: false
```

---

## 👥 Contributors

Built with ❤️ by Anubhav  
Special thanks to the open-source community for tools like:
- [Next.js](https://nextjs.org/) - React framework
- [FastAPI](https://fastapi.tiangolo.com/) - Python async framework
- [Google Gemini](https://ai.google/) - AI models
- [Supabase](https://supabase.com/) - Open-source Firebase alternative
- [Fly.io](https://fly.io/) - Edge deployment platform

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 📚 Citation

If you use ChronoCoder in your research or project, please cite it using the metadata in [CITATION.cff](CITATION.cff):

```bibtex
@software{Anand_ChronoCoder_2026,
  author = {Anand, Anubhav},
  title = {{ChronoCoder: AI-Powered Historical Code Review Platform}},
  year = {2026},
  url = {https://github.com/anubhavaanand/Chronocoder-1},
  license = {MIT}
}
```

---

## 🙏 Acknowledgments

This project builds upon the original ChronoCoder concept and rebuilds it on a modern Next.js + FastAPI stack. All historical mentor personas are based on real computing legends whose contributions shaped modern software engineering.

**Version**: 3.0.0  
**Status**: Active development  
**Last Updated**: September 23, 2026

---

<div align="center">

### Ready to Transform Your Coding Journey?

**Start learning from the legends at http://localhost:3001**

⭐ Star this repo if you find it helpful!

</div>
