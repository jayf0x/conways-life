#!/usr/bin/env bash
set -euo pipefail

# Prints the values for npmjs.com's "Add trusted publisher" form (Settings → Publishing access),
# read from this repo, so filling it in is copy-paste instead of lookup. npm has no API for this
# step — it's a one-time, per-package, web-only form (confirmed against npm's trusted-publishers
# docs, no org/scope-level config exists).

NAME=$(node -p "require('./package.json').name")
REMOTE=$(git remote get-url origin)
ORG_REPO=$(echo "$REMOTE" | sed -E 's#(git@github\.com:|https://github\.com/)##; s#\.git$##')

echo "https://www.npmjs.com/package/$NAME/access"
echo ""
echo "Publisher:              GitHub Actions"
echo "Organization or user:    ${ORG_REPO%%/*}"
echo "Repository:              ${ORG_REPO##*/}"
echo "Workflow filename:       publish.yml"
echo "Environment name:        (blank, unless the workflow sets 'environment:')"
echo "Allowed actions:         Publish"
