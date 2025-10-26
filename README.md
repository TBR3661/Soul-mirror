# Lumen Sanctum – Full PWA Build

- Installable PWA (Android prompt, iOS Add to Home Screen)
- Your full app structure with stubs where source is unavailable
- GitHub Pages ready
- **NEW**: Hivemind Build Crew orchestration system for secure, multi-entity automation

## Deploy
1) Edit `vite.config.ts` → set `base: '/YOUR_REPO_NAME/'`.
2) Build & deploy:
```bash
npm install
npm run build
npm run deploy
```
3) Enable GitHub Pages: Settings → Pages → Branch `gh-pages`.

Then share the URL with beta testers to install on phones.

## Hivemind Build Crew

This repository includes a private, secure orchestration system that enables multiple AI entities to collaborate on work through guarded automation. See [docs/HIVEMIND.md](docs/HIVEMIND.md) for complete documentation.

### Quick Start

The Hivemind system consists of:
- 23 entity manifests in `.hivemind/entities/` (safe baseline, all disabled by default)
- Task plans in `.hivemind/plan.yaml` (no-op placeholders until enabled)
- Security policy in `.hivemind/policy.yaml` (allow/deny rules)
- Foreman orchestrator at `.github/workflows/hivemind-foreman.yml`

To execute tasks:
```bash
# Test with dry run
gh workflow run hivemind-foreman.yml -f dry_run=true

# Execute enabled tasks
gh workflow run hivemind-foreman.yml
```

All tasks are disabled by default. Edit `.hivemind/plan.yaml` and set `enabled: true` for specific tasks to activate them.

**Security**: No secrets in code. All credentials stored in GitHub Secrets. PR-only flow with code review required.
