# Hivemind Templates

This directory contains reusable templates for deploying Hivemind components to other repositories.

## Structure

```
templates/
├── workflows/              # GitHub Actions workflow templates
│   ├── hivemind-operator.yml      # Operator workflow (repository_dispatch handler)
│   ├── governance-check.yml       # Governance automation (consent/veto)
│   └── provider-guard.yml         # OpenAI-only enforcement
├── governance/             # Governance configuration templates
│   ├── charter.yaml              # Charter configuration
│   └── policy.yaml               # Policy rules (allowlist/denylist)
└── README.md              # This file
```

## Usage

Templates are automatically deployed by the [Hivemind Enablement workflow](../../.github/workflows/hivemind-enablement.yml) based on feature flags in the registry.

### Feature Mapping

| Feature Flag | Files Deployed |
|-------------|----------------|
| `operator: true` | `workflows/hivemind-operator.yml` |
| `governance: true` | `workflows/governance-check.yml`<br>`governance/charter.yaml`<br>`governance/policy.yaml` |
| `openai_only: true` | `workflows/provider-guard.yml` |

## Customizing Templates

You can modify templates before deployment:

1. Edit the template files in this directory
2. Commit changes to the repository
3. Run the Hivemind Enablement workflow
4. Updated templates will be deployed to target repositories

### Template Variables

Currently, templates are deployed as-is without variable substitution. Future versions may support placeholders like:

- `{REPO_OWNER}` - Repository owner
- `{REPO_NAME}` - Repository name
- `{DEFAULT_BRANCH}` - Default branch name

## Template Descriptions

### workflows/hivemind-operator.yml

**Purpose**: Safe automation entry point via repository_dispatch events

**Features**:
- Receives task payloads from Foreman orchestrator
- Validates paths against policy configuration
- Creates PRs based on task requirements
- Supports manual trigger for testing

**Required Files**: `.hivemind/policy.yaml` (optional)

### workflows/governance-check.yml

**Purpose**: Automated governance enforcement

**Features**:
- Detects `affects:user:{username}` labels
- Tracks consent/veto responses
- Posts status comments on PRs
- Blocks PRs with active vetoes
- Supports council advisory process

**Required Files**: `.hivemind/charter.yaml`

### workflows/provider-guard.yml

**Purpose**: OpenAI-only enforcement

**Features**:
- Detects provider configuration changes
- Requires explicit consent for modifications
- Posts warning comments on PRs
- Blocks unauthorized provider changes

**Dependencies**: None (standalone)

### governance/charter.yaml

**Purpose**: Machine-readable governance configuration

**Contains**:
- Core governance principles
- Veto and consent processes
- Label schema definitions
- Workflow settings

**Used By**: `governance-check.yml` workflow

### governance/policy.yaml

**Purpose**: Path and action restrictions

**Contains**:
- Allowed/denied paths
- File pattern rules
- Action permissions
- Safety limits

**Used By**: `hivemind-operator.yml` workflow

## Adding New Templates

To add a new template:

1. Create the template file in the appropriate directory
2. Update `.hivemind/registry.yaml` to add a new feature flag (optional)
3. Update `.github/workflows/hivemind-enablement.yml` to deploy the new template
4. Document the template in this README

## Best Practices

1. **Test Templates**: Test on a single repository before mass deployment
2. **Keep Generic**: Templates should work for any repository
3. **Document Dependencies**: Note required files or configurations
4. **Version Control**: All changes to templates should be committed
5. **Backward Compatibility**: Avoid breaking changes to existing deployments

## Testing Templates

To test template changes:

```bash
# Dry run with specific repository
gh workflow run hivemind-enablement.yml \
  -f dry_run=true \
  -f target_repo=owner/test-repo

# Deploy to test repository
gh workflow run hivemind-enablement.yml \
  -f dry_run=false \
  -f target_repo=owner/test-repo
```

## Maintenance

### Updating Deployed Templates

To update templates in already-deployed repositories:

1. Edit templates in this directory
2. Set `skip_if_exists: false` in `.hivemind/registry.yaml`
3. Run enablement workflow
4. Review PRs in target repositories
5. Merge updates
6. Reset `skip_if_exists: true`

**Warning**: Setting `skip_if_exists: false` will overwrite existing files, potentially losing customizations.

## Related Documentation

- [Hivemind Enablement Guide](../../docs/HIVEMIND_ENABLEMENT.md)
- [Hivemind System Documentation](../../docs/HIVEMIND.md)
- [Registry Configuration](../registry.yaml)

---

**Note**: Templates should never contain secrets, credentials, or repository-specific configurations. Keep them generic and reusable.
