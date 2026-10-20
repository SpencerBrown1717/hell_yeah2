#!/usr/bin/env bash
# Optional one-time mirror after the owner completes GitHub authentication.
# Keeps the existing Sites origin intact; never force pushes.
set -euo pipefail
project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${project_root}"
command -v gh >/dev/null || { echo 'Install GitHub CLI, then run gh auth login.' >&2; exit 69; }
gh auth status >/dev/null 2>&1 || { echo 'Complete gh auth login before running this command.' >&2; exit 77; }
[[ "$(gh api user --jq .login)" == "SpencerBrown1717" ]] || { echo 'The authenticated GitHub account must be SpencerBrown1717.' >&2; exit 77; }
[[ -z "$(git status --porcelain)" ]] || { echo 'Commit the reviewed source changes before mirroring.' >&2; exit 65; }
target='SpencerBrown1717/hell_yeah2'
if ! gh repo view "${target}" --json nameWithOwner >/dev/null 2>&1; then
  gh repo create "${target}" --private --description 'Hellyeah autonomous growth OS and connected research products'
fi
[[ "$(gh repo view "${target}" --json visibility --jq .visibility)" == "PRIVATE" ]] || { echo 'Expected a private destination. Review repository visibility before pushing.' >&2; exit 77; }
if git remote get-url github >/dev/null 2>&1; then
  github_url="$(git remote get-url github)"
  [[ "${github_url}" == "https://github.com/${target}.git" || "${github_url}" == "git@github.com:${target}.git" ]] || { echo 'Existing github remote does not match the expected destination.' >&2; exit 65; }
else
  git remote add github "https://github.com/${target}.git"
fi
git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push github HEAD:refs/heads/main
echo 'Pushed the reviewed commit to the private hell_yeah2 GitHub repository.'
