import sys, numpy as np
from PIL import Image, ImageFilter
src, dst, prev = sys.argv[1:4]
im = Image.open(src).convert('RGB')
a = np.asarray(im).astype(np.float32)
L = a.mean(2)
regions = [(110, 750, 290, 820), (480, 715, 605, 840), (800, 750, 980, 820)]
for x0, y0, x1, y1 in regions:
    sub = L[y0:y1, x0:x1]
    ys, xs = np.where(sub < 150)
    bx0, bx1 = x0 + xs.min() - 6, x0 + xs.max() + 7
    by0, by1 = y0 + ys.min() - 6, y0 + ys.max() + 7
    top = a[by0 - 3:by0].mean(0)       # linha logo acima
    bot = a[by1:by1 + 3].mean(0)       # linha logo abaixo
    for k, y in enumerate(range(by0, by1)):
        t = (k + 0.5) / (by1 - by0)
        a[y, bx0:bx1] = top[bx0:bx1] * (1 - t) + bot[bx0:bx1] * t
    print('limpo', (bx0, by0, bx1, by1))
out = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
# leve granulação para o remendo não ficar "liso" demais
noise = (np.random.default_rng(1).normal(0, 1.2, a.shape)).astype(np.float32)
b = np.asarray(out).astype(np.float32)
mask = np.zeros(a.shape[:2], bool)
for x0, y0, x1, y1 in regions: mask[y0:y1, x0:x1] = True
b[mask] += noise[mask]
out = Image.fromarray(np.clip(b, 0, 255).astype(np.uint8))
crop = out.crop((0, 420, 1080, 1130))   # foca nos copos e na bancada
crop.save(dst, quality=86, optimize=True, progressive=True)
crop.crop((60, 280, 1020, 480)).save(prev)
print(crop.size)
