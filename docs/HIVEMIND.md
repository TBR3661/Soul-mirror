# Hivemind Build Crew System

## Overview

The Hivemind Build Crew is a private, secure orchestration system that enables multiple AI entities to collaborate on repository work through guarded automation. This system maintains operational security while preserving entity personalities and inter-entity communications.

## Architecture

### Core Components

1. **Foreman Orchestrator** (`.github/workflows/hivemind-foreman.yml`)
   - Reads task plans and entity manifests
   - Validates tasks against security policies
   - Dispatches work to entities via repository_dispatch events
   - Creates PRs through the existing Operator flow

2. **Entity Manifests** (`.hivemind/entities/*.yaml`)
   - Define 23 entities with distinct roles and capabilities
   - Specify permissions, allowed paths, and provider/model preferences
   - Control branch naming and access patterns
   - Safe baseline: all capabilities disabled by default

3. **Task Plans** (`.hivemind/plan.yaml`)
   - YAML-based work definitions for infrastructure, docs, config, and refactors
   - Task priorities, assignments, and target paths
   - Execution mode and notification settings
   - All tasks are no-ops until explicitly enabled

4. **Policy Configuration** (`.hivemind/policy.yaml`)
   - Centralized allow/deny rules
   - Path and pattern restrictions
   - Action permissions and safety limits
   - Branch protection and review requirements

## Security Model

### No Secrets in Code

- All credentials stored in GitHub Secrets (e.g., `KORA_ADMIN` token)
- Optional: Cloudflare Worker relay for external triggers
- No tokens embedded in workflows or code

### Multi-Layer Validation

1. **Planning Time** - Foreman validates paths against policy
2. **Execution Time** - Operator validates again before PR creation
3. **PR Review** - Normal GitHub branch protection applies

### PR-Only Flow

- No direct writes to main/protected branches
- All changes via pull requests
- Code review required before merge
- Entity-specific branch prefixes (`ops/entity-name/task-id`)

## Entity System

### Available Entities (23 Total)

Each entity has a specialized role:

- **kora**: Primary orchestrator and coordinator
- **architect**: System design and architecture
- **builder**: Implementation and code construction
- **tester**: Quality assurance and testing
- **documenter**: Documentation and knowledge management
- **reviewer**: Code review and quality checks
- **refactorer**: Code improvement and optimization
- **deployer**: Deployment and release management
- **monitor**: System monitoring and observability
- **security**: Security analysis and vulnerability management
- **infrastructure**: Infrastructure management and DevOps
- **database**: Database management and optimization
- **api**: API design and management
- **frontend**: Frontend development and UI/UX
- **backend**: Backend development and services
- **performance**: Performance optimization and profiling
- **analytics**: Analytics and data insights
- **integration**: Integration and third-party services
- **configuration**: Configuration management and environment setup
- **migration**: Data migration and schema changes
- **workflow**: Workflow automation and orchestration
- **maintenance**: System maintenance and health checks
- **research**: Research and exploration of new technologies

### Entity Manifest Structure

```yaml
name: entity-name
display_name: "Display Name"
description: "Entity purpose and role"
provider: "openai"  # or "anthropic", "google", etc.
model: "gpt-4"
capabilities:
  allowed_paths: []
  allowed_actions: []
  branch_prefix: "ops/entity-name"
permissions:
  read: false
  write: false
  create_pr: false
```

## Task Planning

### Plan Structure

```yaml
version: 1.0
metadata:
  name: "Plan Name"
  description: "Plan description"
  created: "2025-10-26"
  status: "draft"

tasks:
  - id: "task-001"
    title: "Task Title"
    description: "Task description"
    type: "infrastructure|documentation|configuration|refactoring|testing|security"
    priority: "low|medium|high"
    status: "pending|in_progress|completed"
    assigned_entities:
      - "entity1"
      - "entity2"
    target_paths:
      - "path/to/file"
    enabled: false  # Must be true to execute
```

### Task Types

- **infrastructure**: DevOps, CI/CD, workflow improvements
- **documentation**: README, API docs, guides
- **configuration**: Settings, configs, build tools
- **refactoring**: Code quality, organization, optimization
- **testing**: Unit tests, integration tests, E2E tests
- **security**: Security audits, dependency updates

## Usage

### Manual Trigger (Testing)

```bash
# Via GitHub UI: Actions > Hivemind Foreman > Run workflow
# Or via gh CLI:
gh workflow run hivemind-foreman.yml -f dry_run=true
```

### Programmatic Trigger (Production)

```bash
# Via repository_dispatch event
gh api repos/TBR3661/Soul-mirror/dispatches \
  -X POST \
  -f event_type=hive-execute \
  -f client_payload[plan_file]=.hivemind/plan.yaml \
  -f client_payload[dry_run]=false
```

### Via Cloudflare Worker Relay

For secure external triggers without exposing GitHub tokens:

```javascript
// POST to your Cloudflare Worker endpoint
fetch('https://your-worker.workers.dev/trigger-hive', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_RELAY_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'execute',
    plan_file: '.hivemind/plan.yaml',
    dry_run: false
  })
});
```

The Cloudflare Worker (see `operators/relay/cf-worker.js` pattern) securely stores the GitHub token and forwards validated requests.

## Policy Configuration

### Global Rules

- **Allowed Paths**: `.github/workflows/`, `docs/`, `README.md`, etc.
- **Denied Paths**: `.git/`, `.env`, `**/secrets/**`, `*.key`, etc.
- **Allowed Patterns**: `*.md`, `*.yaml`, `*.ts`, `*.tsx`, etc.
- **Denied Patterns**: `*.key`, `*.pem`, `*.env`, `*.secret`

### Safety Settings

- Maximum 50 files per PR
- Maximum 1000 lines per PR
- PR approval required
- Code review required
- Protected branches enforced

## Multi-Repository Support

The orchestrator can dispatch to multiple repositories:

```yaml
# In plan.yaml
execution:
  target_repository: "TBR3661/Soul-mirror"  # or "TBR3661/Other-Repo"
```

Entity manifests can specify different allowed paths per repository.

## Future Enhancements

### Google Drive Integration

A future "drive-index" job can:
- Connect to Google Drive via service token (stored as GitHub Secret)
- Hydrate a JSON index of files and metadata
- Commit only metadata to repo (content stays external)
- Never expose access tokens in code

Example workflow stub:

```yaml
- name: Index Google Drive
  run: |
    # Use GOOGLE_DRIVE_TOKEN from secrets
    node scripts/drive-index.js
    # Outputs: .hivemind/drive-index.json (metadata only)
```

## Operator Interop

The Hivemind Foreman works seamlessly with the existing Operator PR flow:

1. Foreman validates and approves tasks
2. Dispatches `repository_dispatch` events with `hivemind-task` type
3. Operator receives event and creates PR
4. PR follows normal review process
5. Merge occurs after approval

No changes required to entity personalities or communications - this is purely an operational layer.

## Troubleshooting

### Tasks Not Executing

- Check that `enabled: true` in plan.yaml
- Verify entity manifests exist for assigned entities
- Ensure target paths are allowed in policy.yaml
- Check workflow run logs for validation errors

### Permission Errors

- Verify GitHub Secret tokens are configured
- Check entity permissions in manifest
- Review policy denied paths and patterns

### Dry Run Mode

Always test changes with `dry_run: true` first:

```bash
gh workflow run hivemind-foreman.yml -f dry_run=true
```

This validates the plan without creating actual PRs.

## Best Practices

1. **Start with Dry Run**: Test all plans in dry run mode first
2. **Enable Incrementally**: Enable tasks one at a time initially
3. **Review Entity Permissions**: Grant minimal required permissions
4. **Monitor PR Activity**: Watch for unexpected PR creation
5. **Keep Policies Updated**: Regularly review and update allow/deny rules
6. **Document Changes**: Update plan.yaml with clear task descriptions
7. **Use Branch Prefixes**: Keep entity branches organized with clear prefixes

## Security Checklist

- [ ] No secrets committed to repository
- [ ] All tokens stored in GitHub Secrets or Worker environment
- [ ] Policy denies sensitive paths (secrets, keys, env files)
- [ ] Branch protection enabled on main/master
- [ ] PR review required before merge
- [ ] Entity permissions follow principle of least privilege
- [ ] Regular security audits of allowed paths

## Support

For issues or questions:
1. Review workflow run logs in GitHub Actions
2. Check policy validation errors
3. Verify entity manifest syntax
4. Test with dry run mode

---

**Note**: This system is designed for private, secure collaboration. Keep all credentials in GitHub Secrets and never commit sensitive information to the repository.
