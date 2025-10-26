copilot/add-kora-connector
# Kora Connector - Cloudflare Worker Relay

This directory contains the Cloudflare Worker implementation for the Kora ChatGPT connector.

## Files

- **cf-worker.js** - Cloudflare Worker implementation with API endpoints
- **cf-openapi.json** - OpenAPI 3.1 schema for ChatGPT Actions

## Quick Start

See the comprehensive setup guide at [docs/CHATGPT_CONNECTOR.md](../../docs/CHATGPT_CONNECTOR.md)

## Deployment

1. Install Wrangler CLI: `npm install -g wrangler`
2. Login to Cloudflare: `wrangler login`
3. Set secrets:
   ```bash
   wrangler secret put GITHUB_TOKEN
   wrangler secret put CHATGPT_BEARER_TOKEN
   ```
4. Deploy: `wrangler deploy`

## Endpoints

All endpoints require `Authorization: Bearer <token>` header.

- **POST /chatgpt/dispatch** - Trigger repository_dispatch events
- **POST /chatgpt/prs/list** - List pull requests
- **POST /chatgpt/prs/comment** - Add comment to PR
- **POST /chatgpt/prs/label** - Add labels to PR
- **GET /openapi.json** - Serve OpenAPI schema

## Security

- All endpoints require Bearer token authentication
- GitHub token stored securely in Cloudflare environment
- CORS enabled for ChatGPT integration
- No merge or direct write capabilities
- All actions are non-destructive and PR-gated

## Testing Locally

```bash
# Install dependencies
npm install -g wrangler

# Start local dev server
wrangler dev

# Test endpoint
curl -X POST http://localhost:8787/chatgpt/prs/list \
  -H "Authorization: Bearer your-test-token" \
  -H "Content-Type: application/json" \
  -d '{"owner": "TBR3661", "repo": "Soul-mirror", "state": "open"}'
```

## Monitoring

View real-time logs:
```bash
wrangler tail
```

## License

Part of the Soul-Mirror project. All actions maintain existing governance and safety constraints.
=======
copilot/activate-hivemind-build-crew
# Operator Relay

This directory contains reference implementations for secure relay patterns that enable external triggers to interact with the Hivemind orchestration system without exposing GitHub tokens.

## Contents

- `cf-worker.js` - Cloudflare Worker relay implementation

## Overview

The relay pattern solves the problem of triggering GitHub Actions workflows from external systems (devices, assistants, IoT, etc.) without exposing sensitive GitHub tokens.

### Architecture

```
[Device/Assistant] 
    ↓ HTTPS + RELAY_SECRET
[Cloudflare Worker] 
    ↓ GitHub API + GITHUB_TOKEN
[Hivemind Foreman Workflow]
    ↓ repository_dispatch event
[Task Execution & PR Creation]
```

## Security Benefits

1. **Token Isolation**: GitHub tokens never leave the Worker environment
2. **Authentication**: Relay requires its own secret token
3. **Audit Trail**: All triggers logged in Worker
4. **Rate Limiting**: Can be applied at Worker level
5. **Access Control**: Optional IP whitelisting

## When to Use

- Triggering workflows from mobile devices
- IoT device integrations
- Voice assistant commands
- External automation systems
- Third-party service webhooks

## Alternatives

If you don't need external triggers, you can use:
- Direct `workflow_dispatch` (manual GitHub UI trigger)
- GitHub CLI with local token: `gh workflow run hivemind-foreman.yml`
- GitHub API with server-side token storage

## Deployment

See [cf-worker.js](cf-worker.js) for complete implementation and deployment instructions.

## Testing

Always test with dry_run mode first:

```bash
curl -X POST https://your-worker.workers.dev/trigger-hive \
  -H "Authorization: Bearer YOUR_RELAY_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"action": "execute", "dry_run": true}'
```

## Future Enhancements

- Multi-repository routing
- Rate limiting per client
- Request queueing
- Webhook transformations
- Event filtering and routing
=======
# OpenAI Relay - Cloudflare Worker

This directory contains the Cloudflare Worker that acts as a secure relay for OpenAI API requests.

## What It Does

- Proxies OpenAI chat completion requests
- Keeps API keys secure on the server
- Enforces rate limiting (per-IP, in-memory)
- Validates origins against allowlist
- Does NOT log prompts or responses (only status codes)

## Quick Start

### 1. Install Wrangler
```bash
npm install -g wrangler
```

### 2. Login
```bash
wrangler login
```

### 3. Create wrangler.toml
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

### 4. Set Secrets
```bash
wrangler secret put OPENAI_API_KEY
# Enter your OpenAI API key (sk-...)

wrangler secret put RELAY_SECRET
# Enter a random secret token (use: openssl rand -hex 32)

wrangler secret put ORIGIN_ALLOWLIST
# Enter comma-separated origins: https://your-app.com,https://staging.your-app.com
```

### 5. Deploy
```bash
wrangler deploy
```

### 6. Test
```bash
curl -X POST https://your-worker.workers.dev/relay/openai/chat \
  -H "Content-Type: application/json" \
  -H "X-Relay-Secret: your-secret-token" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

## Environment Variables

### Required
- `OPENAI_API_KEY`: Your OpenAI API key
- `RELAY_SECRET`: Secret token for authentication

### Optional
- `ORIGIN_ALLOWLIST`: Comma-separated allowed origins (default: all allowed)
- `OPENAI_MODEL`: Default model (default: gpt-4o-mini)
- `MAX_TOKENS`: Max tokens per request (default: 2000)
- `TEMPERATURE`: Default temperature (default: 0.7)
- `RATE_LIMIT_REQUESTS`: Requests per minute per IP (default: 10)

## Endpoints

### POST /relay/openai/chat
Proxy to OpenAI chat completions API.

**Headers:**
- `Content-Type: application/json`
- `X-Relay-Secret: <your-secret>` (required)
- `Origin: <your-domain>` (checked against allowlist)

**Body:**
```json
{
  "model": "gpt-4o-mini",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ],
  "temperature": 0.7,
  "max_tokens": 500
}
```

**Response:**
Standard OpenAI API response format.

### GET /relay/health
Health check endpoint.

**Response:** `200 OK`

## Security Features

1. **Secret Authentication**: All requests must include valid `X-Relay-Secret`
2. **Origin Validation**: Checks `Origin` header against `ORIGIN_ALLOWLIST`
3. **Rate Limiting**: Per-IP sliding window (10 req/min default)
4. **No Logging**: Prompts and responses are never logged
5. **Token Caps**: Server-enforced `max_tokens` limit

## Rate Limiting

The relay implements a simple in-memory rate limiter:
- Tracks requests per IP per minute
- Default: 10 requests per minute
- Resets on worker restart
- **Note**: For production at scale, consider database-backed rate limiting

## Monitoring

The relay logs only:
- HTTP status codes
- Errors (without prompt/response content)
- Rate limit events

To monitor usage:
1. Check Cloudflare Workers dashboard
2. Review OpenAI usage dashboard
3. Set up billing alerts in OpenAI account

## Troubleshooting

### 401 Unauthorized
- Check `X-Relay-Secret` header matches deployed secret
- Verify secret was set with `wrangler secret put RELAY_SECRET`

### 403 Forbidden
- Add your origin to `ORIGIN_ALLOWLIST`
- Format: `https://example.com` (no trailing slash)

### 429 Rate Limit
- Wait one minute and retry
- Increase `RATE_LIMIT_REQUESTS` if needed
- Consider implementing client-side backoff

### 500 Internal Server Error
- Check Cloudflare Workers logs
- Verify `OPENAI_API_KEY` is valid
- Check OpenAI API status

## Local Development

For local testing, you can use Wrangler's dev mode:

```bash
wrangler dev
```

This runs the worker locally at `http://localhost:8787`.

To set secrets for local dev, create `.dev.vars`:
```
OPENAI_API_KEY=sk-...
RELAY_SECRET=test-secret
ORIGIN_ALLOWLIST=http://localhost:5173
```

**Never commit `.dev.vars` to git!**

## Production Checklist

- [ ] Set strong `RELAY_SECRET` (use `openssl rand -hex 32`)
- [ ] Configure `ORIGIN_ALLOWLIST` with production domains only
- [ ] Set appropriate `RATE_LIMIT_REQUESTS` for your traffic
- [ ] Enable Cloudflare Analytics
- [ ] Set up OpenAI billing alerts
- [ ] Document relay URL in team docs
- [ ] Test failover (what happens if relay is down?)

## Cost Considerations

- Cloudflare Workers: Free tier includes 100,000 requests/day
- OpenAI: Pay per token usage (see pricing at https://openai.com/api/pricing/)
- Recommended: Start with `gpt-4o-mini` for cost efficiency

## Future Improvements

- [ ] Database-backed rate limiting (Redis/KV)
- [ ] Per-user/per-token rate limits
- [ ] Request queuing for burst traffic
- [ ] Advanced analytics (token usage tracking)
- [ ] Multi-model support with cost tracking
- [ ] Webhook notifications for budget alerts

## References

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [OpenAI API Docs](https://platform.openai.com/docs)
main
main
