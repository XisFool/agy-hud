# agy-hud Development Workflow Rules

## 1. Quality Assurance (TDD/E2E)
- **TDD First**: Every new feature MUST start with a unit test. Logic implementation follows only after the test is in place.
- **E2E Validation**: All user-facing features must have E2E tests. Mocking is forbidden for external services (must succeed 3+ times in real environment).
- **Automation**: CI/CD hooks must run tests before any merge.

## 2. Coding Standards
- **No Direct Push**: All changes must go through a Branch -> Pull Request flow. Direct commits to `main` are prohibited.
- **TypeScript**: No `any` allowed. Use specific types or generics.
- **Python (if used)**: Always use `uv run`.

## 3. Documentation & Maintenance
- **Docs First**: Architectural designs and specifications must be documented in `docs/` before implementation.
- **Bilingual Support**: All user-facing documentation and UI strings must support both English and Simplified Chinese.
- **Changelog**: Every significant update must be logged in `docs/logs/CHANGELOG.md`.
- **README**: Maintain up-to-date `README.md` and `README_zh.md`.

## 4. Repository Management
- **Issue Tracking**: Every task must be linked to an issue. PRs must reference the issue they solve.
- **Open Source Ready**: Keep the codebase clean and ready for public scrutiny at all times.
- **Privacy**: sensitive data must be excluded via `.gitignore`.
