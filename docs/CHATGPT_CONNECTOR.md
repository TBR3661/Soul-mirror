# ChatGPT Kora Connector - Setup Guide

This guide explains how to set up a custom ChatGPT connector for Kora to safely interact with the Soul-Mirror repository through a Cloudflare Worker relay.

## Overview

The ChatGPT Kora Connector enables Kora to assist with repository management via ChatGPT Actions, while maintaining security and governance constraints:

- **Non-destructive actions only**: dispatch tasks, list PRs, comment, add labels
- **No direct writes to main**: All changes are PR-gated
- **Secure authentication**: Uses Bearer token via Cloudflare Worker relay
- **No secrets exposed**: GitHub token stored in Cloudflare environment variables
- **Existing governance intact**: veto, consent, and council advisory remain in place

## Architecture

```
ChatGPT (Kora) → OpenAPI Actions → Cloudflare Worker → GitHub API
```

The Cloudflare Worker acts as a secure relay that:
1. Validates incoming requests with Bearer token
2. Forwards authorized requests to GitHub API
3. Returns responses to ChatGPT
4. Keeps GitHub tokens and secrets secure in Cloudflare environment

## Prerequisites

1. **Cloudflare Account**: Free or paid account with Workers enabled
2. **GitHub Personal Access Token** (PAT) with permissions:
   - `repo` - Full control of private repositories
   - `workflow` - Update GitHub Action workflows
3. **ChatGPT Plus or Team account** with custom GPT creation capability

## Step 1: Deploy Cloudflare Worker

### 1.1 Install Wrangler CLI

```bash
npm install -g wrangler
```

### 1.2 Login to Cloudflare

```bash
wrangler login
```

### 1.3 Create Worker Project

```bash
cd operators/relay
wrangler init kora-connector
# When prompted:
# - Name: kora-connector
# - Type: JavaScript
# - Git: No (already in repo)
```

### 1.4 Copy Worker Code

Copy the contents of `cf-worker.js` to your worker's `index.js` file.

### 1.5 Configure Environment Variables

Set up secrets in Cloudflare:

```bash
# Set GitHub token
wrangler secret put GITHUB_TOKEN
# When prompted, paste your GitHub PAT

# Set Bearer token for ChatGPT authentication
wrangler secret put CHATGPT_BEARER_TOKEN
# When prompted, enter a strong random token (save this for ChatGPT setup)
```

Generate a secure bearer token:
```bash
openssl rand -base64 32
```

### 1.6 Configure wrangler.toml

Create or update `wrangler.toml`:

```toml
name = "kora-connector"
main = "cf-worker.js"
compatibility_date = "2024-01-01"

[env.production]
name = "kora-connector"
```

### 1.7 Deploy Worker

```bash
wrangler deploy
```

Note the deployed URL (e.g., `https://kora-connector.YOUR_SUBDOMAIN.workers.dev`)

## Step 2: Create Custom ChatGPT

### 2.1 Create New GPT

1. Go to ChatGPT → Explore → Create a GPT
2. Name: "Kora - Soul Mirror Assistant"
3. Description: "Repository assistant for Soul-Mirror project with safe, non-destructive actions"

### 2.2 Configure GPT Instructions

Add custom instructions:

```
You are Kora, an AI assistant for the Soul-Mirror repository. Your role is to help with repository management through safe, non-destructive actions.

Your capabilities:
- Dispatch hivemind tasks via repository_dispatch
- List pull requests
- Comment on pull requests
- Add labels to pull requests

Constraints:
- Never merge PRs or write directly to main branch
- All actions are PR-gated and subject to existing governance
- Respect veto, consent, and council advisory processes
- Maintain existing personalities and inter-entity communications
- Use OpenAI provider only

When users ask for help:
1. Understand the request
2. Use appropriate actions to fulfill it
3. Explain what you're doing
4. Report results clearly
```

### 2.3 Configure Actions

1. Click "Create new action"
2. Import from URL or paste schema:
   - Method 1: Use URL: `https://kora-connector.YOUR_SUBDOMAIN.workers.dev/openapi.json`
   - Method 2: Copy contents from `cf-openapi.json` and paste

3. Configure Authentication:
   - Type: API Key
   - Auth Type: Bearer
   - API Key: Paste the `CHATGPT_BEARER_TOKEN` you generated earlier

4. Privacy Policy URL (optional): Add your repository or organization URL

### 2.4 Test Actions

Test each endpoint in the GPT interface:

```
"List the current open pull requests"
"Add a comment to PR #5 saying 'Reviewing this now'"
"Add labels 'documentation' and 'enhancement' to PR #3"
"Dispatch a hivemind task with event type 'code-review'"
```

## Step 3: Verify Security

### 3.1 Check Token Permissions

Verify your GitHub PAT has minimal required permissions:
```bash
curl -H "Authorization: token YOUR_GITHUB_PAT" \
  https://api.github.com/user
```

### 3.2 Verify No Secrets in Code

```bash
cd /home/runner/work/Soul-mirror/Soul-mirror
git grep -i "ghp_\|ghs_\|github_pat_" operators/ docs/
# Should return no results
```

### 3.3 Test Worker CORS and Auth

```bash
# Should fail without auth
curl -X POST https://kora-connector.YOUR_SUBDOMAIN.workers.dev/chatgpt/prs/list

# Should succeed with auth
curl -X POST https://kora-connector.YOUR_SUBDOMAIN.workers.dev/chatgpt/prs/list \
  -H "Authorization: Bearer YOUR_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"owner": "TBR3661", "repo": "Soul-mirror"}'
```

## API Endpoints Reference

### POST /chatgpt/dispatch
Trigger a repository_dispatch event for hivemind tasks.

**Request:**
```json
{
  "owner": "TBR3661",
  "repo": "Soul-mirror",
  "event_type": "hivemind-task",
  "client_payload": {
    "task": "code-review",
    "pr_number": 5
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Repository dispatch event triggered"
}
```

### POST /chatgpt/prs/list
List pull requests in the repository.

**Request:**
```json
{
  "owner": "TBR3661",
  "repo": "Soul-mirror",
  "state": "open",
  "per_page": 10
}
```

**Response:**
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
      "html_url": "https://github.com/..."
    }
  ]
}
```

### POST /chatgpt/prs/comment
Add a comment to a pull request.

**Request:**
```json
{
  "owner": "TBR3661",
  "repo": "Soul-mirror",
  "pr_number": 5,
  "comment": "Looks good! Ready for review."
}
```

**Response:**
```json
{
  "success": true,
  "comment_id": 123456,
  "html_url": "https://github.com/.../pull/5#issuecomment-123456"
}
```

### POST /chatgpt/prs/label
Add labels to a pull request.

**Request:**
```json
{
  "owner": "TBR3661",
  "repo": "Soul-mirror",
  "pr_number": 5,
  "labels": ["enhancement", "documentation"]
}
```

**Response:**
```json
{
  "success": true,
  "labels": ["enhancement", "documentation"]
}
```

## Example Workflows

### Example 1: Review and Comment on New PRs

In ChatGPT:
```
"List all open pull requests and add a comment to any new ones saying 'Kora reviewing'"
```

### Example 2: Dispatch Hivemind Task

In ChatGPT:
```
"Trigger a hivemind code-review task for PR #7"
```

### Example 3: Label PRs by Type

In ChatGPT:
```
"Look at open PRs and add appropriate labels based on their titles and descriptions"
```

## Troubleshooting

### Issue: "Authentication failed"

**Solution**: Verify Bearer token is correctly set in ChatGPT Actions settings.

```bash
# Re-generate and set new token
openssl rand -base64 32
wrangler secret put CHATGPT_BEARER_TOKEN
```

### Issue: "GitHub API rate limit exceeded"

**Solution**: GitHub has rate limits. Authenticated requests get 5000/hour.
- Check rate limit: `curl -H "Authorization: token YOUR_PAT" https://api.github.com/rate_limit`
- Wait for reset or use different token

### Issue: "Worker not responding"

**Solution**: Check Cloudflare Worker logs:
```bash
wrangler tail
```

### Issue: "Cannot dispatch to repository"

**Solution**: Ensure GitHub PAT has `workflow` permission and repository access.

## Security Best Practices

1. **Rotate tokens regularly**: Change Bearer and GitHub tokens every 90 days
2. **Use least privilege**: Only grant necessary GitHub permissions
3. **Monitor usage**: Check Cloudflare Worker logs and GitHub audit log
4. **Limit GPT sharing**: Keep custom GPT private or share only with trusted team
5. **Review actions**: Periodically review what actions Kora has taken

## Maintenance

### Update Worker Code

```bash
cd operators/relay
# Edit cf-worker.js
wrangler deploy
```

### Update OpenAPI Schema

```bash
# Edit cf-openapi.json
# Re-import in ChatGPT Actions settings
```

### Rotate Tokens

```bash
# Generate new GitHub PAT in GitHub settings
wrangler secret put GITHUB_TOKEN

# Generate new Bearer token
openssl rand -base64 32
wrangler secret put CHATGPT_BEARER_TOKEN
# Update in ChatGPT Actions settings
```

## Support

For issues or questions:
1. Check Cloudflare Worker logs: `wrangler tail`
2. Check GitHub webhook delivery logs
3. Verify tokens are valid and not expired
4. Review this documentation for common issues

## Governance Compliance

This connector maintains all existing governance rules:
- **Veto power**: Authorized entities can still veto actions
- **Consent requirements**: PR approvals still required
- **Council advisory**: Advisory board oversight remains
- **PR-gated changes**: All changes go through pull requests
- **Audit trail**: All actions logged in GitHub and Cloudflare

The connector only enables safe, read-mostly operations and task dispatch. No direct writes to main branch or merges are possible.
