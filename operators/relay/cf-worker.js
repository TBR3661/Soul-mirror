copilot/add-kora-connector
/**
 * Kora Connector - Cloudflare Worker
 * 
 * Safe ChatGPT connector for Soul-Mirror repository operations.
 * Enables non-destructive actions: dispatch hivemind tasks, list PRs, 
 * comment on PRs, and add labels. No merges or direct writes to main.
 * 
 * Environment Variables Required:
 * - GITHUB_TOKEN: GitHub Personal Access Token with repo and workflow permissions
 * - CHATGPT_BEARER_TOKEN: Bearer token for ChatGPT authentication
 */

// CORS headers for all responses
// Note: In production, restrict Access-Control-Allow-Origin to specific ChatGPT domains
// For now, using '*' to allow testing from various sources
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// GitHub API base URL
const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Main request handler
 */
export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    // Parse URL
    const url = new URL(request.url);
    const path = url.pathname;

    // Serve OpenAPI schema
    if (path === '/openapi.json' && request.method === 'GET') {
      return serveOpenAPISchema(request);
    }

    // All other endpoints require POST and authentication
    if (request.method !== 'POST') {
      return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
    }

    // Authenticate request
    const authResult = authenticateRequest(request, env);
    if (!authResult.success) {
      return jsonResponse({ success: false, error: authResult.error }, 401);
    }

    // Route to appropriate handler
    try {
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
      }

      switch (path) {
        case '/chatgpt/dispatch':
          return await handleDispatch(body, env);
        case '/chatgpt/prs/list':
          return await handleListPRs(body, env);
        case '/chatgpt/prs/comment':
          return await handleCommentPR(body, env);
        case '/chatgpt/prs/label':
          return await handleLabelPR(body, env);
        default:
          return jsonResponse({ success: false, error: 'Endpoint not found' }, 404);
      }
    } catch (error) {
      console.error('Error handling request:', error);
      // Don't expose internal error details in production
      return jsonResponse({ 
        success: false, 
        error: 'Internal server error'
      }, 500);
    }
  },
};

/**
 * Authenticate incoming request with bearer token
 */
function authenticateRequest(request, env) {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader) {
    return { success: false, error: 'Missing Authorization header' };
  }

  const [scheme, token] = authHeader.split(' ');
  
  if (scheme !== 'Bearer' || !token) {
    return { success: false, error: 'Invalid Authorization header format' };
  }

  if (token !== env.CHATGPT_BEARER_TOKEN) {
    return { success: false, error: 'Invalid bearer token' };
  }

  return { success: true };
}

/**
 * Serve OpenAPI schema
 * Note: In production, you may want to inline the schema JSON or fetch from a CDN
 * For now, returns endpoint information for manual schema import
 */
function serveOpenAPISchema(request) {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  
  return jsonResponse({
    message: 'OpenAPI schema available in repository',
    info: 'Import cf-openapi.json into ChatGPT Actions manually',
    schema_url: 'https://github.com/TBR3661/Soul-mirror/blob/main/operators/relay/cf-openapi.json',
    endpoints: {
      dispatch: `${baseUrl}/chatgpt/dispatch`,
      list_prs: `${baseUrl}/chatgpt/prs/list`,
      comment: `${baseUrl}/chatgpt/prs/comment`,
      label: `${baseUrl}/chatgpt/prs/label`,
    }
  });
}

/**
 * Handle repository_dispatch
 */
async function handleDispatch(body, env) {
  const { owner, repo, event_type, client_payload } = body;

  if (!owner || !repo || !event_type) {
    return jsonResponse({
      success: false,
      error: 'Missing required parameters: owner, repo, event_type'
    }, 400);
  }

  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/dispatches`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `token ${env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'Kora-Connector-Worker',
    },
    body: JSON.stringify({
      event_type,
      client_payload: client_payload || {},
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return jsonResponse({
      success: false,
      error: 'Failed to dispatch event',
      github_error: error,
      status: response.status,
    }, response.status);
  }

  return jsonResponse({
    success: true,
    message: 'Repository dispatch event triggered successfully',
    event_type,
  });
}

/**
 * Handle list pull requests
 */
async function handleListPRs(body, env) {
  const { owner, repo, state = 'open', per_page = 10, page = 1 } = body;

  if (!owner || !repo) {
    return jsonResponse({
      success: false,
      error: 'Missing required parameters: owner, repo'
    }, 400);
  }

  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls?state=${state}&per_page=${per_page}&page=${page}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `token ${env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Kora-Connector-Worker',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    return jsonResponse({
      success: false,
      error: 'Failed to list pull requests',
      github_error: error,
      status: response.status,
    }, response.status);
  }

  const prs = await response.json();
  
  // Map to simplified format
  const pull_requests = prs.map(pr => ({
    number: pr.number,
    title: pr.title,
    state: pr.state,
    user: pr.user.login,
    created_at: pr.created_at,
    updated_at: pr.updated_at,
    html_url: pr.html_url,
    body: pr.body,
    labels: pr.labels.map(label => label.name),
  }));

  return jsonResponse({
    success: true,
    pull_requests,
    count: pull_requests.length,
  });
}

/**
 * Handle add comment to pull request
 */
async function handleCommentPR(body, env) {
  const { owner, repo, pr_number, comment } = body;

  if (!owner || !repo || !pr_number || !comment) {
    return jsonResponse({
      success: false,
      error: 'Missing required parameters: owner, repo, pr_number, comment'
    }, 400);
  }

  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${pr_number}/comments`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `token ${env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'Kora-Connector-Worker',
    },
    body: JSON.stringify({
      body: comment,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return jsonResponse({
      success: false,
      error: 'Failed to add comment',
      github_error: error,
      status: response.status,
    }, response.status);
  }

  const result = await response.json();

  return jsonResponse({
    success: true,
    comment_id: result.id,
    html_url: result.html_url,
  });
}

/**
 * Handle add labels to pull request
 */
async function handleLabelPR(body, env) {
  const { owner, repo, pr_number, labels } = body;

  if (!owner || !repo || !pr_number || !labels || !Array.isArray(labels)) {
    return jsonResponse({
      success: false,
      error: 'Missing required parameters: owner, repo, pr_number, labels (array)'
    }, 400);
  }

  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${pr_number}/labels`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `token ${env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'Kora-Connector-Worker',
    },
    body: JSON.stringify({
      labels,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return jsonResponse({
      success: false,
      error: 'Failed to add labels',
      github_error: error,
      status: response.status,
    }, response.status);
  }

  const result = await response.json();

  return jsonResponse({
    success: true,
    labels: result.map(label => label.name),
  });
}

/**
 * Helper function to create JSON response with CORS headers
 */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}
=======
copilot/activate-hivemind-build-crew
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
  // TODO: Replace 'OWNER/REPO' with your actual repository
  const repoOwner = 'OWNER'
  const repoName = 'REPO'
  
  try {
    const githubResponse = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/dispatches`,
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
  'soul-mirror': 'OWNER/Soul-mirror',
  'other-repo': 'OWNER/Other-Repo'
}

const repo = REPO_MAP[body.repository] || 'OWNER/REPO'
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
=======
/**
 * Cloudflare Worker - OpenAI Relay with Governance Hardening
 * 
 * This worker provides a secure proxy to OpenAI's API with:
 * - Secret-based authentication
 * - Origin allowlisting
 * - Rate limiting (best-effort, in-memory)
 * - No logging of prompts/responses
 * 
 * Environment Variables Required:
 * - OPENAI_API_KEY: Your OpenAI API key
 * - RELAY_SECRET: Secret token for authenticating requests
 * - ORIGIN_ALLOWLIST: Comma-separated list of allowed origins (optional, e.g., "https://example.com,https://app.example.com")
 * - OPENAI_MODEL: Default model (optional, defaults to gpt-4o-mini)
 * - MAX_TOKENS: Maximum tokens per request (optional, defaults to 2000)
 * - TEMPERATURE: Default temperature (optional, defaults to 0.7)
 * - RATE_LIMIT_REQUESTS: Requests per minute per IP (optional, defaults to 10)
 */

// Simple in-memory rate limiter (resets on worker restart)
const rateLimits = new Map();

/**
 * Check if origin is allowed
 */
function isOriginAllowed(origin, allowlist) {
  if (!allowlist) return true; // No allowlist means all origins allowed
  
  const allowed = allowlist.split(',').map(o => o.trim());
  return allowed.includes(origin);
}

/**
 * Check rate limit for IP
 */
function checkRateLimit(ip, maxRequests = 10) {
  const now = Date.now();
  const minute = Math.floor(now / 60000);
  const key = `${ip}:${minute}`;
  
  const current = rateLimits.get(key) || 0;
  
  if (current >= maxRequests) {
    return false;
  }
  
  rateLimits.set(key, current + 1);
  
  // Clean up old entries (keep last 2 minutes)
  const cutoff = minute - 2;
  for (const [k] of rateLimits) {
    const [, m] = k.split(':');
    if (parseInt(m) < cutoff) {
      rateLimits.delete(k);
    }
  }
  
  return true;
}

/**
 * Handle OpenAI chat completion request
 */
async function handleOpenAIChat(request, env) {
  // Verify relay secret
  const relaySecret = request.headers.get('X-Relay-Secret');
  if (!env.RELAY_SECRET || relaySecret !== env.RELAY_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Check origin
  const origin = request.headers.get('Origin');
  if (origin && !isOriginAllowed(origin, env.ORIGIN_ALLOWLIST)) {
    return new Response('Forbidden: Origin not allowed', { status: 403 });
  }
  
  // Check rate limit
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rateLimit = parseInt(env.RATE_LIMIT_REQUESTS || '10');
  if (!checkRateLimit(ip, rateLimit)) {
    return new Response('Rate limit exceeded', { status: 429 });
  }
  
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.messages || !Array.isArray(body.messages)) {
      return new Response('Invalid request: messages array required', { status: 400 });
    }
    
    // Apply server-side constraints
    const openaiRequest = {
      model: body.model || env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: body.messages,
      temperature: Math.min(
        body.temperature || parseFloat(env.TEMPERATURE || '0.7'),
        1.0
      ),
      max_tokens: Math.min(
        body.max_tokens || parseInt(env.MAX_TOKENS || '2000'),
        parseInt(env.MAX_TOKENS || '4000')
      ),
    };
    
    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(openaiRequest),
    });
    
    // Log only status code (not request/response content)
    console.log(`OpenAI API response: ${openaiResponse.status}`);
    
    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error(`OpenAI API error: ${openaiResponse.status}`);
      return new Response(`OpenAI API error: ${openaiResponse.status}`, { 
        status: openaiResponse.status 
      });
    }
    
    // Forward response
    const data = await openaiResponse.json();
    
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Relay-Secret',
      },
    });
    
  } catch (error) {
    console.error('Relay error:', error.message);
    return new Response('Internal server error', { status: 500 });
  }
}

/**
 * Handle CORS preflight
 */
function handleOptions(request, env) {
  const origin = request.headers.get('Origin');
  
  // Check origin
  if (origin && !isOriginAllowed(origin, env.ORIGIN_ALLOWLIST)) {
    return new Response('Forbidden: Origin not allowed', { status: 403 });
  }
  
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Relay-Secret',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * Main request handler
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle OPTIONS for CORS
    if (request.method === 'OPTIONS') {
      return handleOptions(request, env);
    }
    
    // Route to OpenAI chat endpoint
    if (url.pathname === '/relay/openai/chat' && request.method === 'POST') {
      return handleOpenAIChat(request, env);
    }
    
    // Health check
    if (url.pathname === '/relay/health') {
      return new Response('OK', { status: 200 });
    }
    
    // 404 for everything else
    return new Response('Not Found', { status: 404 });
  },
};
main
main
