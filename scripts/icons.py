# Diagrams for Farsight_Icons.html.
# A port of ShapeAlpha() from the game's FloatingIconSDF.shader, using the dot and
# ring sizes and the distances saved in FloatingIconAtlas.asset, and the game's own
# baked distance-field atlas (FloatingIconAtlas.png).
# Usage: python3 scripts/icons.py <path/to/FloatingIconAtlas.png>   (from the site root)
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

OUT = 'assets/img/farsight/icons/'
DOT_R, RING_R, SPREAD_UV, OUTLINE_W = 0.12, 0.223, 0.125, 0.08
EYE_CELL = (0, 0, 256, 256)                       # the "eye" entry: left column, top row of the atlas
VISIBLE, MORPH_START, MORPH_END, FADE_START, FADE_END = 4.0, 2.0, 1.0, 0.4, 0.1   # metres
BG, FG, DIM = (28, 30, 38), (244, 242, 232), (128, 132, 146)

def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)

def lerp(a, b, t):
    return a + (b - a) * t

def shape(cell, m, size=256, ss=4):
    """ShapeAlpha() at morph m (0 = dot, 1 = icon). Supersampled in place of the shader's fwidth edge."""
    n = size * ss
    u, v = np.meshgrid((np.arange(n) + 0.5) / n, (np.arange(n) + 0.5) / n)
    icon = np.asarray(cell.resize((n, n), Image.BILINEAR), np.float32) / 255.0
    grow = smoothstep(0.15, 0.6, m)
    shape_mix = smoothstep(0.55, 0.95, m)
    fold = smoothstep(0.2, 0.45, m) * (1 - smoothstep(0.6, 0.9, m))      # as-drawn mode: a bump, back to 0 at the end
    r = lerp(DOT_R, RING_R, grow)
    circle = 0.5 + (r - np.hypot(u - 0.5, v - 0.5)) / SPREAD_UV * 0.5
    d = lerp(circle, icon, shape_mix)                                     # blend the two distance values
    d = lerp(d, 0.5 - np.abs(d - 0.5), fold)                              # fold around the edge: solid -> outline
    a = (d > lerp(0.5, 0.5 - OUTLINE_W, fold)).astype(np.float32)
    return a.reshape(size, ss, size, ss).mean((1, 3))

def panel(alpha):
    a = alpha[..., None]
    return Image.fromarray((np.array(BG) * (1 - a) + np.array(FG) * a + 0.5).astype(np.uint8))

def strip(cell, morphs, name):
    gap = 8
    out = Image.new('RGB', (256 * len(morphs) + gap * (len(morphs) - 1), 256), (255, 255, 255))
    for i, m in enumerate(morphs): out.paste(panel(shape(cell, m)), (i * (256 + gap), 0))
    out.save(OUT + name)

def animation(cell, name):
    ms = list(np.linspace(0, 1, 30)); ms = [0] * 6 + ms + [1] * 10 + ms[::-1]
    frames = [panel(shape(cell, m, ss=3)) for m in ms]
    frames[0].save(OUT + name, save_all=True, append_images=frames[1:], duration=50, loop=0, quality=85)

def distance_bar(cell, name):
    SS = 2; W, H = 640 * SS, 150 * SS
    img = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(img)
    f = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 13 * SS)
    x = lambda metres: 30 * SS + (4.6 - metres) / 4.6 * (W - 60 * SS)     # far on the left, you on the right
    y = 96 * SS
    d.line([(x(4.6), y), (x(0), y)], fill=DIM, width=SS)
    for m in (VISIBLE, MORPH_START, MORPH_END, FADE_START, FADE_END):
        d.line([(x(m), y - 6 * SS), (x(m), y + 6 * SS)], fill=FG, width=SS)
    for m, label in ((VISIBLE, '4 m'), (MORPH_START, '2 m'), (MORPH_END, '1 m'), (FADE_START, '0.4'), (FADE_END, '0.1')):
        d.text((x(m), y + 20 * SS), label, fill=FG, font=f, anchor='mm')
    bands = ((4.6, VISIBLE, 'hidden', None, 0), (VISIBLE, MORPH_START, 'dot', 0.0, 1), (MORPH_START, MORPH_END, 'morphing', 0.5, 1),
             (MORPH_END, FADE_START, 'icon', 1.0, 1), (FADE_START, FADE_END, 'fades', 1.0, 0.4))
    for far, near, label, morph, alpha in bands:
        cx = (x(far) + x(near)) / 2
        d.text((cx, y - 20 * SS), label, fill=DIM if morph is None else FG, font=f, anchor='mm')
        if morph is not None:
            s = 44 * SS
            a = np.asarray(Image.fromarray((shape(cell, morph, 128, 2) * 255).astype(np.uint8)).resize((s, s), Image.LANCZOS), np.float32) / 255 * alpha
            px = (np.array(BG) * (1 - a[..., None]) + np.array(FG) * a[..., None] + 0.5).astype(np.uint8)
            img.paste(Image.fromarray(px), (round(cx - s / 2), 16 * SS))
    d.text((x(0), y + 42 * SS), 'you', fill=DIM, font=f, anchor='rm')
    d.text((x(4.6), y + 42 * SS), 'distance to the object', fill=DIM, font=f, anchor='lm')
    img.resize((W // SS, H // SS), Image.LANCZOS).save(OUT + name)

if __name__ == '__main__':
    cell = Image.open(sys.argv[1]).convert('RGB').getchannel('R').crop(EYE_CELL)
    strip(cell, (0.0, 0.5, 0.7, 0.85, 1.0), 'sdf-morph.png')
    animation(cell, 'sdf-morph.webp')
    distance_bar(cell, 'icon-distances.png')
