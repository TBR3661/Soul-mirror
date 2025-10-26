# Hivemind Operator

The Hivemind Operator is a secure automation system that allows trusted tools (phone assistants, hivemind systems) to request repository edits via GitHub's `repository_dispatch` events.

## Features

- ✅ Secure file operations with allow/deny lists
- ✅ Automatic branch creation with timestamps
- ✅ Pull request generation for review
- ✅ Comprehensive validation and error handling
- ✅ Protection of sensitive areas (workflows, secrets, etc.)

## Security

### Protected Areas (Deny List)
The following paths are **forbidden** and cannot be modified:
- `.github/workflows/` - Workflow files
- `.github/operator/` - Operator scripts
- `.git/` - Git repository metadata
- `node_modules/` - Dependencies
- `.env` - Environment files
- `secrets` - Secret files

### Allowed Areas
The following paths **can** be modified:
- `src/` - Source code
- `public/` - Public assets
- `README.md` - Documentation
- `package.json` - Package manifest
- `tsconfig.json` - TypeScript config
- `vite.config.ts` - Vite config
- `index.tsx` - Entry point

## Usage

### Triggering via GitHub API

Send a `repository_dispatch` event with event type `hivemind-task`:

```bash
curl -X POST \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Authorization: token YOUR_GITHUB_TOKEN" \
  https://api.github.com/repos/OWNER/REPO/dispatches \
  -d '{
    "event_type": "hivemind-task",
    "client_payload": {
      "task": "update_files",
      "description": "Update homepage content",
      "files": [
        {
          "path": "src/pages/Home.tsx",
          "content": "export default function Home() { return <h1>Hello World</h1>; }",
          "operation": "upsert"
        }
      ]
    }
  }'
```

### Payload Structure

#### Update Files Task

```json
{
  "task": "update_files",
  "description": "Description of changes (optional)",
  "files": [
    {
      "path": "relative/path/to/file.txt",
      "content": "file content here",
      "operation": "upsert"
    }
  ]
}
```

#### Operations

- `upsert` (default) - Create or update a file
- `delete` - Delete a file (no content needed)

#### Example: Multiple File Updates

```json
{
  "task": "update_files",
  "description": "Update multiple components",
  "files": [
    {
      "path": "src/components/Header.tsx",
      "content": "// Header component code",
      "operation": "upsert"
    },
    {
      "path": "src/components/Footer.tsx",
      "content": "// Footer component code",
      "operation": "upsert"
    },
    {
      "path": "src/deprecated/OldComponent.tsx",
      "operation": "delete"
    }
  ]
}
```

## Workflow Behavior

1. **Validation** - Validates the payload structure
2. **Security Check** - Verifies all file paths against allow/deny lists
3. **Apply Changes** - Creates, updates, or deletes files as requested
4. **Branch Creation** - Creates a new branch with format `ops/YYYYmmdd-HHMMSS-hivemind`
5. **Commit & Push** - Commits changes and pushes to the new branch
6. **Pull Request** - Automatically creates a PR for review

## Testing

### Test the apply.js script locally

```bash
# Create a test payload
cat > /tmp/test-payload.json << 'EOF'
{
  "task": "update_files",
  "description": "Test update",
  "files": [
    {
      "path": "src/test.txt",
      "content": "Test content"
    }
  ]
}
EOF

# Run the script
PAYLOAD=$(cat /tmp/test-payload.json) node .github/operator/apply.js
```

### Test deny list protection

```bash
cat > /tmp/test-deny.json << 'EOF'
{
  "task": "update_files",
  "files": [
    {
      "path": ".github/workflows/dangerous.yml",
      "content": "This should be denied"
    }
  ]
}
EOF

PAYLOAD=$(cat /tmp/test-deny.json) node .github/operator/apply.js
```

Expected output: `❌ DENIED: .github/workflows/dangerous.yml (security policy)`

## Permissions

The workflow requires:
- `contents: write` - To create branches and commit changes
- `pull-requests: write` - To create pull requests

## Output

The operator generates:
- A new branch: `ops/YYYYmmdd-HHMMSS-hivemind`
- A pull request with detailed change summary
- A workflow summary with operation results
- An `operator-results.json` file (temporary, used for PR details)

## Error Handling

- Invalid payload structure → Workflow fails at validation step
- Denied file paths → Operation skipped, logged in results
- File operation errors → Logged but doesn't stop other operations
- No changes detected → Workflow completes without creating PR

## Extending

### Adding Allowed Paths

Edit `.github/operator/apply.js` and add to `ALLOW_LIST`:

```javascript
const ALLOW_LIST = [
  'src/',
  'public/',
  'docs/',  // Add new allowed path
  // ...
];
```

### Adding Denied Paths

Edit `.github/operator/apply.js` and add to `DENY_LIST`:

```javascript
const DENY_LIST = [
  '.github/workflows/',
  '.github/operator/',
  'private/',  // Add new denied path
  // ...
];
```

## Maintenance

The operator is designed to be minimal and self-contained. Regular maintenance:
1. Review and update allow/deny lists as needed
2. Monitor PR activity for unexpected behavior
3. Keep Node.js version updated in workflow (currently: 20)
4. Review security implications of any path changes
