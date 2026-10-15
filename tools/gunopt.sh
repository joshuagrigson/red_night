#!/bin/bash
# usage: gunopt.sh id...   raw/rn_<id>.glb -> opt/rn_<id>.glb (meshopt, webp 1024)
cd "$(dirname "$0")/.."
for id in "$@"; do npx gltf-transform optimize raw/rn_$id.glb opt/rn_$id.glb --compress meshopt --texture-compress webp --texture-size 1024 --simplify false >/dev/null 2>&1 && echo "$id $(stat -c%s opt/rn_$id.glb)" || echo "FAIL $id"; done
