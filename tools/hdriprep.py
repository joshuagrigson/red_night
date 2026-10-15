# Convert Poly Haven RGBE .hdr panoramas into small LDR JPGs for the game.
# usage: python3 tools/hdriprep.py in.hdr out.jpg WIDTH EXPOSURE [GAMMA]
# Sky: the lower hemisphere is replaced in-shader, so only the upper half matters.
import sys, numpy as np
from PIL import Image
def read_hdr(path):
    f = open(path, 'rb'); data = f.read(); f.close()
    i = data.index(b'\n\n') + 2
    line_end = data.index(b'\n', i); dims = data[i:line_end].split(); i = line_end + 1
    H, W = int(dims[1]), int(dims[3])
    out = np.zeros((H, W, 4), np.uint8); p = i
    for y in range(H):
        if data[p] == 2 and data[p+1] == 2:  # new RLE scanline
            p += 4
            for c in range(4):
                x = 0
                while x < W:
                    n = data[p]; p += 1
                    if n > 128:
                        n -= 128; out[y, x:x+n, c] = data[p]; p += 1
                    else:
                        out[y, x:x+n, c] = np.frombuffer(data[p:p+n], np.uint8); p += n
                    x += n
        else:
            out[y] = np.frombuffer(data[p:p+W*4], np.uint8).reshape(W, 4); p += W*4
    e = out[..., 3].astype(np.int32)
    scale = np.where(e > 0, np.ldexp(1.0, e - 136), 0.0)
    return out[..., :3].astype(np.float32) * scale[..., None]
src, dst, W, ex = sys.argv[1], sys.argv[2], int(sys.argv[3]), float(sys.argv[4])
gamma = float(sys.argv[5]) if len(sys.argv) > 5 else 2.2
rgb = read_hdr(src) * ex
rgb = rgb / (1.0 + rgb * 0.15)            # soft shoulder keeps lamp cores from clipping hard
img = np.clip(rgb, 0, 1) ** (1 / gamma)
im = Image.fromarray((img * 255 + .5).astype(np.uint8)).resize((W, W // 2), Image.LANCZOS)
im.save(dst, quality=86, optimize=True, progressive=True)
print(dst, im.size, 'mean', np.asarray(im).mean(axis=(0, 1)).round(1))
