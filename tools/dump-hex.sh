#!/usr/bin/env sh

# Usage: ./dump.sh input.bin output.txt

input="$1"
output="$2"
# Convert to hex (no spaces, lowercase), then add a backslash before each byte
hex=$(xxd -p -c 256 "$input" | tr -d '\n' | sed 's/../\\&/g')

printf "%s" "$hex" > "$output"