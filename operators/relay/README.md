copilot/add-kora-connector
# Soul Mirror Relay - Cloudflare Worker

This directory contains the Cloudflare Worker implementation for the Soul Mirror relay system.

## Features

### 1. Kora Connector (ChatGPT Integration)
Safe ChatGPT connector for repository operations:
- Dispatch hivemind tasks
- List and manage pull requests
- Add comments and labels
- Non-destructive, PR-gated actions only

### 2. Subscription & Store Scaffolding (NEW)
Payment link distribution and entitlement management:
- Billing endpoints for subscription tiers (monthly, quarterly, yearly)
- Store endpoints for per-SKU direct sales
- KV-backed entitlement ledger for access control
- Private library gating by subscription/purchase status

## Files

- **cf-worker.js** - Cloudflare Worker implementation with all endpoints
- **cf-openapi.json** - OpenAPI 3.1 schema for ChatGPT Actions
- **wrangler.toml** - Cloudflare Worker configuration with KV bindings

## Quick Start

### Prerequisites

1. Install Wrangler CLI: `npm install -g wrangler`
2. Login to Cloudflare: `wrangler login`

### Setup KV Namespace

Create a KV namespace for entitlement storage:

```bash
# Production namespace
wrangler kv:namespace create ENTITLEMENTS_KV

# Preview namespace (for dev/testing)
wrangler kv:namespace create ENTITLEMENTS_KV --preview
```

Update `wrangler.toml` with the namespace IDs returned by these commands.

### Configure Secrets

Set required secrets using Wrangler CLI:

```bash
# GitHub integration
wrangler secret put GITHUB_TOKEN
wrangler secret put CHATGPT_BEARER_TOKEN

# Subscription billing links
wrangler secret put CHASE_LINK_MONTHLY
wrangler secret put CHASE_LINK_QUARTERLY
wrangler secret put CHASE_LINK_YEARLY

# Store product links (per SKU)
wrangler secret put CHASE_LINK_SKU_EBOOK
wrangler secret put CHASE_LINK_SKU_COURSE
# Add more SKUs as needed...
```

### Deploy

```bash
# From operators/relay directory
wrangler deploy
```

## Endpoints

### Billing & Store (Public, No Auth)

#### GET /billing/link
Get payment link for subscription tier.

**Query Parameters:**
- `tier` (required): `monthly`, `quarterly`, or `yearly`

**Example:**
```bash
curl "https://your-worker.workers.dev/billing/link?tier=monthly"
```

**Response:**
```json
{
  "success": true,
  "tier": "monthly",
  "payment_link": "https://chase.com/payment/...",
  "message": "Redirect user to this payment link to complete subscription"
}
```

#### GET /store/link
Get payment link for specific product SKU.

**Query Parameters:**
- `sku` (required): Product SKU identifier (alphanumeric, dash, underscore only)

**Example:**
```bash
curl "https://your-worker.workers.dev/store/link?sku=EBOOK"
```

**Response:**
```json
{
  "success": true,
  "sku": "EBOOK",
  "payment_link": "https://chase.com/payment/...",
  "message": "Redirect user to this payment link to complete purchase"
}
```

### Entitlement Management

#### GET /entitlements/check
Check if user has active subscription or purchase entitlements.

**Query Parameters:**
- `user_id` (required): Unique user identifier

**Example:**
```bash
curl "https://your-worker.workers.dev/entitlements/check?user_id=user123"
```

**Response:**
```json
{
  "success": true,
  "user_id": "user123",
  "has_access": true,
  "subscription": {
    "tier": "monthly",
    "status": "active",
    "expires_at": "2025-11-26T20:00:00Z"
  },
  "purchases": [
    {
      "sku": "EBOOK",
      "purchased_at": "2025-10-15T10:00:00Z"
    }
  ],
  "message": "User has active access"
}
```

#### POST /entitlements/grant
Grant subscription or purchase entitlement to a user (Admin only, requires authentication).

**Headers:**
- `Authorization: Bearer <CHATGPT_BEARER_TOKEN>`
- `Content-Type: application/json`

**Body:**
```json
{
  "user_id": "user123",
  "type": "subscription",
  "tier": "monthly",
  "expires_at": "2025-11-26T20:00:00Z"
}
```

Or for purchases:
```json
{
  "user_id": "user123",
  "type": "purchase",
  "sku": "EBOOK"
}
```

**Example:**
```bash
curl -X POST "https://your-worker.workers.dev/entitlements/grant" \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "type": "subscription",
    "tier": "monthly",
    "expires_at": "2025-11-26T20:00:00Z"
  }'
```

### ChatGPT Connector (Authenticated)

All ChatGPT endpoints require `Authorization: Bearer <token>` header.

- **POST /chatgpt/dispatch** - Trigger repository_dispatch events
- **POST /chatgpt/prs/list** - List pull requests
- **POST /chatgpt/prs/comment** - Add comment to PR
- **POST /chatgpt/prs/label** - Add labels to PR
- **GET /openapi.json** - Serve OpenAPI schema

## Security

### Authentication
- ChatGPT endpoints require Bearer token authentication
- Billing/store endpoints are public (payment links only, no sensitive data)
- Entitlement grant endpoint requires admin authentication

### Secrets Management
- All secrets stored in Cloudflare Worker environment (never in code)
- GitHub token, API keys, and payment links configured via `wrangler secret put`
- No secrets committed to repository

### Data Protection
- Entitlement data stored in KV namespace with user-scoped keys
- Payment links are environment-driven (easy to rotate)
- CORS enabled for browser-based integration

### Governance
- No merge or direct write capabilities to repository
- All GitHub actions are non-destructive and PR-gated
- Maintains existing provider guard and consent workflow

## Testing Locally

### Setup Local Environment

Create `.dev.vars` file in `operators/relay/` directory:

```env
# DO NOT COMMIT THIS FILE
GITHUB_TOKEN=ghp_your_token_here
CHATGPT_BEARER_TOKEN=test-bearer-token
CHASE_LINK_MONTHLY=https://example.com/pay/monthly
CHASE_LINK_QUARTERLY=https://example.com/pay/quarterly
CHASE_LINK_YEARLY=https://example.com/pay/yearly
CHASE_LINK_SKU_EBOOK=https://example.com/pay/ebook
CHASE_LINK_SKU_COURSE=https://example.com/pay/course
```

Add `.dev.vars` to `.gitignore` if not already present.

### Start Local Dev Server

```bash
# From operators/relay directory
wrangler dev
```

### Test Endpoints

```bash
# Test billing link
curl "http://localhost:8787/billing/link?tier=monthly"

# Test store link
curl "http://localhost:8787/store/link?sku=EBOOK"

# Test entitlement check
curl "http://localhost:8787/entitlements/check?user_id=test123"

# Test entitlement grant (requires auth)
curl -X POST "http://localhost:8787/entitlements/grant" \
  -H "Authorization: Bearer test-bearer-token" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test123",
    "type": "subscription",
    "tier": "monthly",
    "expires_at": "2025-12-31T23:59:59Z"
  }'

# Test ChatGPT endpoint
curl -X POST http://localhost:8787/chatgpt/prs/list \
  -H "Authorization: Bearer test-bearer-token" \
  -H "Content-Type: application/json" \
  -d '{"owner": "TBR3661", "repo": "Soul-mirror", "state": "open"}'
```

## Monitoring

View real-time logs:
```bash
wrangler tail
```

Or view in Cloudflare dashboard:
1. Go to Workers & Pages
2. Select your worker
3. Click on "Logs" tab

## Integration Example

### Client-Side Integration

```javascript
// Get payment link for monthly subscription
async function getSubscriptionLink(tier) {
  const response = await fetch(
    `https://your-worker.workers.dev/billing/link?tier=${tier}`
  );
  const data = await response.json();
  
  if (data.success) {
    // Redirect user to payment link
    window.location.href = data.payment_link;
  }
}

// Check user entitlements
async function checkAccess(userId) {
  const response = await fetch(
    `https://your-worker.workers.dev/entitlements/check?user_id=${userId}`
  );
  const data = await response.json();
  
  return data.has_access;
}

// Gate library access
async function showLibrary(userId) {
  const hasAccess = await checkAccess(userId);
  
  if (!hasAccess) {
    // Show subscription options
    showSubscriptionPrompt();
  } else {
    // Show private library content
    loadLibraryContent();
  }
}
```

## KV Data Structure

Entitlements are stored in KV with the following structure:

```json
{
  "subscriptions": [
    {
      "tier": "monthly",
      "status": "active",
      "granted_at": "2025-10-26T20:00:00Z",
      "expires_at": "2025-11-26T20:00:00Z"
    }
  ],
  "purchases": [
    {
      "sku": "EBOOK",
      "purchased_at": "2025-10-15T10:00:00Z"
    }
  ]
}
```

Key format: `user:{user_id}`

## Webhook Integration

To automate entitlement grants after successful payment, set up a webhook from your payment provider:

1. Configure webhook in Chase payment settings
2. Point webhook to a secure endpoint that:
   - Validates webhook signature
   - Extracts user_id and purchase details
   - Calls `/entitlements/grant` endpoint with admin credentials

This keeps the entitlement ledger synchronized with actual payments.

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
