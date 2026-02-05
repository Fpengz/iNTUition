# Contributing to Aura

Thank you for your interest in contributing to Aura (iNTUition 2026)! We welcome contributions to help make digital interfaces more accessible.

## 🛠 Development Setup

### Backend
1. Install [uv](https://github.com/astral-sh/uv).
2. Navigate to `backend/`.
3. Install dependencies and sync environment:
   ```bash
   uv sync
   ```
4. Run the server:
   ```bash
   uv run uvicorn app.main:app --reload
   ```

### Extension (Frontend)
1. Navigate to `extension/`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run dev server:
   ```bash
   npm run dev
   ```

## 🌿 Git Workflow

1. **Fork and Clone** the repository.
2. **Create a Branch** for your feature or fix:
   ```bash
   git checkout -b feat/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

## 📝 Commit Message Standards

We follow the **Conventional Commits** specification.

**Format:** `<type>(<scope>): <subject>`

**Types:**
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

**Examples:**
- `feat(backend): add gemini integration for summarization`
- `fix(extension): resolve dom distillation selector issue`
- `docs: update architecture diagram in README`

## ✅ Pre-commit Checks

Before submitting a Pull Request, please ensure your code passes the following checks.

### Backend
Run these commands from the `backend/` directory (configured via `pyproject.toml`):

1. **Linting & Formatting (Ruff):**
   ```bash
   uv run ruff check . --fix
   uv run ruff format .
   ```

2. **Type Checking (MyPy):**
   ```bash
   uv run mypy .
   ```

## 🚀 Pull Request Process

1. Push your branch to your fork.
2. Open a Pull Request against the `main` branch.
3. Provide a clear description of the changes and link any relevant issues.
4. Wait for code review and address any feedback.