#!/usr/bin/env bash
# Stop hook: block the turn while scripts/check-rules.sh reports drift.
set -u
input=$(cat)
case "$input" in *'"stop_hook_active":true'*) exit 0;; esac
out=$("${CLAUDE_PROJECT_DIR:-.}/scripts/check-rules.sh" 2>&1) && exit 0
printf 'scripts/check-rules.sh failed. Fix the drift or, if it is intended, change the expected value in the script.\n%s\n' "$out" >&2
exit 2
