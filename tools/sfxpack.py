#!/usr/bin/env python3
"""Turn the ElevenLabs capture (red-night-sfx.json: {names:[...], items:[[b64 ogg x4], ...]})
into trimmed, normalized mono mp3s in dist/assets/sfx + index.json.
Picks the best variant per sound (early single transient for guns / foley / impacts)."""
import base64, json, os, subprocess, sys, tempfile
import numpy as np

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
SR = 44100
CAP = {'gun_sniper': 2.6, 'gun_fifty': 2.8, 'gun_distant': 3.2, 'car_explode': 3.2, 'fire_whoosh': 1.8, 'glass_shatter': 1.4, 'scream': 1.7, 'whiz': .7, 'ricochet': 1.0}
KEEP2 = {'imp_concrete', 'imp_metal', 'imp_glass', 'imp_wood', 'whiz', 'scream'}

def cap_of(n):
    if n in CAP: return CAP[n]
    if n.startswith('gun_'): return 1.7
    if n.startswith('foley_'): return .9
    if n.startswith('imp_'): return .6
    return 2.0

def decode(b64, tmp):
    p = os.path.join(tmp, 'in.ogg'); open(p, 'wb').write(base64.b64decode(b64))
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()

def env(x, win=.005):
    n = max(1, int(SR * win)); k = np.ones(n) / n
    return np.sqrt(np.convolve(x * x, k, 'same'))

def score(n, x):
    e = env(x); pk = e.max() + 1e-9; on = np.argmax(e > pk * .25) / SR; at_pk = np.argmax(e) / SR
    # count separate transients over 55% of the peak (bursts / doubled shots are bad for one-shot samples)
    above = e > pk * .55; edges = np.flatnonzero(np.diff(above.astype(int)) == 1); hits = 1
    last = edges[0] if len(edges) else 0
    for i in edges[1:]:
        if (i - last) / SR > .09: hits += 1; last = i
    s = -on * 4 - max(0, at_pk - on) * 3
    if n.startswith('gun_') and n != 'gun_distant': s -= (hits - 1) * 2.5
    if n.startswith('foley_') or n.startswith('imp_'): s -= (hits - 1) * .6
    return s, on, hits

def trim(n, x):
    e = env(x, .003); pk = e.max() + 1e-9
    a = max(0, int(np.argmax(e > pk * .02)) - int(.004 * SR))
    b = len(x) - int(np.argmax(e[::-1] > pk * .004))
    if n.startswith('gun_') and n != 'gun_distant':  # one trigger pull = one shot: cut before any second report
        e2 = env(x, .005); p2 = e2.max(); above = e2 > p2 * .5; st = np.flatnonzero(np.diff(above.astype(int)) == 1)
        first = st[0] if len(st) else a
        later = [i for i in st if (i - first) / SR > .09]
        if later: b = min(b, int(later[0] - .012 * SR))
    b = min(b, a + int(cap_of(n) * SR)); y = x[a:b].copy()
    f = min(len(y), int(.04 * SR)); y[-f:] *= np.linspace(1, 0, f) ** 2
    return y / (np.abs(y).max() + 1e-9) * .89

def write(name, y, tmp):
    w = os.path.join(tmp, 'o.f32'); y.astype(np.float32).tofile(w)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', w, '-c:a', 'libmp3lame', '-b:a', '112k', os.path.join(OUT, name + '.mp3')], check=True)

data = json.load(open(SRC)); names, items = data['names'], data['items']
SKIP = set(sys.argv[3].split(',')) if len(sys.argv) > 3 else set()
index, report = [], []
with tempfile.TemporaryDirectory() as tmp:
    for n, vs in zip(names, items):
        if n in SKIP: continue
        dec = []
        for b in vs:
            try: dec.append(decode(b, tmp))
            except Exception as ex: print('decode fail', n, ex)
        if not dec: continue
        ranked = sorted(((score(n, x), i, x) for i, x in enumerate(dec)), key=lambda t: -t[0][0])
        outs = [n + '_1', n + '_2'] if n in KEEP2 else [n]
        for k, nm in enumerate(outs):
            (s, on, hits), i, x = ranked[min(k, len(ranked) - 1)]
            y = trim(n, x); write(nm, y, tmp); index.append(nm)
            report.append(f'{nm:20s} v{i + 1} score={s:6.2f} onset={on:.3f}s hits={hits} len={len(y) / SR:.2f}s')
json.dump(index, open(os.path.join(OUT, 'index.json'), 'w'))
print('\n'.join(report)); print(len(index), 'files')
