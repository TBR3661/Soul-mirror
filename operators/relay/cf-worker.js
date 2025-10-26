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
