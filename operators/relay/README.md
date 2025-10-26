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
