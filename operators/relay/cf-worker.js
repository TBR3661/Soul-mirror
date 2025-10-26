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
