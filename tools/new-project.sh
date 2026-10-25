#!/usr/bin/env bash
# Usage: tools/new-project.sh "Názov projektu"
set -euo pipefail
title="${1:?Usage: tools/new-project.sh \"Názov projektu\"}"
type="${2:-plagat}"
grep -q "key: $type\$" "$(dirname "$0")/../_data/types.yml" || { echo "Unknown type '$type'. Add it to _data/types.yml first."; exit 1; }

slug=$(python3 - "$title" <<'PY'
import re, sys, unicodedata
s = unicodedata.normalize('NFKD', sys.argv[1]).encode('ascii', 'ignore').decode().lower()
print(re.sub(r'[^a-z0-9]+', '-', s).strip('-'))
PY
)
root="$(cd "$(dirname "$0")/.." && pwd)"
file="$root/_projects/$slug.md"
[ -e "$file" ] && { echo "Already exists: $file"; exit 1; }

sed -e "s|^title: .*|title: \"$title\"|" \
    -e "s|^type: video |type: $type |" \
    -e "s|^date: .*|date: $(date +%Y-%m-%d)       # rok sa zobrazí v zozname; projekt s budúcim dátumom sa nezobrazí|" \
    "$root/_templates/project.md" > "$file"
echo "Created $file"
