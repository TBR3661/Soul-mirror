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
