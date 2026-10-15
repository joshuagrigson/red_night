#!/bin/bash
# Top-level names defined in more than one place across the concatenated sources (later definitions silently win).
cd "$(dirname "$0")/.."
grep -nE "^(async )?function [A-Za-z0-9_\$]+|^(const|let|var|class) [A-Za-z0-9_\$]+" src/*.js \
 | sed -E 's/^([^:]+):([0-9]+):(async )?(function|const|let|var|class) ([A-Za-z0-9_$]+).*/\5 \1:\2/' \
 | sort | awk '{n[$1]++; w[$1]=w[$1]" "$2} END{for(k in n) if(n[k]>1) print k":"w[k]}'
