#!/usr/bin/env bash
# =============================================================================
# purge-imageFallback-js.sh
#
# PURPOSE:
#   Completely remove the stale `src/lib/imageFallback.js` ghost file from
#   Git's index (staging area / object cache) WITHOUT deleting it from disk,
#   then commit the removal so Vercel's build machine pulls a clean tree that
#   contains only `imageFallback.ts`.
#
# WHY THIS IS NECESSARY:
#   Git tracks files by their exact path including extension. When you rename
#   or replace `imageFallback.js` with `imageFallback.ts`, Git (especially on
#   case-insensitive file systems like macOS and Windows NTFS) may keep the
#   old `.js` entry alive in its index even after you've written the new `.ts`
#   file. Vercel clones your repository from that index, so Rollup/Vite sees
#   BOTH files and resolves bare `./imageFallback` imports to the `.js` one
#   (because `.js` sorts before `.ts` in Vite's default resolve order), making
#   `svgPlaceholder` appear unexported from the consumer's perspective.
#
#   `git rm --cached` removes the file from the index without touching the
#   working tree. After the subsequent commit + push, the remote HEAD no longer
#   contains `imageFallback.js`, so Vercel's fresh clone is clean.
#
# PREREQUISITES:
#   • Run from the repository root (the directory containing .git/).
#   • `imageFallback.ts` must already be present in `src/lib/` and staged or
#     committed — do NOT run this script before placing the new .ts file.
#   • Git version ≥ 2.25 (ships with all current macOS/Linux/Windows tooling).
#
# USAGE:
#   chmod +x purge-imageFallback-js.sh
#   ./purge-imageFallback-js.sh
# =============================================================================

set -euo pipefail   # exit on error, unset variable, or pipe failure

# ─── Step 0: Confirm we are in a Git repository ───────────────────────────────
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
  echo "❌  ERROR: Not inside a Git repository. Run this script from the project root."
  exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
echo "✅  Repository root: ${REPO_ROOT}"

# ─── Step 1: Confirm the new .ts file exists before we remove anything ────────
TS_FILE="${REPO_ROOT}/src/lib/imageFallback.ts"
if [[ ! -f "${TS_FILE}" ]]; then
  echo "❌  ERROR: ${TS_FILE} not found."
  echo "    Place the new imageFallback.ts in src/lib/ before running this script."
  exit 1
fi
echo "✅  New file confirmed: src/lib/imageFallback.ts"

# ─── Step 2: Check whether the old .js file is tracked by Git ─────────────────
JS_TRACKED=$(git ls-files --error-unmatch "src/lib/imageFallback.js" 2>/dev/null && echo "yes" || echo "no")

if [[ "${JS_TRACKED}" == "no" ]]; then
  echo "ℹ️   src/lib/imageFallback.js is not currently tracked by Git — nothing to purge."
  echo "    If Vercel still resolves the wrong file, ensure imageFallback.ts is committed:"
  echo "      git add src/lib/imageFallback.ts"
  echo "      git commit -m 'refactor: migrate imageFallback.js → imageFallback.ts'"
  echo "      git push"
  exit 0
fi

echo "⚠️   src/lib/imageFallback.js is tracked — purging from Git index now..."

# ─── Step 3: Remove the .js file from Git's index (staging area) ──────────────
# --cached  → remove from index only; do NOT delete the file from disk.
# -f        → force removal even if the file has local modifications staged.
#             (We want a clean index regardless of working-tree state.)
git rm --cached -f "src/lib/imageFallback.js"
echo "✅  Removed src/lib/imageFallback.js from Git index (file kept on disk)."

# ─── Step 4: Stage the new .ts file (idempotent — safe if already staged) ─────
git add "src/lib/imageFallback.ts"
echo "✅  Staged src/lib/imageFallback.ts."

# ─── Step 5: Also ensure contentManager.ts is staged with the corrected import ─
if git ls-files --error-unmatch "src/lib/contentManager.ts" > /dev/null 2>&1; then
  git add "src/lib/contentManager.ts"
  echo "✅  Staged src/lib/contentManager.ts."
fi

# ─── Step 6: Commit ────────────────────────────────────────────────────────────
git commit -m "refactor: purge stale imageFallback.js — migrate to imageFallback.ts

- Remove imageFallback.js from Git tracking (git rm --cached) so Vite/Rollup
  on the Vercel build machine no longer resolves bare './imageFallback' imports
  to the old .js module.
- imageFallback.ts exports svgPlaceholder(), installImageFallback(), and
  ImageFallbackOptions with full strict TypeScript and XML-safe SVG sanitisation.
- contentManager.ts import path './imageFallback' now unambiguously resolves
  to imageFallback.ts (the only matching module in Git's index).

Fixes Vercel build error:
  src/lib/contentManager.ts (21:9): 'svgPlaceholder' is not exported by
  'src/lib/imageFallback.js', imported by 'src/lib/contentManager.ts'."

echo "✅  Committed."

# ─── Step 7: Push to the remote branch Vercel is watching ─────────────────────
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "🚀  Pushing branch '${CURRENT_BRANCH}' to origin..."
git push origin "${CURRENT_BRANCH}"

echo ""
echo "============================================================"
echo "  ✅  Done. Vercel will now trigger a clean build."
echo "  The Rollup module graph will resolve './imageFallback'"
echo "  exclusively to imageFallback.ts and find svgPlaceholder"
echo "  correctly exported at the top level."
echo "============================================================"
