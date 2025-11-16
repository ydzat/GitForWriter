#!/bin/bash

# GitForWriter Release Script
# This script helps create a new release

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if version is provided
if [ -z "$1" ]; then
    print_error "Version number is required"
    echo "Usage: ./scripts/create-release.sh <version>"
    echo "Example: ./scripts/create-release.sh 1.0.0"
    exit 1
fi

VERSION=$1
TAG="v${VERSION}"

print_info "Creating release for version ${VERSION}"

# Check if we're on a clean working directory
if [ -n "$(git status --porcelain)" ]; then
    print_warning "Working directory is not clean"
    git status --short
    read -p "Do you want to continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Release cancelled"
        exit 1
    fi
fi

# Check if tag already exists
if git rev-parse "$TAG" >/dev/null 2>&1; then
    print_error "Tag ${TAG} already exists"
    exit 1
fi

# Verify package.json version matches
PACKAGE_VERSION=$(node -p "require('./package.json').version")
if [ "$PACKAGE_VERSION" != "$VERSION" ]; then
    print_error "Version mismatch: package.json has ${PACKAGE_VERSION}, but you specified ${VERSION}"
    exit 1
fi

print_info "Version in package.json: ${PACKAGE_VERSION} ✓"

# Run tests
print_info "Running tests..."
npm run test:unit:compiled || {
    print_error "Tests failed"
    exit 1
}
print_info "Tests passed ✓"

# Build extension
print_info "Building extension..."
npm run compile || {
    print_error "Build failed"
    exit 1
}
print_info "Build successful ✓"

# Package extension
print_info "Packaging extension..."
npm run package || {
    print_error "Packaging failed"
    exit 1
}
print_info "Packaging successful ✓"

# Verify VSIX file exists
VSIX_FILE="gitforwriter-${VERSION}.vsix"
if [ ! -f "$VSIX_FILE" ]; then
    print_error "VSIX file not found: ${VSIX_FILE}"
    exit 1
fi
print_info "VSIX file created: ${VSIX_FILE} ✓"

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
print_info "Current branch: ${CURRENT_BRANCH}"

# Confirm release
echo ""
print_warning "Ready to create release ${TAG}"
echo "  Version: ${VERSION}"
echo "  Branch: ${CURRENT_BRANCH}"
echo "  VSIX: ${VSIX_FILE}"
echo ""
read -p "Do you want to create the tag and push? (y/n) " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_error "Release cancelled"
    exit 1
fi

# Create tag
print_info "Creating tag ${TAG}..."
git tag -a "$TAG" -m "Release ${VERSION}"
print_info "Tag created ✓"

# Push tag
print_info "Pushing tag to origin..."
git push origin "$TAG"
print_info "Tag pushed ✓"

echo ""
print_info "Release ${TAG} created successfully! 🎉"
echo ""
print_info "Next steps:"
echo "  1. GitHub Actions will automatically create a release"
echo "  2. Check the release at: https://github.com/ydzat/GitForWriter/releases/tag/${TAG}"
echo "  3. Verify the extension is published to VSCode Marketplace"
echo ""

