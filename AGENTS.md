# Repository Guidelines

## Project Structure & Module Organization
Neuroguard is in bootstrap mode; add runtime packages under `src/neuroguard/` (e.g., `pipelines/`, `monitoring/`, `shared/`). Mirror each module with a sibling test module inside `tests/`. Keep CLI utilities in `scripts/` and reusable assets in `assets/` or `config/`. Use `docs/` for architecture notes and migrate exploratory notebooks from `research/` into narrative docs once stabilized.

## Build, Test, and Development Commands
Create a fresh environment with `python -m venv .venv` and activate it before installing dependencies. Use `pip install -r requirements.txt` (commit updates alongside feature work) and pin versions thoughtfully. Run `make format` to apply `black` and `ruff`, `make typecheck` for `mypy`, and `make test` (proxy for `pytest -q`). Execute `python -m neuroguard.cli --config config/dev.yaml` to exercise the service locally.

## Coding Style & Naming Conventions
Adopt `black`'s 88-character line length and rely on `ruff` for linting; resolve warnings rather than silencing them. Prefer fully-typed functions with descriptive snake_case names, PascalCase classes, and hyphenated CLI entry points. Keep modules focused, document public APIs with Google-style docstrings, and explain any defensive heuristics inline.

## Testing Guidelines
Write tests with `pytest`; name files `test_<module>.py` and keep shared fixtures in `tests/conftest.py`. Include property-based tests for stochastic detectors where applicable. Maintain >90% coverage on `src/neuroguard/` (`pytest --cov=neuroguard --cov-report=term-missing`) and store anonymized sample payloads under `tests/data/`. Tag lengthy integration runs with `@pytest.mark.slow` so CI can gate them.

## Commit & Pull Request Guidelines
Follow Conventional Commits (e.g., `feat: streaming classifier`, `fix: clamp threshold overflow`). Bundle related changes only, document context, risks, and verification steps in the PR body, and link issues using `Closes #<id>`. Ensure CI is green, request review from a domain owner, and add screenshots or logs if you touch runtime behavior.

## Security & Configuration Tips
Never commit secrets; keep `.env` local and provide keys in `.env.example`. Harden default configs (`config/secure.yaml`) and document exposed ports or auth scopes in `docs/security.md`. Before release, run `pip-audit` and justify any remaining advisories in the PR thread.
