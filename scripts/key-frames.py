"""Remove o fundo preto do vídeo do grão, preservando sombras internas."""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as ndi

LO, HI = 4.0, 30.0
def key(src):
    img = Image.open(src).convert('RGB')
    a = np.asarray(img).astype(np.float32)
    m = a.max(2)
    t = np.clip((m - LO) / (HI - LO), 0, 1)
    ramp = t * t * (3 - 2 * t)
    solid = m > 10
    yy, xx = np.mgrid[-4:5, -4:5]
    disk = (xx**2 + yy**2) <= 16
    closed = ndi.binary_closing(solid, structure=disk, iterations=1)
    filled = ndi.binary_fill_holes(closed)
    holes, n = ndi.label(filled & ~closed)
    if n:
        sizes = ndi.sum(np.ones_like(m), holes, index=np.arange(1, n + 1))
        limit = m.size * 0.01
        keep = np.zeros(n + 1, bool); keep[1:] = sizes < limit
        closed = closed | keep[holes]
    # o "miolo" do grão (área sólida grande) fica opaco; partículas soltas usam a rampa
    lab, k = ndi.label(closed)
    if k:
        sizes = ndi.sum(np.ones_like(m), lab, index=np.arange(1, k + 1))
        big = np.zeros(k + 1, bool); big[1:] = sizes > 1500
        core = ndi.binary_erosion(big[lab], iterations=2)
    else:
        core = np.zeros_like(solid)
    core_soft = ndi.gaussian_filter(core.astype(np.float32), 1.2)
    # só preenche sombras estreitas (fendas do grão); nuvens escuras largas seguem a rampa
    dist = ndi.distance_transform_edt(m <= HI)
    core_soft = core_soft * np.clip(1 - (dist - 14) / 12, 0, 1)
    alpha = np.maximum(ramp, core_soft)
    scale = np.where((m < HI) & (core_soft < .5), HI / np.maximum(m, 1), 1.0)[..., None]
    rgb = np.clip(a * scale, 0, 255)
    # sombras internas viram marrom-escuro (pó de café) em vez de preto puro
    brown = np.array([62, 34, 18], np.float32)
    w = (np.clip(1 - m / HI, 0, 1) * (core_soft >= .5))[..., None]
    rgb = rgb * (1 - w) + np.maximum(rgb, brown) * w
    # bordas do quadro esmaecidas: o pó que sai do enquadramento não fica cortado reto
    h, w = m.shape
    fx = np.clip(np.minimum(np.arange(w), w - 1 - np.arange(w)) / (w * 0.16), 0, 1)
    fy = np.clip(np.minimum(np.arange(h), h - 1 - np.arange(h)) / (h * 0.10), 0, 1)
    edge = np.outer(fy * fy * (3 - 2 * fy), fx * fx * (3 - 2 * fx))
    alpha = alpha * edge
    return Image.fromarray(np.dstack([rgb, np.clip(alpha, 0, 1) * 255]).astype(np.uint8), 'RGBA')

if __name__ == '__main__':
    for src, dst in zip(sys.argv[1::2], sys.argv[2::2]):
        key(src).save(dst)
