# Diagrams for Farsight_Fire.html.
# A port of the game's FireVolume.shader (Flame() and the march loop in frag()),
# using the values saved in M_FireplaceFlames.mat, the fireplace's box size in the
# scene, and the game's own 64x64x64 noise texture (SteamNoise3D.asset).
# Usage: python3 scripts/fire.py <path/to/SteamNoise3D.asset>   (from the site root)
import re, sys
import numpy as np
from PIL import Image

OUT = 'assets/img/farsight/fire/'

# M_FireplaceFlames.mat
HOT, MID, COOL = np.array([2.6, 1.5, 0.45]), np.array([2.2, 0.62, 0.08]), np.array([0.8, 0.1, 0.02])
INTENSITY, DENSITY, NOISE_SCALE, RISE, SWIRL = 0.65, 10.0, 24.0, 0.9, 0.8
BASE_WIDTH, TAPER, HEIGHT_FADE, STEPS, FLICKER, SHARPNESS = 0.48, 0.3, 0.62, 22, 0.25, 6.0
BOX = np.array([0.32, 0.5, 0.62])          # Fire Volume scale in the living room scene (m)

def load_noise(path):
    text = open(path).read()
    data = bytes.fromhex(re.search(r'_typelessdata: ([0-9a-f]+)', text).group(1))
    return np.frombuffer(data, np.uint8).reshape(64, 64, 64, 4).astype(np.float32) / 255.0   # [z, y, x, rgba]

def sample(tex, uvw):                       # trilinear, repeat wrap
    p = uvw * 64.0 - 0.5
    i0 = np.floor(p).astype(np.int64); f = (p - i0).astype(np.float32)
    out = 0
    for dz in (0, 1):
        for dy in (0, 1):
            for dx in (0, 1):
                w = (f[..., 0] if dx else 1 - f[..., 0]) * (f[..., 1] if dy else 1 - f[..., 1]) * (f[..., 2] if dz else 1 - f[..., 2])
                out = out + w[..., None] * tex[(i0[..., 2] + dz) % 64, (i0[..., 1] + dy) % 64, (i0[..., 0] + dx) % 64]
    return out

def flame(tex, p, t):
    """Flame() from the shader. p is in the box's [-0.5, 0.5]^3. Returns foot, noise, density, temperature."""
    h = p[..., 1] + 0.5
    w = BASE_WIDTH * (1 - TAPER * h)
    foot = np.clip(1 - np.hypot(p[..., 0], p[..., 2]) / np.maximum(w, 1e-3), 0, 1)
    q = p * BOX * NOISE_SCALE
    q[..., 1] = (q[..., 1] - t * RISE * NOISE_SCALE) * 0.35
    warp = sample(tex, q * 0.07 + np.array([0.2, 0.5, 0.8]))[..., [3, 1, 0]] - 0.5
    q = q + warp * SWIRL * 3
    n = sample(tex, q * 0.125)
    n2 = sample(tex, q * 0.31 + 0.41)
    ridge = 1 - np.abs(n[..., 0] * 2 - 1)
    noise = ridge * 0.65 + n2[..., 1] * 0.35
    cut = h / HEIGHT_FADE
    d = np.clip((noise * foot * 1.7 - cut) * SHARPNESS, 0, 1)
    d = d * np.clip(h / 0.06, 0, 1) ** 2 * (3 - 2 * np.clip(h / 0.06, 0, 1))      # smoothstep(0, 0.06, h)
    d = np.where(foot > 0, d, 0)
    temp = np.clip(d * (1.2 - h * 1.1), 0, 1)
    return foot, noise, d, temp

def ramp(temp):
    k = temp[..., None]
    return np.where(k < 0.5, COOL + (MID - COOL) * (k * 2), MID + (HOT - MID) * (k * 2 - 1))

def to_srgb(lin):
    lin = np.clip(lin, 0, 1)
    return np.where(lin <= 0.0031308, lin * 12.92, 1.055 * lin ** (1 / 2.4) - 0.055)

def save(lin, name, size=None):
    im = Image.fromarray((to_srgb(lin) * 255 + 0.5).astype(np.uint8))
    if size: im = im.resize(size, Image.LANCZOS)
    im.save(OUT + name); return im

def slice_points(w, h):                     # the box's middle slice, seen along its thin axis
    z, y = np.meshgrid(np.linspace(-0.5, 0.5, w), np.linspace(0.5, -0.5, h))
    return np.stack([np.zeros_like(z), y, z], -1)

def march(tex, t, w, h, angle_deg, dist=1.9, fill=0.82):
    """frag() from the shader, with no scene behind it. Camera orbits the box at `dist` metres."""
    a = np.radians(angle_deg)
    cam = np.array([np.cos(a), 0.0, np.sin(a)]) * dist
    fwd = -cam / dist; right = np.array([-fwd[2], 0, fwd[0]]); up = np.array([0.0, 1.0, 0.0])
    half_h = (BOX[1] / fill) / 2 / dist
    px, py = np.meshgrid(np.arange(w) + 0.5, np.arange(h) + 0.5)
    sx = (px / w * 2 - 1) * half_h * w / h; sy = (1 - py / h * 2) * half_h
    rd = fwd + sx[..., None] * right + sy[..., None] * up
    rd /= np.linalg.norm(rd, axis=-1, keepdims=True)
    ro, rdo = cam / BOX, rd / BOX                                   # world -> box space
    inv = 1.0 / np.where(np.abs(rdo) < 1e-9, 1e-9, rdo)
    t0, t1 = (-0.5 - ro) * inv, (0.5 - ro) * inv
    near = np.maximum(np.minimum(t0, t1).max(-1), 0); far = np.maximum(t0, t1).min(-1)
    hit = far > near
    step = np.where(hit, (far - near) / STEPS, 0)
    ign = np.modf(52.9829189 * np.modf(px * 0.06711056 + py * 0.00583715)[0])[0]   # InterleavedGradientNoise
    tt = near + step * ign
    light = np.zeros((h, w, 3)); trans = np.ones((h, w))
    for _ in range(STEPS):
        _, _, d, temp = flame(tex, ro + rdo * tt[..., None], t)
        alpha = 1 - np.exp(-d * DENSITY * step)
        light += (trans * alpha)[..., None] * ramp(temp)
        trans *= 1 - alpha * 0.35
        tt = tt + step
    flick = 1 + FLICKER * (np.sin(t * 13.1) * 0.5 + np.sin(t * 7.3 + 1.7) * 0.3 + np.sin(t * 23.7) * 0.2) * 0.5
    return np.where(hit[..., None], light * INTENSITY * flick, 0)

def side_by_side(panels, gap=8, bg=1.0):
    h = panels[0].shape[0]
    out = [panels[0]]
    for p in panels[1:]: out += [np.full((h, gap, 3), bg), p]
    return np.concatenate(out, 1)

if __name__ == '__main__':
    tex = load_noise(sys.argv[1])
    T, SS = 3.0, 2
    W, H = 300 * SS, 240 * SS

    foot, noise, d, temp = flame(tex, slice_points(W, H), T)
    grey = lambda v: np.repeat(v[..., None], 3, -1) ** 2.2          # shown as plain values, not light
    save(side_by_side([grey(foot), grey(np.where(foot > 0, noise, 0))], 8 * SS), 'fire-1-foot-noise.png', (608, 240))
    save(side_by_side([grey(d), ramp(temp) / HOT.max() * d[..., None]], 8 * SS), 'fire-2-tongues-temp.png', (608, 240))

    k = np.tile(np.linspace(0, 1, 608), (40, 1))
    save(ramp(k) / HOT.max(), 'fire-ramp.png')                      # scaled so the brightest stop fits on screen

    views = [march(tex, T, 200 * SS, 240 * SS, a, fill=0.6) for a in (0, 45, 90)]
    save(side_by_side(views, 4 * SS, 0.0), 'fire-angles.png', (608, 240))

    frames = []
    for i in range(36):
        f = march(tex, T + i / 12, W, H, 0)
        frames.append(Image.fromarray((to_srgb(f) * 255 + 0.5).astype(np.uint8)).resize((300, 240), Image.LANCZOS))
    frames[0].save(OUT + 'fire-3-march.webp', save_all=True, append_images=frames[1:], duration=83, loop=0, quality=80)
    frames[0].save(OUT + 'fire-3-march.png')
