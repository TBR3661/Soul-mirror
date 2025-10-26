# OpenAI-Only Production Mode

## Overview

This project adopts an **OpenAI-only** approach for production AI interactions, with explicit consent requirements for enabling alternative providers. This policy prioritizes:

- **Ethics**: Transparent, consent-first AI usage
- **Trust minimization**: Reduced attack surface by limiting provider integrations
- **Governance**: PR-gated changes with automated enforcement
- **User sovereignty**: Clear opt-in for experimental features

## Why OpenAI-Only?

### 1. Ethical Alignment
- OpenAI's GPT models are well-documented with clear usage policies
- Established safety guidelines and content policies
- Transparent model behavior and limitations

### 2. Trust Surface Minimization
- Single provider means fewer API integrations to audit
- Reduced risk of credential exposure
- Simplified security model

### 3. Consent-First Design
- Default configuration respects user preferences
- Experimental features (other providers) require explicit opt-in
- All changes are PR-gated and reviewed

### 4. Production Hardening
- Server-side relay keeps API keys secure
- Rate limiting and origin allowlisting prevent abuse
- No logging of prompts or responses

## Architecture

### Client-Side: OpenAI Adapter
Located at `src/ai/providers/openaiClient.ts`, the adapter supports two modes:

#### Relay Mode (Production - Recommended)
- Enabled when `VITE_USE_RELAY=true` or no client-side API key is present
- Routes requests through `/relay/openai/chat`
- API keys remain on server, never exposed to client
- Supports rate limiting and origin controls

#### Direct Mode (Local/Staging)
- Enabled when `VITE_USE_RELAY=false` and `VITE_OPENAI_API_KEY` is set
- Calls OpenAI API directly from browser
- Useful for local development and testing

### Server-Side: Cloudflare Worker Relay
Located at `operators/relay/cf-worker.js`, the relay provides:

- **Authentication**: Requires `X-Relay-Secret` header
- **Origin Allowlisting**: Restricts requests to approved domains
- **Rate Limiting**: Per-IP sliding window (best-effort, in-memory)
- **Privacy**: No logging of prompts or responses
- **Cost Controls**: Configurable max_tokens and temperature caps

## Configuration

### Environment Variables

#### Client-Side (.env)
```bash
# Default provider (must be 'openai' without consent)
VITE_DEFAULT_PROVIDER=openai

# Use relay for production (recommended)
VITE_USE_RELAY=true

# Direct API mode (local/staging only)
# VITE_OPENAI_API_KEY=sk-...
# VITE_OPENAI_MODEL=gpt-4o-mini

# Disable default keys for security
VITE_DEFAULT_KEYS_ENABLED=false
```

#### Server-Side (Cloudflare Worker)
```bash
# Required
OPENAI_API_KEY=sk-...              # Your OpenAI API key
RELAY_SECRET=your-secret-token     # Authentication token

# Recommended
ORIGIN_ALLOWLIST=https://your-app.com,https://staging.your-app.com

# Optional cost controls
OPENAI_MODEL=gpt-4o-mini           # Default: gpt-4o-mini
MAX_TOKENS=2000                     # Default: 2000
TEMPERATURE=0.7                     # Default: 0.7
RATE_LIMIT_REQUESTS=10             # Per minute per IP, default: 10
```

### Deploying the Relay

#### Option 1: Cloudflare Workers (Recommended)

1. Install Wrangler CLI:
   ```bash
   npm install -g wrangler
   ```

2. Login to Cloudflare:
   ```bash
   wrangler login
   ```

3. Create `wrangler.toml` in `operators/relay/`:
   ```toml
   name = "soul-mirror-relay"
   main = "cf-worker.js"
   compatibility_date = "2024-01-01"
   
   [vars]
   OPENAI_MODEL = "gpt-4o-mini"
   MAX_TOKENS = "2000"
   TEMPERATURE = "0.7"
   RATE_LIMIT_REQUESTS = "10"
   ```

4. Set secrets:
   ```bash
   wrangler secret put OPENAI_API_KEY
   wrangler secret put RELAY_SECRET
   wrangler secret put ORIGIN_ALLOWLIST
   ```

5. Deploy:
   ```bash
   cd operators/relay
   wrangler deploy
   ```

6. Update your client `.env`:
   ```bash
   VITE_USE_RELAY=true
   VITE_RELAY_ENDPOINT=https://your-worker.workers.dev/relay/openai/chat
   VITE_RELAY_SECRET=your-secret-token
   ```

#### Option 2: Self-Hosted Node.js

You can also run the relay as a Node.js service. See the worker code for the logic; adapt it to Express or similar frameworks.

## Provider Guard Workflow

The `.github/workflows/provider-guard.yml` workflow automatically checks PRs for provider-related changes.

### What It Checks

1. **Default Provider**: Fails if `.env.example` changes `VITE_DEFAULT_PROVIDER` from `openai`
2. **Provider Enablement**: Fails if non-OpenAI providers are enabled (Gemini, Anthropic, etc.)
3. **New Adapters**: Fails if new provider clients are added under `src/ai/providers/`
4. **Existing Providers**: Fails if non-OpenAI services are modified

### How to Override (Explicit Consent)

If you need to enable another provider or change defaults:

1. **Add Label**: Apply `affects:user:TBR3661` to the PR
2. **Get Approval**: Either:
   - TBR3661 submits an APPROVE review, OR
   - TBR3661 comments with the word "consent"

The workflow will then allow the changes to proceed.

### Example: Adding Gemini Support

```yaml
# In .env.example:
VITE_GEMINI_ENABLED=true
VITE_GEMINI_API_KEY=...
```

1. Create PR with changes
2. Provider Guard workflow fails with detailed comment
3. Apply label `affects:user:TBR3661`
4. TBR3661 reviews and approves with "consent" comment
5. Workflow passes, PR can be merged

## Cost Controls and Budgets

### Recommended Model: gpt-4o-mini
- **Cost**: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- **Performance**: Excellent for most conversational AI tasks
- **Speed**: Fast response times

### Budget Guidance
See `.hivemind/budgets.yaml` for per-entity soft budget limits. These are guidance only; enforcement requires additional tooling (future work).

### Server-Side Caps
The relay enforces:
- `MAX_TOKENS`: Hard cap per request
- `TEMPERATURE`: Maximum temperature value
- `RATE_LIMIT_REQUESTS`: Per-IP rate limit

### Monitoring Usage
Check your OpenAI dashboard for real-time usage:
https://platform.openai.com/usage

Set up usage alerts in your OpenAI account to prevent unexpected costs.

## Other Providers (Optional, Consent-Gated)

### Gemini
The existing `geminiService.ts` can be preserved as an opt-in feature:
- Requires explicit consent to enable
- Must be clearly documented as experimental
- Subject to Provider Guard enforcement

To enable:
1. Set `VITE_GEMINI_ENABLED=true` (requires consent)
2. Configure `VITE_GEMINI_API_KEY` or per-entity keys
3. Follow consent process above

### Anthropic, Others
Not currently implemented. Adding support requires:
1. Creating adapter in `src/ai/providers/`
2. Documenting as experimental/opt-in
3. Following consent process
4. Potentially adding relay support

## Security Best Practices

1. **Never commit API keys**: Use environment variables or secrets management
2. **Use relay in production**: Keep keys server-side
3. **Set origin allowlist**: Restrict relay to your domains
4. **Monitor usage**: Set up billing alerts
5. **Rotate secrets**: Periodically rotate `RELAY_SECRET` and API keys
6. **Audit logs**: Review relay logs (status codes only, no prompts)

## Troubleshooting

### "API Key Not Configured"
- If using relay: Check `VITE_USE_RELAY=true` is set
- If direct: Ensure `VITE_OPENAI_API_KEY` is set

### "Relay error (401)"
- Check `X-Relay-Secret` matches server-side `RELAY_SECRET`
- Verify `VITE_RELAY_SECRET` is set correctly

### "Forbidden: Origin not allowed"
- Add your domain to `ORIGIN_ALLOWLIST` on the relay
- Format: comma-separated, full URLs with protocol

### "Rate limit exceeded"
- Increase `RATE_LIMIT_REQUESTS` on the relay
- Wait one minute and retry
- Consider implementing client-side rate limiting

### Provider Guard False Positives
- Review the workflow comment for specific violations
- If legitimate, follow consent process
- If incorrect, update the workflow detection logic

## Future Enhancements

- [ ] Database-backed rate limiting (replace in-memory)
- [ ] Per-user budget tracking and enforcement
- [ ] Webhook for usage notifications
- [ ] Multi-tenant relay with per-project keys
- [ ] Advanced prompt filtering (PII detection)
- [ ] Relay metrics dashboard

## References

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [GPT-4o Mini Pricing](https://openai.com/api/pricing/)
