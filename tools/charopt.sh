#!/bin/bash
# usage: charopt.sh <src.glb> <id>   -> rawc/rn_char_<id>_a.glb (copy), optc/char_<id>.glb (meshopt, webp 1024, no anims)
set -e; cd "$(dirname "$0")/.."
cp "$1" rawc/rn_char_$2_a.glb; chmod 444 rawc/rn_char_$2_a.glb
npx gltf-transform optimize rawc/rn_char_$2_a.glb /tmp/co_$2.glb --compress meshopt --texture-compress webp --texture-size 1024 --simplify false >/dev/null 2>&1
node tools/stripanim.mjs /tmp/co_$2.glb optc/char_$2.glb
node tools/tris.mjs optc/char_$2.glb
