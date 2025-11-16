# Release Process

This document describes the automated release process for GitForWriter.

## Prerequisites

Before creating a release, ensure the following secrets are configured in the GitHub repository:

### Required Secrets

1. **VSCE_PAT** - Visual Studio Code Marketplace Personal Access Token
   - Go to https://dev.azure.com/
   - Create a new Personal Access Token with `Marketplace > Manage` permission
   - Add it to GitHub repository secrets

2. **OVSX_PAT** (Optional) - Open VSX Registry Personal Access Token
   - Go to https://open-vsx.org/
   - Create an account and generate a token
   - Add it to GitHub repository secrets

### How to Add Secrets

1. Go to your GitHub repository
2. Navigate to `Settings` > `Secrets and variables` > `Actions`
3. Click `New repository secret`
4. Add the secret name and value

## Release Steps

### 1. Update Version and Changelog

Before creating a release, ensure:

- [ ] `package.json` version is updated
- [ ] `CHANGELOG.md` is updated with release notes
- [ ] All tests pass (`npm test`)
- [ ] Extension builds successfully (`npm run package`)

### 2. Create a Release Branch

```bash
# Create a release branch
git checkout -b release-v1.0.0

# Add all changes
git add .

# Commit changes
git commit -m "chore: prepare release v1.0.0"

# Push to remote
git push origin release-v1.0.0
```

### 3. Create a Pull Request

1. Go to GitHub repository
2. Create a Pull Request from `release-v1.0.0` to `main`
3. Wait for CI checks to pass
4. Get approval from reviewers
5. Merge the PR

### 4. Create a Git Tag

After the PR is merged to `main`:

```bash
# Switch to main branch
git checkout main

# Pull latest changes
git pull origin main

# Create a tag
git tag -a v1.0.0 -m "Release v1.0.0"

# Push the tag
git push origin v1.0.0
```

### 5. Automated Release Process

Once the tag is pushed, the GitHub Actions workflow will automatically:

1. ✅ Checkout code
2. ✅ Install dependencies
3. ✅ Run tests
4. ✅ Build extension
5. ✅ Package VSIX file
6. ✅ Create GitHub Release with release notes
7. ✅ Upload VSIX file to GitHub Release
8. ✅ Publish to VSCode Marketplace (if VSCE_PAT is configured)
9. ✅ Publish to Open VSX Registry (if OVSX_PAT is configured)

### 6. Verify Release

After the workflow completes:

1. Check GitHub Releases page
2. Verify VSIX file is attached
3. Check VSCode Marketplace (may take a few minutes)
4. Test installation: `code --install-extension gitforwriter-1.0.0.vsix`

## Troubleshooting

### Release Workflow Failed

1. Check the GitHub Actions logs
2. Common issues:
   - Missing secrets (VSCE_PAT, OVSX_PAT)
   - Test failures
   - Build errors
   - Invalid version format

### Marketplace Publication Failed

1. Verify VSCE_PAT is valid and has correct permissions
2. Check if the version already exists on the marketplace
3. Ensure `package.json` has all required fields

### Manual Publication

If automated publication fails, you can publish manually:

```bash
# Install vsce
npm install -g @vscode/vsce

# Login to marketplace
vsce login ydzat

# Publish
vsce publish
```

## Version Numbering

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** version (1.x.x): Incompatible API changes
- **MINOR** version (x.1.x): New features, backward compatible
- **PATCH** version (x.x.1): Bug fixes, backward compatible

## Release Checklist

- [ ] Version updated in `package.json`
- [ ] CHANGELOG.md updated
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Screenshots updated (if UI changed)
- [ ] Release branch created
- [ ] PR created and approved
- [ ] PR merged to main
- [ ] Git tag created and pushed
- [ ] GitHub Release created automatically
- [ ] VSIX uploaded to GitHub Release
- [ ] Extension published to Marketplace
- [ ] Installation tested
- [ ] Announcement posted (optional)

