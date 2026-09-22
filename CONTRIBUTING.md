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
- Python 3.10+ installed
- Git installed and configured
- Basic understanding of Streamlit framework
- Familiarity with AST (Abstract Syntax Tree) parsing is helpful but not required

### First Time Setup

```bash
# 1. Fork the repository
git clone https://github.com/YOUR_USERNAME/Chronocoder-1.git
cd Chronocoder-1

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt
pip install pytest black ruff pre-commit

# 4. Set up secrets (required for AI functionality)
cp .streamlit/secrets_example.toml .streamlit/secrets.toml
# Edit secrets.toml with your Google AI Studio API key

# 5. Run the app to verify setup
streamlit run main.py
```

---

## 💻 Development Setup

### Project Structure

```
Chronocoder-1/
├── main.py              # Application entry point
├── styles.py            # CSS design system
├── mentors.py           # Mentor personalities
├── scenes.py            # Three.js hero scenes
├── themes.py            # Color themes
├── code_parser.py       # Code analysis engine
├── utils.py             # Utility functions
│
├── tests/               # Test suite
├── docs/                # Documentation
├── screenshots/         # Visual documentation
└── .github/             # CI/CD workflows
```

### Branch Strategy

We use the following branch model:

```
master                 # Production-ready code
├── develop            # Development integration branch
├── feature/*          # New features
├── bugfix/*           # Bug fixes
├── hotfix/*           # Urgent production fixes
└── release/*          # Release preparation branches
```

---

## 🔧 Making Changes

### Step 1: Choose Your Work

Find an issue to work on:
- Check [open issues](https://github.com/anubhavaanand/Chronocoder-1/issues)
- Look for labels: `good first issue`, `help wanted`, `bug`, `enhancement`
- Or propose your own feature idea via discussion

### Step 2: Create Feature Branch

```bash
# Switch to develop branch (or master if no develop)
git checkout master

# Create your feature branch
git checkout -b feature/your-feature-name

# If bug fix
git checkout -b bugfix/fix-issue-description
```

### Step 3: Make Your Changes

Follow these guidelines:

1. **Code Quality**: Write clean, readable code
2. **Comments**: Add meaningful comments where needed
3. **Tests**: Write tests for new functionality
4. **Documentation**: Update README or relevant docs
5. **Formatting**: Use black formatter
6. **Linting**: Ensure no issues with ruff

Example commit structure:

```bash
git add .
git commit -m "feat: add new mentor personality

- Added Ada Lovelace retrospective mode
- Updated themes.py with historical context
- Added test cases for Ada feedback generation

Fixes #123"
```

### Step 4: Test Your Changes

```bash
# Run tests
pytest . -v

# Format code
black .

# Lint code
ruff check .

# Run locally
streamlit run main.py
```

---

## 🔄 Pull Request Process

### Before Submitting

Ensure your PR:

✅ Addresses a specific issue (link it)  
✅ Has clear description of changes  
✅ Includes tests for new functionality  
✅ Passes all existing tests  
✅ Follows coding standards  
✅ Updates documentation if needed  
✅ No merge conflicts  

### PR Template

Fill out the PR template completely:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing Done
- [ ] Unit tests added/updated
- [ ] Manually tested
- [ ] Cross-browser tested

## Checklist
- [ ] Code follows project style
- [ ] Self-review done
- [ ] Comments added where needed
- [ ] Documentation updated
```

### Review Process

1. **Automated Checks**: CI will run automatically
2. **Maintainer Review**: At least one maintainer must approve
3. **Discussion**: Address review comments promptly
4. **Merge**: Once approved, maintainers will squash and merge

Typical turnaround time: 24-48 hours

---

## 📝 Coding Standards

### Python Style Guide

Follow [PEP 8](https://pep8.org/) with these additions:

- **Line Length**: Maximum 88 characters
- **Imports**: Grouped alphabetically, separated by blank lines
- **Functions**: Short, focused, single responsibility
- **Naming**: 
  - Classes: `CamelCase`
  - Functions: `snake_case`
  - Constants: `UPPER_SNAKE_CASE`
  - Private: `_leading_underscore`

### Example Code Structure

```python
#!/usr/bin/env python3
"""Module docstring explaining purpose."""

import os
import sys
from typing import Dict, List, Optional

class ClassName:
    """Class docstring with short description."""
    
    def __init__(self):
        """Initialize class attributes."""
        self.attribute = None
    
    def method_name(self, param1: str, param2: int = 0) -> bool:
        """
        Method docstring with description.
        
        Args:
            param1: Description of parameter 1
            param2: Description of parameter 2
            
        Returns:
            Boolean description
            
        Raises:
            ValueError: When condition X occurs
        """
        try:
            # Implementation here
            return True
        except Exception as e:
            logger.error(f"Error: {e}")
            return False


def standalone_function(arg: str) -> str:
    """Function docstring."""
    return arg.upper()


if __name__ == "__main__":
    # Entry point code
    pass
```

### Formatting Rules

Run before committing:

```bash
# Format with Black
black .

# Lint with Ruff
ruff check .

# Fix common issues
ruff check --fix .
```

---

## 🧪 Testing Guidelines

### Writing Tests

Use `pytest` framework. Organize tests logically:

```python
def test_function_positive_case():
    """Test normal operation."""
    result = my_function(valid_input)
    assert result == expected_output

def test_function_edge_case():
    """Test boundary conditions."""
    result = my_function(edge_input)
    assert result is None

def test_function_error_handling():
    """Test error scenarios."""
    with pytest.raises(ValueError):
        my_function(invalid_input)
```

### Running Tests

```bash
# All tests
pytest . -v

# Specific file
pytest test_code_parser.py -v

# With coverage
pytest --cov=. --cov-report=html

# Failed tests only
pytest --lf
```

### Test Coverage Target

Aim for **minimum 80% coverage**:

- Unit tests: Essential for core logic
- Integration tests: For component interactions
- E2E tests: Critical user flows

---

## 📖 Documentation

### What Needs Documentation

- New public APIs/functions
- Complex algorithms
- Configuration options
- User-facing features
- Breaking changes

### Where to Document

1. **README.md**: General usage and features
2. **Individual Files**: Docstrings for code
3. **docs/**: Technical deep dives
4. **CHANGELOG.md**: Notable changes

### Documentation Style

- Clear, concise language
- Code examples when possible
- Screenshots for UI changes
- Links to external resources

---

## ❓ Questions or Issues?

### Getting Help

1. **Check Existing Resources**
   - [Documentation](docs/)
   - [Open/Closed Issues](https://github.com/anubhavaanand/Chronocoder-1/issues)
   - [FAQ](README.md#faq)

2. **Contact Channels**
   - GitHub Issues for bugs/features
   - Discussions for general questions
   - Email for sensitive matters

### Reporting Bugs

Provide:
- Clear description
- Steps to reproduce
- Expected vs actual behavior
- Environment details
- Screenshots/logs if applicable

### Suggesting Features

Include:
- Problem statement
- Proposed solution
- Use cases
- Benefits to users
- Alternatives considered

---

## 🎓 Resources

### Learning Materials

- [Streamlit Documentation](https://docs.streamlit.io/)
- [Python PEP 8](https://pep8.org/)
- [Black Formatting](https://black.readthedocs.io/)
- [Google Python Style](https://google.github.io/styleguide/pyguide.html)

### Good First Issues

Look for these labels on issues:
- `good first issue`
- `beginner-friendly`
- `documentation`

---

## 📜 License

By contributing to ChronoCoder, you agree that your contributions will be licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

## ❤️ Thank You!

Your contributions make ChronoCoder better for everyone. Whether it's fixing a typo, adding a feature, or reporting a bug—every contribution counts!

**Ready to contribute? Start by picking an issue!** 🚀

---

<div align="center">

**Built with ❤️ for the Python community**

*Last updated: September 2026*

</div>
