#!/usr/bin/env python3
"""ambientCG facades -> night-ready game textures (512): albedo, normal, ORM (G=rough, B=metal), emissive.
Facades without lit windows get them: glass mask (metalness) -> connected windows -> ~35% lit with warm/cool interiors.
Prints the window-row period so the game can scale one floor to ~3.5 m."""
import glob, json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
SRC, OUT = 'facsrc', 'dist/assets/fac'; os.makedirs(OUT, exist_ok=True)
S = 512; rng = np.random.default_rng(7); meta = {}
def load(d, k, mode='RGB'):
    f = glob.glob(f'{SRC}/{d}/*_{k}.jpg'); return np.asarray(Image.open(f[0]).convert(mode)).astype(np.float32) / 255 if f else None
def period(sig):
    sig = sig - sig.mean(); ac = np.correlate(sig, sig, 'full')[len(sig) - 1:]; ac /= ac[0] + 1e-9
    lo = 20; p = lo + int(np.argmax(ac[lo:len(sig) // 2])); return p
for d in sys.argv[1:]:
    col = load(d, 'Color'); nor = load(d, 'NormalGL'); rough = load(d, 'Roughness', 'L'); met = load(d, 'Metalness', 'L'); emi = load(d, 'Emission')
    H = col.shape[0]
    lum = col.mean(2)
    py = period(lum.mean(1)); floors = H / py
    if met is not None: glass = met > .5
    elif emi is not None: glass = emi.mean(2) > .06
    else: glass = rough < .35
    if emi is None or emi.max() < .05:  # make lit offices
        lab, n = ndimage.label(glass); e = np.zeros_like(col)
        pal = np.array([[1, .72, .42], [1, .82, .58], [.75, .85, 1], [.55, .7, 1], [1, .6, .35]])
        objs = ndimage.find_objects(lab)
        for i, sl in enumerate(objs):
            if sl is None or rng.random() > .36: continue
            c = pal[rng.integers(len(pal))] * rng.uniform(.55, 1.0); m = lab[sl] == i + 1
            hh = m.shape[0]; grad = np.linspace(1.0, .55, hh)[:, None]                      # ceiling light falls off downward
            blind = rng.random() < .3; frac = rng.uniform(.3, .7)
            mm = m.copy();
            if blind: mm[:int(hh * frac), :] = False                                      # half-drawn blinds
            e[sl][mm] = (c[None, None, :] * grad[..., None] * np.ones((1, mm.shape[1], 1)))[mm]
        emi = ndimage.gaussian_filter(e, (1.2, 1.2, 0))
        col = np.where(glass[..., None], col * .45, col)                                    # dark night glass
    else:
        col = np.where(glass[..., None], col * .6, col)
    orm = np.stack([np.ones_like(lum), rough if rough is not None else np.full_like(lum, .7), met if met is not None else glass.astype(np.float32) * .8], 2)
    def save(a, name, q=86):
        Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).resize((S, S), Image.LANCZOS).save(f'{OUT}/{d}_{name}.jpg', quality=q)
    save(col, 'd'); save(nor if nor is not None else np.full_like(col, .5) * [1, 1, 2], 'n'); save(orm, 'orm'); save(emi, 'e', 90)
    meta[d] = {'floors': round(float(floors), 2), 'glassFrac': round(float(glass.mean()), 2)}
    print(d, meta[d], flush=True)
json.dump(meta, open(f'{OUT}/meta.json', 'w'), indent=1)
