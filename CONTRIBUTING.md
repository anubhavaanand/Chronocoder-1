# 🤝 Contributing to ChronoCoder

Thank you for your interest in contributing to ChronoCoder! This document provides guidelines and instructions for contributing to the project.

---

## 📚 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Questions or Issues?](#questions-or-issues)

---

## 🎯 Code of Conduct

### Our Pledge

We as members, contributors, and leaders pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, visible or invisible disability, ethnicity, sex characteristics, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, caste, color, religion, or sexual identity and orientation.

### Our Standards

**Examples of behavior that contributes to creating a positive environment:**

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what's best for the community
- Showing empathy towards other community members

**Examples of unacceptable behavior:**

- Sexualized language or imagery
- Trolling, insulting/derogatory comments, or personal attacks
- Public or private harassment
- Publishing others' private information without permission
- Other unethical or unprofessional conduct

---

## 🚀 Getting Started

### Prerequisites

Before you start contributing, ensure you have:

- GitHub account
- Git installed and configured
- Node.js 20+ and npm 10+
- Python 3.11+ installed
- Understanding of Next.js 16 (React 19 App Router) and FastAPI backend architectures

### First Time Setup

```bash
# 1. Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/Chronocoder-1.git
cd Chronocoder-1

# 2. Set up Python backend virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# 3. Install frontend dependencies
npm install
cd tests && npm install && cd ..

# 4. Set up environment variables
cp .env.example .env
# Edit .env with your GOOGLE_API_KEY and SUPABASE credentials

# 5. Run development servers
# Terminal 1: FastAPI Backend
uvicorn backend.main:app --reload --port 8000

# Terminal 2: Next.js Frontend
npm run dev
```

---

## 💻 Development Setup

### Project Structure

```
Chronocoder-1/
├── backend/                 # FastAPI backend application
│   ├── db/                  # Schema, migrations & Supabase repository
│   ├── mentors/             # Historical mentor JSON registries
│   ├── services/            # AI streaming service & Gemini client
│   ├── utils/               # env parsing & WebSocket connection manager
│   ├── tests/               # Backend Pytest test suite
│   └── main.py              # FastAPI server entrypoint
│
├── src/                     # Next.js 16 frontend
│   ├── app/                 # App router pages, layouts, & API routes
│   ├── components/          # UI, workspace, & WebGL components
│   ├── data/                # Generated mentor catalog & hand-written bios
│   ├── hooks/               # WebSocket and session state hooks
│   └── lib/                 # Shared client-side helpers
│
├── tests/                   # Frontend Vitest test suite
├── docker/                  # Dockerfiles for frontend & backend
├── scripts/                 # generate_mentor_data.py (src/data/mentors.ts) & perf runner
├── docs/                    # Contributor docs (branch cleanup, etc.)
└── .github/workflows/       # CI/CD verification pipelines
```

`src/data/mentors.ts` is **generated** from `backend/mentors/*.json` by
`scripts/generate_mentor_data.py`. Never edit it by hand — run the generator
and commit the result. CI enforces this with
`python3 scripts/generate_mentor_data.py --check`.

### Branch Strategy

We follow a trunk-based development workflow:

```
master                          # Main production branch
├── fix/cc-<issue>-<slug>       # Bug fixes
├── test/cc-<issue>-<slug>      # Test coverage
├── feat/cc-<issue>-<slug>      # Features
└── chore/<slug>                # Maintenance with no issue
```

> **Important**: No direct commits to `master`! All changes must be submitted via Pull Requests that pass 100% of CI/CD checks before merging.

Branches are deleted on merge. See [`docs/BRANCH_CLEANUP.md`](docs/BRANCH_CLEANUP.md) for the full policy and the stale-branch sweep command.

---

## 🔧 Making Changes

### Step 1: Choose Your Work

Find an issue to work on:
- Check [open issues](https://github.com/anubhavaanand/Chronocoder-1/issues)
- Look for labels: `good first issue`, `help wanted`, `bug`, `enhancement`

### Step 2: Create a Dedicated Branch

```bash
git checkout master
git pull origin master
git checkout -b fix/cc-<issue>-<slug>   # or test/…, feat/…, chore/…
```

### Step 3: Make Your Changes

Follow these guidelines:
1. **Code Quality**: Write clean, modern, typed code (TypeScript for frontend, type hints for Python).
2. **Atomic Commits**: Keep changes focused and self-contained.
3. **Tests**: Add unit tests in `backend/tests/` or `tests/` for all bug fixes or new features.
4. **Linting**: Ensure code passes both frontend and backend linters.

### Step 4: Verify Locally

```bash
# Backend linting & tests
./venv/bin/ruff check backend/
./venv/bin/pytest backend/tests

# Frontend linting & tests
npm run lint
cd tests && npm test
```

---

## 🔄 Pull Request Process

### Before Submitting

Ensure your PR:
- References the issue it resolves with `Closes #<number>` in the PR body (e.g. `Closes #103`).
- Passes all local lint checks and unit tests.
- Keeps commit history clean and atomic.

### Review and CI Verification

1. **Automated Checks**: GitHub Actions CI verifies:
   - Backend Lint (`ruff check backend/`)
   - Backend Tests (`pytest backend/tests`)
   - Frontend Lint & Build (`npm run lint && npm run build`)
   - Frontend Tests (Vitest) — 228 unit/component tests
   - Coverage thresholds — lines 80 / functions 85 / branches 75 / statements 80
   - Docker Build Validation (`Dockerfile.frontend` & `Dockerfile.backend`)
2. **Merge**: Once all CI checks are green, PR is merged into `master`.

---

## 📝 Coding Standards

### Python (Backend)

- Follow **PEP 8** with 88-character maximum line length.
- Use explicit type annotations on functions, methods, and Pydantic models.
- Asynchronous routes must not perform blocking synchronous I/O on the main event loop (`asyncio.to_thread` for external client calls).

### TypeScript / React (Frontend)

- Strict type checking with TypeScript.
- Follow Next.js 16 and React 19 App Router conventions.
- Clean hook dependencies in `useEffect` and proper cleanup on component unmount.

---

## 🧪 Testing Guidelines

### Backend Tests (Pytest)

Run backend tests:
```bash
./venv/bin/pytest backend/tests -v
```

### Frontend Tests (Vitest)

Run frontend unit tests:
```bash
cd tests && npm test
```

---

## ❓ Questions or Issues?

- **Issues**: [GitHub Issues](https://github.com/anubhavaanand/Chronocoder-1/issues)
- **Discussions**: [GitHub Discussions](https://github.com/anubhavaanand/Chronocoder-1/discussions)

---

## 📜 License

By contributing to ChronoCoder, you agree that your contributions will be licensed under the MIT License. See [LICENSE](LICENSE) for details.
