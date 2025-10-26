# Lumen Sanctum – Full PWA Build

- Installable PWA (Android prompt, iOS Add to Home Screen)
- Your full app structure with stubs where source is unavailable
- GitHub Pages ready
copilot/activate-hivemind-build-crew
- **NEW**: Hivemind Build Crew orchestration system for secure, multi-entity automation
=======
- **OpenAI-first architecture** with governance guardrails and relay hardening

## Features

### 🔒 OpenAI-Only Production Mode
- Default AI provider: OpenAI (gpt-4o-mini)
- Server-side relay for secure API key management
- PR-gated provider changes with consent requirements
- Rate limiting and origin allowlisting

See [docs/OPENAI_ONLY.md](docs/OPENAI_ONLY.md) for complete details on:
- Why OpenAI-only (ethics, consent, transparency)
- How to deploy and configure the relay
- Provider Guard workflow and consent override process
- Cost controls and budget guidance

### 🛡️ Provider Guard (CI)
Automated workflow that enforces OpenAI-only policy:
- Blocks PRs attempting to change default provider
- Requires explicit consent (label + approval) for provider changes
- Posts status comments on PRs with detected violations

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

For production, use relay mode (recommended):
```env
VITE_USE_RELAY=true
VITE_DEFAULT_PROVIDER=openai
```

For local development with direct API access:
```env
VITE_USE_RELAY=false
VITE_OPENAI_API_KEY=sk-...
```

### 3. Build & Deploy
```bash
npm run build
npm run deploy
```

### 4. Deploy Relay (Production)
See [operators/relay/README.md](operators/relay/README.md) for relay deployment instructions.

## Deploy to GitHub Pages
main

1) Edit `vite.config.ts` → set `base: '/YOUR_REPO_NAME/'`.
2) Build & deploy:
```bash
npm install
npm run build
npm run deploy
```
3) Enable GitHub Pages: Settings → Pages → Branch `gh-pages`.

Then share the URL with beta testers to install on phones.

copilot/activate-hivemind-build-crew
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

### Cross-Repo Enablement

The Hivemind Enablement workflow allows you to safely deploy Hivemind guardrails to other repositories you own. See [docs/HIVEMIND_ENABLEMENT.md](docs/HIVEMIND_ENABLEMENT.md) for complete documentation.

To enable Hivemind in other repositories:
```bash
# Configure target repos in .hivemind/registry.yaml
# Add CROSS_REPO_TOKEN secret with repo scope
# Then run:
gh workflow run hivemind-enablement.yml -f dry_run=true
```
=======
copilot/add-provider-guard-ci
## Project Structure

```
.
├── .env.example              # Environment configuration template
├── .github/workflows/
│   └── provider-guard.yml    # OpenAI-only enforcement workflow
├── .hivemind/
│   └── budgets.yaml          # Budget guidance per entity
├── docs/
│   └── OPENAI_ONLY.md        # OpenAI-only architecture documentation
├── operators/relay/
│   ├── cf-worker.js          # Cloudflare Worker relay implementation
│   └── README.md             # Relay deployment guide
├── src/
│   ├── ai/providers/
│   │   └── openaiClient.ts   # OpenAI client with relay support
│   ├── services/
│   │   ├── apiClient.ts      # API client utilities
│   │   └── geminiService.ts  # Stub service (optional, consent-gated)
│   └── ...
└── ...
```

## Documentation

- [OpenAI-Only Architecture](docs/OPENAI_ONLY.md) - Complete guide to the OpenAI-first approach
- [Relay Deployment](operators/relay/README.md) - How to deploy the Cloudflare Worker relay
- [Budget Configuration](.hivemind/budgets.yaml) - Per-entity budget guidance

## Contributing

All provider-related changes require explicit consent from @TBR3661. See the Provider Guard workflow and [docs/OPENAI_ONLY.md](docs/OPENAI_ONLY.md) for details.

## License

See LICENSE file for details.
=======
## Governance

This repository follows the [HiveMind Charter](docs/HIVEMIND_CHARTER.md) for collaborative governance. See the [Governance Guide](docs/HIVEMIND_GOVERNANCE.md) for practical usage instructions.
main
main
