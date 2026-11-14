#!/usr/bin/env bash
set -euo pipefail
tag=production-backup-0.21.0-20261114-ffa62be
target=ffa62be7404559a51157a86efbc3785b7dece82a
if gh release view "$tag" --json isDraft > "$RUNNER_TEMP/backup-release.json" 2>/dev/null; then
  # An existing backup is immutable, including its checksums. Never clobber it.
  folder="$RUNNER_TEMP/existing-production-backup"
  mkdir -p "$folder"
  gh release download "$tag" --dir "$folder"
  cmp artifacts/published-before-0213.tar.gz.sha256 "$folder/published-before-0213.tar.gz.sha256"
  cmp artifacts/production-before-0213.json "$folder/production-before-0213.json"
  (cd "$folder" && sha256sum --check published-before-0213.tar.gz.sha256)
else
  gh release create "$tag" --target "$target" --draft --title 'Recovery point: production 0.21.0 and test 0.21.1–0.21.3' --notes-file docs/ROLLBACK-0213.md
  gh release upload "$tag" artifacts/published-before-0213.tar.gz artifacts/published-before-0213.tar.gz.sha256 artifacts/production-before-0213.json
fi
gh release view "$tag" --json url,isDraft,targetCommitish >> "$GITHUB_STEP_SUMMARY"
