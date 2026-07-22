# Gitleaks pull-request permission repair

## Problem

PR #2 secret scan failed before scanning because `gitleaks/gitleaks-action@v2` received HTTP `403 Resource not accessible by integration` while listing PR commits.

## Change

- Added workflow-level `pull-requests: read`.
- Kept `contents: read`; no write permission added.

## Verification

- Workflow YAML parsed locally.
- Push triggers a fresh GitHub Actions run; final result recorded in PR checks.

## Safety

- No application runtime, Firebase production, Rules, Hosting, Functions, database, or secret value changed.