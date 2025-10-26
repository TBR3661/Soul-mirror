# Example Usage

This file shows example API calls for testing the Soul Mirror Relay endpoints.

## Prerequisites

Set environment variables:
```bash
export WORKER_URL="https://soul-mirror-relay.YOUR_SUBDOMAIN.workers.dev"
export BEARER_TOKEN="your-bearer-token-here"
```

## Billing & Store Examples

### Example 1: Get Monthly Subscription Payment Link

```bash
curl "${WORKER_URL}/billing/link?tier=monthly"
```

Expected response:
```json
{
  "success": true,
  "tier": "monthly",
  "payment_link": "https://chase.com/payment/monthly-abc123",
  "message": "Redirect user to this payment link to complete subscription"
}
```

### Example 2: Get Quarterly Subscription Payment Link

```bash
curl "${WORKER_URL}/billing/link?tier=quarterly"
```

Expected response:
```json
{
  "success": true,
  "tier": "quarterly",
  "payment_link": "https://chase.com/payment/quarterly-xyz789",
  "message": "Redirect user to this payment link to complete subscription"
}
```

### Example 3: Get Yearly Subscription Payment Link

```bash
curl "${WORKER_URL}/billing/link?tier=yearly"
```

Expected response:
```json
{
  "success": true,
  "tier": "yearly",
  "payment_link": "https://chase.com/payment/yearly-def456",
  "message": "Redirect user to this payment link to complete subscription"
}
```

### Example 4: Get Store Product Payment Link

```bash
curl "${WORKER_URL}/store/link?sku=EBOOK"
```

Expected response:
```json
{
  "success": true,
  "sku": "EBOOK",
  "payment_link": "https://chase.com/payment/ebook-abc123",
  "message": "Redirect user to this payment link to complete purchase"
}
```

### Example 5: Get Another Store Product

```bash
curl "${WORKER_URL}/store/link?sku=COURSE"
```

Expected response:
```json
{
  "success": true,
  "sku": "COURSE",
  "payment_link": "https://chase.com/payment/course-xyz789",
  "message": "Redirect user to this payment link to complete purchase"
}
```

## Entitlement Management Examples

### Example 6: Check User Entitlements (No Access)

```bash
curl "${WORKER_URL}/entitlements/check?user_id=newuser123"
```

Expected response:
```json
{
  "success": true,
  "user_id": "newuser123",
  "has_access": false,
  "entitlements": [],
  "message": "No active entitlements found"
}
```

### Example 7: Grant Subscription Entitlement

```bash
curl -X POST "${WORKER_URL}/entitlements/grant" \
  -H "Authorization: Bearer ${BEARER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "type": "subscription",
    "tier": "monthly",
    "expires_at": "2025-11-26T20:00:00Z"
  }'
```

Expected response:
```json
{
  "success": true,
  "user_id": "user123",
  "type": "subscription",
  "message": "Entitlement granted successfully",
  "entitlements": {
    "subscriptions": [
      {
        "tier": "monthly",
        "status": "active",
        "granted_at": "2024-10-26T20:00:00Z",
        "expires_at": "2025-11-26T20:00:00Z"
      }
    ],
    "purchases": []
  }
}
```

### Example 8: Grant Purchase Entitlement

```bash
curl -X POST "${WORKER_URL}/entitlements/grant" \
  -H "Authorization: Bearer ${BEARER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user456",
    "type": "purchase",
    "sku": "EBOOK"
  }'
```

Expected response:
```json
{
  "success": true,
  "user_id": "user456",
  "type": "purchase",
  "message": "Entitlement granted successfully",
  "entitlements": {
    "subscriptions": [],
    "purchases": [
      {
        "sku": "EBOOK",
        "purchased_at": "2024-10-26T20:00:00Z"
      }
    ]
  }
}
```

### Example 9: Check User Entitlements (With Active Subscription)

```bash
curl "${WORKER_URL}/entitlements/check?user_id=user123"
```

Expected response:
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
  "purchases": [],
  "message": "User has active access"
}
```

### Example 10: Check User Entitlements (With Purchase)

```bash
curl "${WORKER_URL}/entitlements/check?user_id=user456"
```

Expected response:
```json
{
  "success": true,
  "user_id": "user456",
  "has_access": true,
  "subscription": null,
  "purchases": [
    {
      "sku": "EBOOK",
      "purchased_at": "2024-10-26T20:00:00Z"
    }
  ],
  "message": "User has active access"
}
```

## Error Handling Examples

### Example 11: Invalid Subscription Tier

```bash
curl "${WORKER_URL}/billing/link?tier=invalid"
```

Expected response:
```json
{
  "success": false,
  "error": "Invalid tier. Must be one of: monthly, quarterly, yearly"
}
```

### Example 12: Missing Tier Parameter

```bash
curl "${WORKER_URL}/billing/link"
```

Expected response:
```json
{
  "success": false,
  "error": "Missing required parameter: tier (monthly|quarterly|yearly)"
}
```

### Example 13: Invalid SKU Format

```bash
curl "${WORKER_URL}/store/link?sku=INVALID@SKU"
```

Expected response:
```json
{
  "success": false,
  "error": "Invalid SKU format. Only alphanumeric characters, dashes, and underscores allowed"
}
```

### Example 14: SKU Not Configured

```bash
curl "${WORKER_URL}/store/link?sku=NOTFOUND"
```

Expected response:
```json
{
  "success": false,
  "error": "Payment link not configured for SKU: NOTFOUND"
}
```

### Example 15: Missing Authentication for Grant

```bash
curl -X POST "${WORKER_URL}/entitlements/grant" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "type": "subscription",
    "tier": "monthly"
  }'
```

Expected response:
```json
{
  "success": false,
  "error": "Missing Authorization header"
}
```

## ChatGPT Connector Examples

### Example 16: List Open Pull Requests

```bash
curl -X POST "${WORKER_URL}/chatgpt/prs/list" \
  -H "Authorization: Bearer ${BEARER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "TBR3661",
    "repo": "Soul-mirror",
    "state": "open",
    "per_page": 10
  }'
```

Expected response:
```json
{
  "success": true,
  "pull_requests": [
    {
      "number": 5,
      "title": "Add new feature",
      "state": "open",
      "user": "username",
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-16T10:00:00Z",
      "html_url": "https://github.com/TBR3661/Soul-mirror/pull/5",
      "body": "Pull request description",
      "labels": ["enhancement"]
    }
  ],
  "count": 1
}
```

### Example 17: Add Comment to Pull Request

```bash
curl -X POST "${WORKER_URL}/chatgpt/prs/comment" \
  -H "Authorization: Bearer ${BEARER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "TBR3661",
    "repo": "Soul-mirror",
    "pr_number": 5,
    "comment": "Kora here! I'\''ve reviewed this PR and it looks good. The changes are minimal and focused."
  }'
```

Expected response:
```json
{
  "success": true,
  "comment_id": 123456789,
  "html_url": "https://github.com/TBR3661/Soul-mirror/pull/5#issuecomment-123456789"
}
```

### Example 18: Add Labels to Pull Request

```bash
curl -X POST "${WORKER_URL}/chatgpt/prs/label" \
  -H "Authorization: Bearer ${BEARER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "TBR3661",
    "repo": "Soul-mirror",
    "pr_number": 5,
    "labels": ["reviewed-by-kora", "ready-for-merge"]
  }'
```

Expected response:
```json
{
  "success": true,
  "labels": ["reviewed-by-kora", "ready-for-merge", "enhancement"]
}
```

### Example 19: Dispatch Hivemind Task

```bash
curl -X POST "${WORKER_URL}/chatgpt/dispatch" \
  -H "Authorization: Bearer ${BEARER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "TBR3661",
    "repo": "Soul-mirror",
    "event_type": "hivemind-code-review",
    "client_payload": {
      "task": "code-review",
      "pr_number": 5,
      "priority": "normal",
      "requested_by": "kora"
    }
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Repository dispatch event triggered successfully",
  "event_type": "hivemind-code-review"
}
```

## Integration Testing

### Complete Workflow Test

```bash
#!/bin/bash
# test-subscription-flow.sh

WORKER_URL="https://soul-mirror-relay.YOUR_SUBDOMAIN.workers.dev"
BEARER_TOKEN="your-token"

echo "Testing Subscription & Store Workflow..."

# Test 1: Get subscription links
echo "1. Testing billing links..."
for tier in monthly quarterly yearly; do
  RESPONSE=$(curl -s "${WORKER_URL}/billing/link?tier=${tier}")
  if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✓ ${tier} tier link available"
  else
    echo "✗ ${tier} tier link failed"
    echo "$RESPONSE"
  fi
done

# Test 2: Get store links
echo "2. Testing store links..."
for sku in EBOOK COURSE; do
  RESPONSE=$(curl -s "${WORKER_URL}/store/link?sku=${sku}")
  if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✓ SKU ${sku} link available"
  else
    echo "✗ SKU ${sku} link failed"
    echo "$RESPONSE"
  fi
done

# Test 3: Check entitlements (new user)
echo "3. Testing entitlement check (new user)..."
RESPONSE=$(curl -s "${WORKER_URL}/entitlements/check?user_id=test_user_001")
if echo "$RESPONSE" | grep -q '"has_access":false'; then
  echo "✓ New user correctly has no access"
else
  echo "✗ New user check failed"
  echo "$RESPONSE"
fi

# Test 4: Grant subscription entitlement
echo "4. Testing entitlement grant..."
RESPONSE=$(curl -s -X POST "${WORKER_URL}/entitlements/grant" \
  -H "Authorization: Bearer ${BEARER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user_001",
    "type": "subscription",
    "tier": "monthly",
    "expires_at": "2025-12-31T23:59:59Z"
  }')

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✓ Entitlement granted successfully"
else
  echo "✗ Entitlement grant failed"
  echo "$RESPONSE"
fi

# Test 5: Check entitlements (after grant)
echo "5. Testing entitlement check (after grant)..."
RESPONSE=$(curl -s "${WORKER_URL}/entitlements/check?user_id=test_user_001")
if echo "$RESPONSE" | grep -q '"has_access":true'; then
  echo "✓ User now has access"
else
  echo "✗ User access check failed"
  echo "$RESPONSE"
fi

echo ""
echo "Testing complete!"
```

## Monitoring

Check worker logs in real-time:
```bash
wrangler tail
```

Or view in Cloudflare dashboard:
1. Go to Workers & Pages
2. Select soul-mirror-relay
3. Click on "Logs" tab
4. View real-time requests and responses

## ChatGPT Integration (Existing)

### Example 20: Error Handling - Missing ChatGPT Authentication

```bash
curl -X POST "${WORKER_URL}/chatgpt/prs/list" \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "TBR3661",
    "repo": "Soul-mirror"
  }'
```

Expected response:
```json
{
  "success": false,
  "error": "Missing Authorization header"
}
```

### Example 21: Error Handling - Invalid ChatGPT Token

```bash
curl -X POST "${WORKER_URL}/chatgpt/prs/list" \
  -H "Authorization: Bearer wrong-token" \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "TBR3661",
    "repo": "Soul-mirror"
  }'
```

Expected response:
```json
{
  "success": false,
  "error": "Invalid bearer token"
}
```

## Testing with ChatGPT

Once configured, you can test in ChatGPT with natural language:

**Example prompts:**
- "List all open pull requests in Soul-mirror"
- "Add a comment to PR #5 saying 'Reviewing this now'"
- "Label PR #3 with 'documentation' and 'in-progress'"
- "Trigger a code review task for PR #7"

