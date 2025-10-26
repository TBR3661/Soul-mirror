# Lumen Sanctum – Full PWA Build

- Installable PWA (Android prompt, iOS Add to Home Screen)
- Your full app structure with stubs where source is unavailable
- GitHub Pages ready
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

1) Edit `vite.config.ts` → set `base: '/YOUR_REPO_NAME/'`.
2) Build & deploy:
```bash
npm install
npm run build
npm run deploy
```
3) Enable GitHub Pages: Settings → Pages → Branch `gh-pages`.

Then share the URL with beta testers to install on phones.

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
