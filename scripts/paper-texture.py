"""Gera a textura (repetível) de papel de filtro de café usada no fundo da página."""
import sys
import numpy as np
from PIL import Image

N = 512
rng = np.random.default_rng(7)

def filtered_noise(fx, fy, power):
    """Ruído periódico filtrado no domínio da frequência (repete sem emendas)."""
    white = rng.standard_normal((N, N))
    ky = np.fft.fftfreq(N)[:, None] * N
    kx = np.fft.fftfreq(N)[None, :] * N
    k = np.sqrt((kx / fx) ** 2 + (ky / fy) ** 2) + 1e-6
    out = np.real(np.fft.ifft2(np.fft.fft2(white) * k ** -power))
    return (out - out.mean()) / out.std()

fibers = filtered_noise(1.0, 6.0, 1.6)          # fibras alongadas na horizontal
pulp = filtered_noise(1.0, 1.0, 1.1)            # nuvens suaves da polpa do papel
grain = rng.standard_normal((N, N))             # granulado fino
y = np.arange(N)[:, None]
crepe = np.sin(2 * np.pi * (y / N * 64 + 0.6 * filtered_noise(2, 2, 2.2)))  # vincos do crepado

tone = 0.9 * fibers + 0.7 * pulp + 0.5 * grain + 0.7 * crepe
tone = tone / tone.std()
base = np.array([253, 252, 249], np.float32)
warm = np.array([214, 200, 178], np.float32)
amount = np.clip(0.07 + 0.045 * tone, 0, 1)[..., None]
rgb = base * (1 - amount) + warm * amount
Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)).save(sys.argv[1], quality=82, optimize=True)
