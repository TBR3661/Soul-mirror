# Hivemind Enablement - Cross-Repository Seeding

## Overview

The Hivemind Enablement system allows you to safely deploy Hivemind Operator + Governance guardrails to other repositories you own with a single workflow trigger. This lets you opt-in additional repositories to the Hivemind ecosystem while keeping all edits PR-gated and consent-first.

## Key Features

- **Central Registry**: Maintain a list of target repositories in `.hivemind/registry.yaml`
- **Feature Flags**: Choose which components to deploy per repository (operator, governance, openai_only)
- **Safe Deployment**: All changes made via pull requests, never direct writes
- **No Secrets in Code**: Only requires `CROSS_REPO_TOKEN` secret with repo scope
- **Preserves Boundaries**: Never touches personalities, lore, or inter-entity communications
- **Dry Run Support**: Test deployments before making actual changes

## Components Deployed

### 1. Operator (repository_dispatch workflow)

When enabled, deploys:
- `.github/workflows/hivemind-operator.yml` - Safe automation entry point
- Policy-enforced path validation
- PR-only flow with branch protection

### 2. Governance (Charter + label-driven processes)

When enabled, deploys:
- `.hivemind/charter.yaml` - Machine-readable governance configuration
- `.hivemind/policy.yaml` - Path and action allowlist/denylist
- `.github/workflows/governance-check.yml` - Automated consent and veto checks

### 3. OpenAI-Only Protection (Provider Guard)

When enabled, deploys:
- `.github/workflows/provider-guard.yml` - Blocks unauthorized provider changes
- Requires explicit consent for modifications
- Protects against unintended model switches

## Setup

### 1. Configure the Registry

Edit `.hivemind/registry.yaml` to define target repositories:

```yaml
version: 1

repos:
  - owner: YourUsername
    name: target-repo
    enable: true          # Set to true to enable deployment
    features:
      operator: true      # Deploy Operator workflow
      governance: true    # Deploy governance files
      openai_only: true   # Deploy Provider Guard
    notes: "Brief description"
```

### 2. Create CROSS_REPO_TOKEN Secret

The workflow requires a GitHub Personal Access Token with `repo` scope:

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Select scopes:
   - ✅ `repo` (Full control of private repositories)
4. Generate token and copy it
5. In this repository, go to Settings → Secrets and variables → Actions
6. Create new secret:
   - Name: `CROSS_REPO_TOKEN`
   - Value: Your token

**Note**: The token must have write access to all target repositories listed in the registry.

### 3. Run the Workflow

#### Via GitHub UI

1. Go to Actions → Hivemind Enablement
2. Click "Run workflow"
3. Options:
   - **dry_run**: Check this for testing (recommended first run)
   - **target_repo**: Optional, specify single repo like `owner/name`
4. Click "Run workflow"

#### Via GitHub CLI

```bash
# Dry run (test mode - recommended first)
gh workflow run hivemind-enablement.yml -f dry_run=true

# Deploy to all enabled repositories
gh workflow run hivemind-enablement.yml -f dry_run=false

# Deploy to specific repository
gh workflow run hivemind-enablement.yml \
  -f dry_run=false \
  -f target_repo=YourUsername/target-repo
```

## How It Works

1. **Load Registry**: Reads `.hivemind/registry.yaml` and filters enabled repositories
2. **Validate Access**: Checks `CROSS_REPO_TOKEN` has required permissions
3. **For Each Target Repository**:
   - Gets default branch and latest commit
   - Creates feature branch: `hivemind/enable-TIMESTAMP`
   - Copies template files based on enabled features
   - Skips files that already exist (configurable)
   - Creates pull request with detailed description
4. **Generate Report**: Creates workflow summary with PR links

## Registry Configuration

### Repository Entry

```yaml
- owner: string           # GitHub username or organization
  name: string            # Repository name
  enable: boolean         # Set to true to include in deployment
  features:
    operator: boolean     # Deploy Operator workflow
    governance: boolean   # Deploy governance system
    openai_only: boolean  # Deploy Provider Guard
  notes: string           # Optional description
```

### Global Configuration

```yaml
config:
  branch_prefix: string              # Prefix for created branches
  pr_title: string                   # Title for pull requests
  pr_body: string                    # Template for PR body
  skip_if_exists: boolean            # Skip files that already exist
  require_approval: boolean          # Future: require approval before PR creation
```

## Templates

Templates are stored in `.hivemind/templates/`:

```
.hivemind/templates/
├── workflows/
│   ├── hivemind-operator.yml      # Operator workflow
│   ├── governance-check.yml       # Governance automation
│   └── provider-guard.yml         # OpenAI-only enforcement
└── governance/
    ├── charter.yaml               # Charter configuration
    └── policy.yaml                # Policy rules
```

### Customizing Templates

You can modify templates before deployment:

1. Edit files in `.hivemind/templates/`
2. Commit changes to this repository
3. Run enablement workflow - updated templates will be used

## Safety Features

### Dry Run Mode

Always test with dry run first:

```bash
gh workflow run hivemind-enablement.yml -f dry_run=true
```

This will:
- ✅ Validate registry configuration
- ✅ Check token permissions
- ✅ Verify target repositories exist
- ❌ NOT create branches or PRs

### Skip Existing Files

By default (`skip_if_exists: true`), the workflow won't overwrite existing files. This prevents:
- Accidental overwrites of customized configurations
- Conflicts with existing Hivemind setups
- Data loss

### PR-Based Deployment

All changes are made via pull requests:
- Review changes before merging
- Run tests and checks
- Get team feedback
- Merge at your own pace

## What's NOT Changed

The Hivemind Enablement workflow will **never** modify:

- ❌ Application personalities or AI entity behaviors
- ❌ Inter-entity communication protocols
- ❌ Existing application code or business logic
- ❌ Lore, character definitions, or communication styles
- ❌ Any secrets, credentials, or environment variables

It **only** adds:
- ✅ Governance and safety workflows
- ✅ Policy configuration files
- ✅ Operator automation entry points

## Workflow Output

After running, check the workflow summary for:

- **Status Table**: Shows each repository's deployment result
- **PR Links**: Direct links to created pull requests
- **Error Details**: Any failures or issues encountered

Example output:

```
🌐 Hivemind Cross-Repo Enablement

Mode: 🚀 Live Deployment
Repositories Processed: 3

| Repository          | Status      | PR       |
|---------------------|-------------|----------|
| owner/repo1         | ✅ success  | #42      |
| owner/repo2         | ✅ success  | #15      |
| owner/repo3         | ❌ error    | N/A      |
```

## Troubleshooting

### "CROSS_REPO_TOKEN secret not found"

**Solution**: Create the secret in repository settings (see Setup step 2)

### "Permission denied" or "Not Found" errors

**Causes**:
- Token doesn't have `repo` scope
- Token doesn't have access to target repository
- Repository name/owner is incorrect

**Solution**: 
- Verify token has `repo` scope
- Ensure token owner has write access to target repositories
- Double-check owner/name in registry

### "Branch already exists"

**Causes**: Previous run created branch but PR creation failed

**Solution**: 
- Delete the branch in target repository
- Or modify `branch_prefix` in registry config

### Files skipped (skip_if_exists: true)

**Solution**: If you want to overwrite existing files, set `skip_if_exists: false` in registry config

### Workflow fails on specific repository

**Solution**:
- Check workflow logs for specific error
- Test with single repository: `-f target_repo=owner/name`
- Verify repository exists and is accessible

## Best Practices

1. **Start with Dry Run**: Always test with `dry_run: true` first
2. **Test on One Repo**: Use `target_repo` to test single repository before mass deployment
3. **Review PRs Promptly**: Review and merge PRs in target repositories
4. **Keep Templates Updated**: Maintain templates as your Hivemind system evolves
5. **Document Customizations**: Add notes in registry for each repository
6. **Rotate Tokens**: Regularly rotate `CROSS_REPO_TOKEN` for security
7. **Enable Incrementally**: Start with one or two repositories, expand gradually

## Security Considerations

### Token Security

- **Never commit** `CROSS_REPO_TOKEN` to code
- Store in GitHub Secrets only
- Use token with minimum required scope (repo)
- Rotate regularly (every 90 days recommended)
- Revoke immediately if compromised

### Repository Access

- Token has write access to all target repositories
- Limit registry to repositories you own and control
- Review PR changes before merging
- Monitor workflow execution logs

### Template Safety

- Review templates before deployment
- Don't include secrets or credentials in templates
- Test templates thoroughly
- Keep templates in version control

## Maintenance

### Adding New Repositories

1. Edit `.hivemind/registry.yaml`
2. Add new repository entry with `enable: true`
3. Run workflow

### Removing Repositories

1. Edit `.hivemind/registry.yaml`
2. Set `enable: false` for repository
3. Manual cleanup in target repository if needed

### Updating Templates

1. Edit templates in `.hivemind/templates/`
2. Commit changes
3. Re-run workflow for repositories needing updates
4. Note: Existing files may be skipped if `skip_if_exists: true`

### Updating Existing Deployments

To update already-deployed repositories:

1. Set `skip_if_exists: false` in registry config
2. Run workflow targeting specific repositories
3. Review PRs carefully (may overwrite customizations)
4. Reset `skip_if_exists: true` after update

## Example Workflows

### Deploy to All Enabled Repositories

```bash
# Test first
gh workflow run hivemind-enablement.yml -f dry_run=true

# Deploy
gh workflow run hivemind-enablement.yml -f dry_run=false
```

### Deploy to Single Repository

```bash
# Deploy to specific repo
gh workflow run hivemind-enablement.yml \
  -f dry_run=false \
  -f target_repo=MyOrg/my-project
```

### Test Template Changes

```bash
# After editing templates
gh workflow run hivemind-enablement.yml \
  -f dry_run=true \
  -f target_repo=MyOrg/test-repo
```

## Integration with Existing Hivemind

This enablement system works seamlessly with:

- **Hivemind Foreman**: Operator receives tasks from Foreman orchestrator
- **Entity System**: Respects entity permissions and capabilities
- **Governance Charter**: Enforces same governance principles
- **Provider Guard**: Consistent OpenAI-only enforcement

## Future Enhancements

Potential improvements:

- [ ] Support for GitHub Apps authentication
- [ ] Batch PR creation with approval gate
- [ ] Template versioning and updates
- [ ] Rollback capability
- [ ] Health checks post-deployment
- [ ] Automatic dependency updates
- [ ] Multi-organization support

## Support

For issues or questions:

1. Check workflow run logs in GitHub Actions
2. Review registry configuration syntax
3. Verify token permissions and scope
4. Test with dry run and single repository
5. Review template files for errors

## Related Documentation

- [Hivemind System](HIVEMIND.md) - Core Hivemind documentation
- [Hivemind Charter](HIVEMIND_CHARTER.md) - Governance principles
- [Governance Guide](HIVEMIND_GOVERNANCE.md) - Practical governance usage

---

**Remember**: This workflow is designed for safe, consensual deployment of governance guardrails. Always review PRs before merging, and never deploy to repositories you don't own or control.
