#!/usr/bin/env bash
# Kullanım: report-issue.sh <başlık> <gövde>
# "tarama-hatasi" etiketli açık bir issue varsa yorum ekler, yoksa yenisini açar.
set -euo pipefail
title="$1"
body="$2"
gh label create tarama-hatasi --color b60205 --description "Günlük tarama veya sağlık kontrolü başarısız" 2>/dev/null || true
existing=$(gh issue list --label tarama-hatasi --state open --json number --jq '.[0].number // empty')
if [ -n "$existing" ]; then
  gh issue comment "$existing" --body "$body"
else
  gh issue create --title "$title" --label tarama-hatasi --body "$body"
fi
