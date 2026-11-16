# Renders the diagrams for Farsight_Glasses.html from a Python port of
# DropLayer() in the game's GlassesLens.shader:
#   gen-1-cells.png           the grid, each cell shaded by its random value
#   gen-2-drop-per-cell.png   one grid at wetness 0.7, so some cells are empty
#   gen-3-layers.png          large, medium, small layers and all three, on a game frame
#   gen-4-wetness.webp        wetness 0 -> 1 -> 0 on a game frame
#   gen-5-refraction.png      one drop on a clean Unity still, real offset maths, no blur
#   step-quarter.png          the 1/4 blur copy, upscaled smoothly
#   step-sixteenth.png        the 1/16 blur copy, upscaled smoothly
#   step-frame.jpg / step-result.jpg   a game frame before and after the pass
#
# Usage (from the repo root):
#   python3 scripts/glasses.py [still] [out_dir]
# still   defaults to the clean Unity capture in the Eye-Exam repo
# out_dir defaults to assets/img/farsight/glasses
# Needs numpy, Pillow and img2webp.
import os, subprocess, sys, tempfile
import numpy as np
from PIL import Image, ImageDraw

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Source frame: a 1920x1080 still captured in Unity with the lens effect and the
# Bleed volume override off, so edges have no colour fringe (the lens pass runs
# before post-processing, so this is closer to what the drops really see).
STILL = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser(
    "~/Documents/GitHub/Eye-Exam/Recordings/Portfolio/raw/lens_off_nobleed_1116.png")
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(REPO, "assets/img/farsight/glasses")
DROP_CENTRE = (0.416, 0.302)  # refraction diagram: drop centre in the still (0..1, from top left)


# ---- port of the shader ----
def frac(x): return x - np.floor(x)

def hash21(p):
    p = frac(p * np.array([123.34, 456.21])); d = (p * (p + 45.32)).sum(-1, keepdims=True); p = p + d
    return frac(p[..., 0] * p[..., 1])

def hash22(p):
    n = hash21(p); return np.stack([n, hash21(p + n[..., None] + 17.3)], -1)

def ss(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)

def layer(p, scale, seed, cover, clock):
    g = p * scale; idc = np.floor(g); f = frac(g) - 0.5
    h = hash21(idc + seed)
    phase = np.floor(clock * (0.04 + 0.06 * h) + h * 7.0)
    r2 = hash22(idc + seed + phase[..., None] * 13.1)
    blur = 0.012 * scale
    size = (0.14 + (0.4 - 0.14) * r2[..., 0] * r2[..., 1]) * np.clip((cover - h * 0.95) * 5.0, 0, 1)
    size = np.minimum(size, 0.48 - blur)
    pos = (r2 - 0.5) * 2.0 * np.maximum(0.48 - size - blur, 0)[..., None]
    d = f - pos; d[..., 1] *= 1.12
    L = np.linalg.norm(d, axis=-1)
    m = ss(size + blur, np.maximum(size - blur * 1.5, 0), L) * np.clip(size / (blur * 1.6), 0, 1)
    m[size < 1e-3] = 0
    dist = L / np.maximum(size, 1e-3); rim = ss(0.5, 1.0, dist) * m
    off = -d / np.maximum(size, 1e-3)[..., None] * m[..., None]
    return off, m, rim


def save(a, name):
    Image.fromarray(np.uint8(np.clip(a, 0, 1) * 255)).save(os.path.join(OUT, name))


# ---- gen-2: one grid, partway wet ----
def drop_per_cell():
    W, H = 640, 360; asp = W / H
    ys, xs = np.mgrid[0:H, 0:W]
    uv = np.stack([(xs + .5) / W, 1 - (ys + .5) / H], -1)
    p = np.stack([(uv[..., 0] - .5) * asp, uv[..., 1] - .5], -1)
    BG = np.array([23, 43, 57]) / 255.; FG = np.array([0.94, 0.95, 0.96])
    _, m, _ = layer(p, 7, 1.7, 0.7, 40.0)
    im = Image.fromarray(np.uint8(np.clip(BG + (FG - BG) * m[..., None], 0, 1) * 255)); d = ImageDraw.Draw(im)
    for k in range(-20, 40):
        y = H * (0.5 - k / 7); x = W * 0.5 + k / 7 / asp * W
        if 0 <= y <= H: d.line([(0, y), (W, y)], fill=(120, 140, 155), width=1)
        if 0 <= x <= W: d.line([(x, 0), (x, H)], fill=(120, 140, 155), width=1)
    im.save(os.path.join(OUT, "gen-2-drop-per-cell.png"))


# ---- blur copies, upscaled the way the shader reads them (bilinear) ----
def blur_copies(frame_small):
    f = np.asarray(Image.open(frame_small).convert("RGB")).astype(np.float32) / 255; H, W, _ = f.shape
    for k, name in ((4, "step-quarter.png"), (16, "step-sixteenth.png")):
        h, w = H // k, W // k
        s = f[:h * k, :w * k].reshape(h, k, w, k, 3).mean((1, 3))
        Image.fromarray(np.uint8(np.clip(s, 0, 1) * 255)).resize((W // 2, H // 2), Image.BILINEAR).save(os.path.join(OUT, name))


# ---- gen-5: one drop on the game frame ----
def refraction(still):
    F = np.asarray(Image.open(still).convert("RGB")).astype(np.float32) / 255; NH, NW, _ = F.shape
    def bil(x, y):
        x = np.clip(x, 0, NW - 1.001); y = np.clip(y, 0, NH - 1.001)
        x0 = np.floor(x).astype(int); y0 = np.floor(y).astype(int)
        fx = (x - x0)[..., None]; fy = (y - y0)[..., None]
        return (F[y0, x0] * (1 - fx) + F[y0, x0 + 1] * fx) * (1 - fy) + (F[y0 + 1, x0] * (1 - fx) + F[y0 + 1, x0 + 1] * fx) * fy
    cx, cy = DROP_CENTRE[0] * NW, DROP_CENTRE[1] * NH
    side = 0.20 * NH; N = 360                               # crop a fifth of the frame height, show at 360 px
    yy, xx = np.mgrid[0:N, 0:N]
    px = cx + ((xx + .5) / N - .5) * side; py = cy + ((yy + .5) / N - .5) * side
    scale = 7.0; size = 0.28; blur = 0.012 * scale          # a mid-size drop from the large layer
    d = np.stack([(px - cx) / NH * scale, (py - cy) / NH * scale * 1.12], -1)   # cell units, as in the shader
    L = np.linalg.norm(d, axis=-1)
    m = ss(size + blur, max(size - blur * 1.5, 0), L) * min(size / (blur * 1.6), 1)
    rim = ss(0.5, 1.0, L / size) * m
    o = -d / size * m[..., None] * 0.08 * NH                # shader: uv + drop.xy * 0.08 (screen heights)
    luma = lambda c: (c * np.array([.299, .587, .114])).sum(-1, keepdims=True)
    before = bil(px, py)
    seen = bil(px + o[..., 0], py + o[..., 1])
    seen = seen * 1.08 + luma(seen) * 0.04
    seen = seen * (1 - rim[..., None] * 0.75) + (seen * 0.45 + luma(before) * 0.1) * rim[..., None] * 0.75
    after = before * (1 - m[..., None] * 0.9) + seen * m[..., None] * 0.9
    save(np.concatenate([before, np.ones((N, 10, 3)), after], 1), "gen-5-refraction.png")


# ---- gen-1: the grid, each cell its own random value ----
def cells():
    W, H = 640, 360; asp = W / H
    ys, xs = np.mgrid[0:H, 0:W]
    uv = np.stack([(xs + .5) / W, 1 - (ys + .5) / H], -1)
    p = np.stack([(uv[..., 0] - .5) * asp, uv[..., 1] - .5], -1)
    BG = np.array([23, 43, 57]) / 255.
    h = hash21(np.floor(p * 7) + 1.7)
    a = BG * (1 - h[..., None]) + np.array([0.55, 0.62, 0.68]) * h[..., None] * 0.9
    im = Image.fromarray(np.uint8(np.clip(a, 0, 1) * 255)); d = ImageDraw.Draw(im)
    for k in range(-20, 40):
        y = H * (0.5 - k / 7); x = W * 0.5 + k / 7 / asp * W
        if 0 <= y <= H: d.line([(0, y), (W, y)], fill=(120, 140, 155), width=1)
        if 0 <= x <= W: d.line([(x, 0), (x, H)], fill=(120, 140, 155), width=1)
    im.save(os.path.join(OUT, "gen-1-cells.png"))


# ---- the whole lens pass on the 960x540 frame ----
LAYERS = [(7, 1.7, 1.0, 1.0, 0), (12, 5.3, 1.0, 1.3, .37), (21, 9.1, 0.85, 1.7, .71)]

class LensPass:
    def __init__(self, frame_small):
        f = np.asarray(Image.open(frame_small).convert("RGB")).astype(np.float32) / 255
        self.f = f; H, W, _ = f.shape; self.W, self.H, self.asp = W, H, W / H
        def down(k):
            h, w = H // k, W // k; return f[:h * k, :w * k].reshape(h, k, w, k, 3).mean((1, 3))
        up = lambda s: np.asarray(Image.fromarray(np.uint8(np.clip(s, 0, 1) * 255)).resize((W, H), Image.BILINEAR)).astype(np.float32) / 255
        self.soft = up(down(4)); self.softer = up(down(16))
        ys, xs = np.mgrid[0:H, 0:W]
        self.uv = np.stack([(xs + .5) / W, 1 - (ys + .5) / H], -1)
        self.p = np.stack([(self.uv[..., 0] - .5) * self.asp, self.uv[..., 1] - .5], -1)

    def sample(self, img, u):
        x = np.clip((u[..., 0] * self.W).astype(int), 0, self.W - 1)
        y = np.clip(((1 - u[..., 1]) * self.H).astype(int), 0, self.H - 1); return img[y, x]

    # soften=True fades the lens-wide softening with wetness, as the shader does
    def render(self, cover, which=(0, 1, 2), clock=40.0, soften=True):
        best = None
        for i in which:
            sc, sd, cm, ck, o = LAYERS[i]; L = layer(self.p + o, sc, sd, cover * cm, clock * ck)
            if best is None: best = L
            else:
                t = L[1] > best[1]
                best = (np.where(t[..., None], L[0], best[0]), np.where(t, L[1], best[1]), np.where(t, L[2], best[2]))
        off, m, rim = best
        luma = lambda c: (c * np.array([.299, .587, .114])).sum(-1, keepdims=True)
        k = 0.18 * cover if soften else 0.18
        col = self.f * (1 - k) + self.soft * k
        o = off * np.array([1 / self.asp, 1.0]) * 0.08
        seen = self.sample(self.softer, self.uv + o) * 0.6 + self.sample(self.soft, self.uv + o * 0.6) * 0.4
        seen = seen * 1.08 + luma(seen) * 0.04
        seen = seen * (1 - rim[..., None] * 0.75) + (seen * 0.45 + luma(self.soft) * 0.1) * rim[..., None] * 0.75
        return col * (1 - m[..., None] * 0.9) + seen * m[..., None] * 0.9


# ---- step-frame / step-result: the frame before and after ----
def before_after(lp):
    q = lambda a, n: Image.fromarray(np.uint8(np.clip(a, 0, 1) * 255)).save(os.path.join(OUT, n), quality=88)
    q(lp.f, "step-frame.jpg"); q(lp.render(1.0), "step-result.jpg")


# ---- gen-3 and gen-4: per layer and over wetness, on a crop of the frame ----
def layers_and_wetness(lp):
    img = lambda a: Image.fromarray(np.uint8(np.clip(a, 0, 1) * 255))
    cx, cy, cw, ch = lp.W // 2 - 240, 40, 480, 270   # sky + building edge, so drops read at web size
    crop = lambda a: a[cy:cy + ch, cx:cx + cw]
    tiles = [crop(lp.render(1.0, (i,))) for i in range(3)] + [crop(lp.render(1.0))]
    gap = np.ones((ch, 6, 3)); gv = np.ones((6, cw * 2 + 6, 3))
    img(np.concatenate([np.concatenate([tiles[0], gap, tiles[1]], 1), gv,
                        np.concatenate([tiles[2], gap, tiles[3]], 1)], 0)).save(os.path.join(OUT, "gen-3-layers.png"))
    with tempfile.TemporaryDirectory() as fr:
        vals = list(np.linspace(0, 1, 30)) + [1.0] * 10 + list(np.linspace(1, 0, 20)) + [0.0] * 5
        for i, c in enumerate(vals): img(crop(lp.render(float(c)))).save(f"{fr}/f{i:03d}.png")
        subprocess.run(["img2webp", "-loop", "0", "-lossy", "-q", "82", "-m", "4", "-d", "66"]
                       + sorted(f"{fr}/{x}" for x in os.listdir(fr))
                       + ["-o", os.path.join(OUT, "gen-4-wetness.webp")], check=True, capture_output=True)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        small = os.path.join(tmp, "frame.png")
        Image.open(STILL).convert("RGB").resize((960, 540), Image.LANCZOS).save(small)
        cells()
        drop_per_cell()
        blur_copies(small)
        refraction(STILL)
        lp = LensPass(small)
        before_after(lp)
        layers_and_wetness(lp)
    print("wrote 10 images to", OUT)
