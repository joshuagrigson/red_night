#!/usr/bin/env python3
"""Fetch Poly Haven CC0 models (glTF 1k) into props_src/<id>/ (curl: the API rejects urllib's UA)"""
import json, os, sys, subprocess
def get(url, out=None):
    r = subprocess.run(['curl', '-sfL', '-A', 'RedNightBuild/1.0', '-o', out or '-', url], capture_output=True)
    if r.returncode: raise SystemExit(f'fail {url}')
    return r.stdout
for pid in sys.argv[1:]:
    d = json.loads(get(f'https://api.polyhaven.com/files/{pid}'))
    g = d['gltf']['1k']['gltf']; base = os.path.join('props_src', pid); os.makedirs(base, exist_ok=True)
    get(g['url'], os.path.join(base, pid + '.gltf'))
    for rel, inc in g['include'].items():
        p = os.path.join(base, rel); os.makedirs(os.path.dirname(p), exist_ok=True); get(inc['url'], p)
    print('ok', pid, flush=True)
