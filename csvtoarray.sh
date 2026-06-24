#!/usr/bin/env bash

set -euo pipefail

CSV="${1:?Usage: ./gen-words.sh <file.csv> [EXPORT_NAME] [colN]}"
NAME="${2:-VALID_GUESSES}"
COL="${3:-col1}"

COLNUM="${COL#col}"

if [[ ! -f "$CSV" ]]; then
  echo "error: file not found: $CSV" >&2
  exit 1
fi

words=$(
  cut -d',' -f"$COLNUM" "$CSV" \
    | tr -d '\r"' \
    | tr '[:upper:]' '[:lower:]' \
    | sed 's/^[[:space:]]*//; s/[[:space:]]*$//' \
    | grep -E '^[a-z]{5}$' \
    | sort -u
)

count=$(printf '%s\n' "$words" | grep -c . || true)

{
  echo "// ${count} words generated from $(basename "$CSV")"
  echo "export const ${NAME} = ["
  printf '%s\n' "$words" \
    | awk '{ printf "\"%s\", ", $0; if (NR % 8 == 0) printf "\n" }' \
    | sed 's/^/  /; s/[[:space:]]*$//'
  echo ""
  echo "];"
} 

echo "" >&2
echo "Done: $count unique 5-letter words." >&2
