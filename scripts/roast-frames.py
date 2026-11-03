"""Gradua os quadros do vídeo da torra: do grão verde (cru) à torra completa."""
import sys, glob, os
import numpy as np
from PIL import Image

# (posição, cor do grão em tons claros, ganho de brilho)
STOPS = [
    (0.00, (0.62, 0.70, 0.46), 2.6),   # grão verde
    (0.28, (0.92, 0.80, 0.46), 2.3),   # amarelo
    (0.52, (0.86, 0.56, 0.30), 1.7),   # canela
    (0.74, (0.62, 0.38, 0.22), 1.25),  # torra média
]

def lerp(a, b, t): return a + (b - a) * t

def grade(img, s):
    a = np.asarray(img.convert('RGB')).astype(np.float32) / 255
    if s >= 1: return img.convert('RGB')
    L = (0.3 * a[..., 0] + 0.59 * a[..., 1] + 0.11 * a[..., 2])[..., None]
    for (p0, c0, g0), (p1, c1, g1) in zip(STOPS, STOPS[1:] + [(1.0, STOPS[-1][1], 1.0)]):
        if p0 <= s <= p1:
            t = (s - p0) / (p1 - p0)
            tint = np.array([lerp(x, y, t) for x, y in zip(c0, c1)], np.float32)
            gain = lerp(g0, g1, t)
            break
    col = np.clip(np.power(L * gain, 0.85) * tint * 1.15, 0, 1)
    # metal da máquina (pouco saturado) segue o original para não "tingir" o equipamento
    sat = a.max(2, keepdims=True) - a.min(2, keepdims=True)
    keep_metal = np.clip(1 - sat * 4, 0, 1) * np.clip((L - 0.2) * 4, 0, 1)
    col = col * (1 - keep_metal) + a * keep_metal
    w = np.clip((s - 0.74) / 0.26, 0, 1) ** 1.2
    out = col * (1 - w) + a * w
    return Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8))

if __name__ == '__main__':
    src, dst, mode = sys.argv[1], sys.argv[2], sys.argv[3]
    files = sorted(glob.glob(os.path.join(src, 'f*.png')))
    if mode == 'test':
        im = Image.open(files[len(files) // 3])
        tiles = [grade(im, s).resize((160, 200)) for s in (0, .2, .35, .5, .65, .8, 1)]
        sheet = Image.new('RGB', (160 * 7, 200))
        for i, t in enumerate(tiles): sheet.paste(t, (i * 160, 0))
        sheet.save(dst)
    else:
        n = len(files)
        for i, f in enumerate(files):
            grade(Image.open(f), i / (n - 1)).save(os.path.join(dst, f'torra-{i:03d}.webp'), 'WEBP', quality=68, method=6)
        print(n)
