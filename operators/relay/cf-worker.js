# Cloudflare Worker Relay for Hivemind

This is a reference implementation for a Cloudflare Worker that acts as a secure relay between external triggers (devices, assistants) and the Hivemind orchestration system.

## Purpose

The relay enables triggering `hive-execute` events without exposing GitHub tokens to client devices or external systems. The token is stored securely in the Cloudflare Worker environment.

## Setup

1. Create a Cloudflare Worker
2. Add GitHub Personal Access Token to Worker Secrets:
   - Go to Worker Settings > Variables and Secrets
   - Add `GITHUB_TOKEN` with repo dispatch permissions
   - Add `RELAY_SECRET` for authenticating requests to the relay

3. Deploy the worker code below

## Worker Implementation

```javascript
// cf-worker.js - Cloudflare Worker for Hivemind Relay

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Only allow POST requests
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }
  
  // Verify relay secret
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  const token = authHeader.substring(7)
  if (token !== RELAY_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  // Parse request body
  let body
  try {
    body = await request.json()
  } catch (e) {
    return new Response('Invalid JSON', { status: 400 })
  }
  
  // Validate payload
  if (body.action !== 'execute') {
    return new Response('Invalid action', { status: 400 })
  }
  
  const planFile = body.plan_file || '.hivemind/plan.yaml'
  const dryRun = body.dry_run || false
  
  // Dispatch to GitHub
  try {
    const githubResponse = await fetch(
      'https://api.github.com/repos/TBR3661/Soul-mirror/dispatches',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Hivemind-Relay/1.0'
        },
        body: JSON.stringify({
          event_type: 'hive-execute',
          client_payload: {
            plan_file: planFile,
            dry_run: dryRun,
            triggered_by: 'relay',
            timestamp: new Date().toISOString()
          }
        })
      }
    )
    
    if (githubResponse.status === 204) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Hivemind execution triggered',
        plan_file: planFile,
        dry_run: dryRun
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    } else {
      const errorText = await githubResponse.text()
      return new Response(JSON.stringify({
        success: false,
        message: 'GitHub API error',
        error: errorText
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  } catch (e) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Request failed',
      error: e.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
```

## Usage

### From Device/Assistant

```javascript
// Trigger Hivemind execution via relay
const response = await fetch('https://your-worker.workers.dev/trigger-hive', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_RELAY_SECRET',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'execute',
    plan_file: '.hivemind/plan.yaml',
    dry_run: false
  })
})

const result = await response.json()
console.log(result)
```

### From curl

```bash
curl -X POST https://your-worker.workers.dev/trigger-hive \
  -H "Authorization: Bearer YOUR_RELAY_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "execute",
    "plan_file": ".hivemind/plan.yaml",
    "dry_run": false
  }'
```

## Security

- **GITHUB_TOKEN**: Stored in Cloudflare Worker secrets, never exposed
- **RELAY_SECRET**: Authentication token for relay access
- **HTTPS only**: All communication encrypted
- **Rate limiting**: Consider adding rate limits to prevent abuse
- **IP whitelist**: Optional - restrict to known IPs

## Environment Variables

Set these in your Cloudflare Worker:

- `GITHUB_TOKEN`: GitHub Personal Access Token with `repo` scope
- `RELAY_SECRET`: Secret token for authenticating relay requests

## Multi-Repository Support

To support multiple repositories, extend the worker:

```javascript
const REPO_MAP = {
  'soul-mirror': 'TBR3661/Soul-mirror',
  'other-repo': 'TBR3661/Other-Repo'
}

const repo = REPO_MAP[body.repository] || 'TBR3661/Soul-mirror'
const apiUrl = `https://api.github.com/repos/${repo}/dispatches`
```

## Monitoring

Add logging to track usage:

```javascript
console.log(`Hivemind trigger: ${body.plan_file}, dry_run: ${body.dry_run}`)
```

View logs in Cloudflare Dashboard > Workers > Logs

## Testing

Test the relay before production use:

```bash
# Dry run test
curl -X POST https://your-worker.workers.dev/trigger-hive \
  -H "Authorization: Bearer YOUR_RELAY_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"action": "execute", "dry_run": true}'
```

---

**Note**: This is a reference implementation. Customize as needed for your specific security and operational requirements.
