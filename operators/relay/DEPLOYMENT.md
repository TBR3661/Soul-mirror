# Subscription & Store Deployment Guide

This guide walks you through deploying the subscription and store scaffolding with Chase payment links and KV-backed entitlement ledger.

## Overview

The system provides:
- **Billing endpoints** - Distribute Chase payment links for subscription tiers
- **Store endpoints** - Distribute Chase payment links for per-SKU purchases
- **Entitlement ledger** - KV-backed storage for subscription and purchase tracking
- **Access control** - Check user entitlements to gate private library content

## Prerequisites

- Cloudflare account with Workers plan
- Wrangler CLI installed (`npm install -g wrangler`)
- Chase payment links for each tier/SKU
- GitHub token (for existing ChatGPT connector functionality)

## Step 1: Create KV Namespace

Create a KV namespace for storing entitlements:

```bash
# Production namespace
wrangler kv:namespace create ENTITLEMENTS_KV

# Preview namespace (for dev/testing)
wrangler kv:namespace create ENTITLEMENTS_KV --preview
```

You'll receive output like:
```
{ binding = "ENTITLEMENTS_KV", id = "abc123..." }
{ binding = "ENTITLEMENTS_KV", preview_id = "xyz789..." }
```

## Step 2: Update wrangler.toml

Edit `operators/relay/wrangler.toml` and update the KV namespace IDs:

```toml
kv_namespaces = [
  { binding = "ENTITLEMENTS_KV", id = "YOUR_PRODUCTION_ID", preview_id = "YOUR_PREVIEW_ID" }
]
```

Replace `YOUR_PRODUCTION_ID` and `YOUR_PREVIEW_ID` with the IDs from Step 1.

## Step 3: Configure Payment Links

Set your Chase payment links as Worker secrets:

```bash
# Navigate to operators/relay directory
cd operators/relay

# Set subscription tier links
wrangler secret put CHASE_LINK_MONTHLY
# Paste your Chase payment link for monthly subscription

wrangler secret put CHASE_LINK_QUARTERLY
# Paste your Chase payment link for quarterly subscription

wrangler secret put CHASE_LINK_YEARLY
# Paste your Chase payment link for yearly subscription

# Set store product links (one per SKU)
wrangler secret put CHASE_LINK_SKU_EBOOK
# Paste your Chase payment link for ebook purchase

wrangler secret put CHASE_LINK_SKU_COURSE
# Paste your Chase payment link for course purchase

# Add more SKUs as needed...
wrangler secret put CHASE_LINK_SKU_TEMPLATE
wrangler secret put CHASE_LINK_SKU_ADDON
```

## Step 4: Configure Existing Secrets

If not already set, configure the existing ChatGPT connector secrets:

```bash
wrangler secret put GITHUB_TOKEN
# Paste your GitHub Personal Access Token

wrangler secret put CHATGPT_BEARER_TOKEN
# Paste your ChatGPT bearer token
```

## Step 5: Deploy Worker

Deploy the worker to Cloudflare:

```bash
wrangler deploy
```

You'll receive a URL like: `https://soul-mirror-relay.YOUR_SUBDOMAIN.workers.dev`

## Step 6: Test Endpoints

Test the billing and store endpoints:

```bash
# Set your worker URL
export WORKER_URL="https://soul-mirror-relay.YOUR_SUBDOMAIN.workers.dev"

# Test monthly subscription link
curl "${WORKER_URL}/billing/link?tier=monthly"

# Test store product link
curl "${WORKER_URL}/store/link?sku=EBOOK"

# Test entitlement check (should return no access for new user)
curl "${WORKER_URL}/entitlements/check?user_id=test123"
```

## Step 7: Grant Test Entitlement

Test the entitlement grant endpoint:

```bash
# Set your bearer token
export BEARER_TOKEN="your-chatgpt-bearer-token"

# Grant a subscription to test user
curl -X POST "${WORKER_URL}/entitlements/grant" \
  -H "Authorization: Bearer ${BEARER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test123",
    "type": "subscription",
    "tier": "monthly",
    "expires_at": "2025-12-31T23:59:59Z"
  }'

# Verify the grant
curl "${WORKER_URL}/entitlements/check?user_id=test123"
```

## Step 8: Integrate with Your Application

### Frontend Integration

```javascript
// Get payment link and redirect user
async function initiateSubscription(tier) {
  const response = await fetch(
    `https://YOUR_WORKER_URL/billing/link?tier=${tier}`
  );
  const data = await response.json();
  
  if (data.success) {
    // Redirect to Chase payment page
    window.location.href = data.payment_link;
  }
}

// Check if user has access before showing library
async function checkLibraryAccess(userId) {
  const response = await fetch(
    `https://YOUR_WORKER_URL/entitlements/check?user_id=${userId}`
  );
  const data = await response.json();
  
  if (data.has_access) {
    // Show private library
    showLibraryContent();
  } else {
    // Show subscription prompt
    showSubscriptionOptions();
  }
}
```

### Backend Webhook (Post-Payment)

After successful payment, use a webhook to grant entitlement:

```javascript
// Webhook handler (your backend)
app.post('/webhooks/payment-success', async (req, res) => {
  // Verify webhook signature (Chase-specific)
  const { user_id, tier, sku } = req.body;
  
  // Grant entitlement via Worker API
  const response = await fetch('https://YOUR_WORKER_URL/entitlements/grant', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.BEARER_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      user_id,
      type: tier ? 'subscription' : 'purchase',
      tier,
      sku,
      expires_at: tier ? calculateExpiry(tier) : null
    })
  });
  
  res.json({ success: true });
});
```

## Step 9: Configure Custom Domain (Optional)

For production, use a custom domain:

```bash
# Add route in Cloudflare dashboard or via wrangler.toml
routes = [
  { pattern = "api.yourdomain.com/*", zone_name = "yourdomain.com" }
]
```

## Security Considerations

1. **Payment Links**: Rotate Chase payment links regularly and update secrets
2. **Bearer Token**: Use a strong, unique bearer token for admin endpoints
3. **User IDs**: Use cryptographically secure user identifiers
4. **HTTPS Only**: Ensure all communication uses HTTPS
5. **Rate Limiting**: Consider implementing rate limiting for production
6. **CORS**: Restrict CORS to your specific domains in production

## Monitoring

### View Logs

```bash
wrangler tail
```

### Check KV Storage

```bash
# List all keys
wrangler kv:key list --namespace-id=YOUR_NAMESPACE_ID

# Get specific user entitlement
wrangler kv:key get "user:test123" --namespace-id=YOUR_NAMESPACE_ID
```

### Metrics

Monitor in Cloudflare Dashboard:
- Workers & Pages → soul-mirror-relay → Metrics
- Track requests, errors, and CPU time

## Troubleshooting

### Issue: Payment link not found

**Cause**: Secret not set or incorrect SKU/tier name

**Solution**: 
```bash
# List all secrets
wrangler secret list

# Set missing secret
wrangler secret put CHASE_LINK_SKU_YOURSKU
```

### Issue: KV namespace not found

**Cause**: Namespace not created or wrangler.toml not updated

**Solution**:
```bash
# Check namespace exists
wrangler kv:namespace list

# Update wrangler.toml with correct IDs
```

### Issue: Entitlement not persisting

**Cause**: KV write may take a few seconds to propagate

**Solution**: Add retry logic in your application with exponential backoff

### Issue: CORS errors in browser

**Cause**: Origin not in allowlist (if configured)

**Solution**: Update CORS headers in cf-worker.js or add origin to allowlist

## Maintenance

### Update Payment Links

```bash
# Update a payment link
wrangler secret put CHASE_LINK_MONTHLY
# Enter new link
```

### Backup Entitlements

```bash
# Export all entitlements
wrangler kv:key list --namespace-id=YOUR_ID --prefix="user:" > entitlements-backup.json
```

### Clean Expired Subscriptions

Create a scheduled worker to periodically clean up expired subscriptions:

```javascript
// In cf-worker.js, add scheduled event handler
export default {
  async scheduled(event, env, ctx) {
    // Scan KV for expired subscriptions and update status
    // Implementation left as exercise
  }
}
```

## Support

For issues specific to:
- **Cloudflare Workers**: Check [Cloudflare Docs](https://developers.cloudflare.com/workers/)
- **Chase Payment Links**: Contact Chase support
- **Soul Mirror Relay**: Open an issue in the GitHub repository

## Next Steps

1. Set up webhook integration with Chase for automated entitlement grants
2. Implement subscription renewal notifications
3. Add analytics to track conversion rates
4. Create admin dashboard for entitlement management
5. Implement refund handling and entitlement revocation
