# Hivemind Configuration Directory

This directory contains the configuration for the Hivemind Build Crew orchestration system.

## Structure

```
.hivemind/
├── entities/          # 23 entity manifest files
│   ├── kora.yaml     # Primary orchestrator
│   ├── architect.yaml
│   ├── builder.yaml
│   └── ... (20 more)
├── plan.yaml          # Task definitions and execution plan
└── policy.yaml        # Security policies and allow/deny rules
```

## Files

### entities/*.yaml

Each entity represents a specialized AI agent with specific capabilities:

- **kora**: Primary orchestrator and coordinator
- **architect**: System design and architecture
- **builder**: Implementation and code construction
- **tester**: Quality assurance and testing
- **documenter**: Documentation management
- **reviewer**: Code review and quality checks
- **refactorer**: Code improvement and optimization
- **deployer**: Deployment and release management
- **monitor**: System monitoring and observability
- **security**: Security analysis and vulnerability management
- Plus 13 more specialized entities...

All entities start with **disabled permissions** (safe baseline). Enable permissions by editing the entity manifest files.

### plan.yaml

Defines work items (tasks) to be executed by entities:

- Task metadata (ID, title, description)
- Assigned entities
- Target file paths
- Priority and status
- Execution settings

All tasks are **disabled by default** (`enabled: false`). Set `enabled: true` to activate a task.

### policy.yaml

Central security configuration:

- **Allowed paths**: Directories and files entities can access
- **Denied paths**: Forbidden directories (secrets, credentials, etc.)
- **Allowed patterns**: File types entities can modify
- **Denied patterns**: File types to never touch
- **Action restrictions**: What operations are permitted
- **Safety limits**: Max files/lines per PR, review requirements

## Usage

### 1. Enable Entity Permissions

Edit an entity manifest (e.g., `.hivemind/entities/documenter.yaml`):

```yaml
permissions:
  read: true        # Allow reading files
  write: true       # Allow modifying files
  create_pr: true   # Allow creating pull requests
```

### 2. Enable Tasks

Edit `.hivemind/plan.yaml` and set `enabled: true` for desired tasks:

```yaml
- id: "docs-001"
  title: "Update README documentation"
  enabled: true    # Change from false to true
  assigned_entities:
    - "documenter"
  target_paths:
    - "README.md"
```

### 3. Trigger Orchestration

Run the Hivemind Foreman workflow:

```bash
# Dry run (test without creating PRs)
gh workflow run hivemind-foreman.yml -f dry_run=true

# Execute enabled tasks
gh workflow run hivemind-foreman.yml
```

Or via repository_dispatch:

```bash
gh api repos/OWNER/REPO/dispatches \
  -X POST \
  -f event_type=hive-execute
```

## Security

- **No secrets in this directory** - All credentials stored in GitHub Secrets
- **Multi-layer validation** - Policies enforced at planning and execution time
- **PR-only flow** - No direct writes to protected branches
- **Review required** - All PRs need approval before merge
- **Audit trail** - All actions logged in GitHub Actions

## Documentation

See [../docs/HIVEMIND.md](../docs/HIVEMIND.md) for complete documentation including:

- Architecture overview
- Security model
- Entity system details
- Task planning guide
- Usage examples
- Troubleshooting

## Quick Reference

### Entity States

- **Baseline (default)**: All permissions disabled, safe for version control
- **Enabled**: Permissions granted, entity can perform actions

### Task States

- **disabled**: Task won't execute (default for safety)
- **enabled**: Task will execute when orchestrator runs
- **pending**: Task queued but not started
- **in_progress**: Task currently executing
- **completed**: Task finished successfully

### Path Validation

Before any task executes:

1. Target paths checked against `policy.yaml` denied patterns
2. Target paths validated against allowed patterns
3. Entity permissions verified
4. Task dispatched only if all checks pass

## Best Practices

1. **Start with dry run**: Always test with `dry_run: true` first
2. **Enable incrementally**: Activate one task at a time initially
3. **Review entity permissions**: Grant minimum required access
4. **Monitor PR activity**: Watch for unexpected changes
5. **Keep policies updated**: Regularly audit allow/deny rules
6. **Document custom tasks**: Add clear descriptions to plan.yaml

## Maintenance

### Adding New Entities

1. Create new YAML file in `entities/`
2. Follow existing entity structure
3. Start with all permissions disabled
4. Document entity purpose and role

### Adding New Tasks

1. Edit `plan.yaml`
2. Add task with unique ID
3. Assign appropriate entities
4. Specify target paths
5. Set `enabled: false` initially
6. Test with dry run before enabling

### Updating Policies

1. Edit `policy.yaml`
2. Add/remove allowed/denied paths
3. Update patterns as needed
4. Test changes with dry run
5. Commit and monitor results

---

**Note**: This directory is version controlled. Never commit secrets, tokens, or sensitive credentials here.
