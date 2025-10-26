# Example Usage

This file shows example API calls for testing the Kora Connector.

## Prerequisites

Set environment variables:
```bash
export WORKER_URL="https://kora-connector.YOUR_SUBDOMAIN.workers.dev"
export BEARER_TOKEN="your-bearer-token-here"
```

## Example 1: List Open Pull Requests

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

## Example 2: Add Comment to Pull Request

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

## Example 3: Add Labels to Pull Request

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

## Example 4: Dispatch Hivemind Task

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

## Example 5: Error Handling - Missing Authentication

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

## Example 6: Error Handling - Invalid Token

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

## Integration Testing

Create a simple test script:

```bash
#!/bin/bash
# test-kora-connector.sh

WORKER_URL="https://kora-connector.YOUR_SUBDOMAIN.workers.dev"
BEARER_TOKEN="your-token"

echo "Testing Kora Connector..."

# Test 1: List PRs
echo "1. Testing list PRs..."
RESPONSE=$(curl -s -X POST "${WORKER_URL}/chatgpt/prs/list" \
  -H "Authorization: Bearer ${BEARER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"owner":"TBR3661","repo":"Soul-mirror","state":"open"}')

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✓ List PRs working"
else
  echo "✗ List PRs failed"
  echo "$RESPONSE"
fi

# Add more tests as needed...
```

## Monitoring

Check worker logs in real-time:
```bash
wrangler tail
```

Or view in Cloudflare dashboard:
1. Go to Workers & Pages
2. Select kora-connector
3. Click on "Logs" tab
4. View real-time requests and responses
