# Diagrams for Farsight_Footprints.html.
# Top-down drawings using the placement numbers saved on the game's WetFootprints
# component and the game's own sole texture (T_WetFootprint.png).
# Usage: python3 scripts/footprints.py <path/to/T_WetFootprint.png>   (from the site root)
import random, sys
from PIL import Image, ImageDraw, ImageFont

OUT = 'assets/img/farsight/footprints/'
STRIDE, FOOT, PRINT_W, PRINT_L = 0.42, 0.065, 0.085, 0.22       # metres
DRY_AFTER, OPACITY, MIN_WET = 14.0, 0.85, 0.04
FLOOR, INK, GUIDE = (206, 190, 166), (40, 34, 30), (120, 104, 86)
SS = 2

def font(px):
    return ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', px)

def walk(count, wetness=1.0, dry_after=DRY_AFTER, seed=4):
    """The placement in WetFootprints.TrackPlayer / Place: yields (distance, left, yaw, strength)."""
    rng = random.Random(seed); left = False; out = []
    for i in range(count):
        if wetness <= MIN_WET: break
        left = not left
        yaw = rng.uniform(-6, 6) + (-4 if left else 4)           # degrees, clockwise seen from above
        out.append(((i + 1) * STRIDE, left, yaw, wetness * rng.uniform(0.8, 1.0) * OPACITY))
        wetness = max(0.0, wetness - STRIDE / dry_after)
    return out

def stamp(img, sole, x, y, ppm, left, yaw, strength):
    """Darken the floor through the sole's alpha, walking direction = image right."""
    s = sole.resize((max(1, round(PRINT_W * ppm)), max(1, round(PRINT_L * ppm))), Image.LANCZOS)
    if left: s = s.transpose(Image.FLIP_LEFT_RIGHT)             # left foot = mirrored sole
    s = s.rotate(-90 - yaw, expand=True, resample=Image.BICUBIC)
    mask = s.getchannel('A').point(lambda a: int(a * strength))
    img.paste(Image.new('RGB', s.size, INK), (round(x - s.width / 2), round(y - s.height / 2)), mask)

def dashed(d, x0, x1, y, w):
    x = x0
    while x < x1:
        d.line([(x, y), (min(x + 10 * SS, x1), y)], fill=GUIDE, width=w); x += 18 * SS

def measure(d, p0, p1, text, f, side):
    """A dimension line with end ticks and a label."""
    (x0, y0), (x1, y1) = p0, p1
    d.line([p0, p1], fill=INK, width=SS)
    t = 5 * SS
    if y0 == y1:
        for x in (x0, x1): d.line([(x, y0 - t), (x, y0 + t)], fill=INK, width=SS)
        d.text(((x0 + x1) / 2, y0 + side * 14 * SS), text, fill=INK, font=f, anchor='mm')
    else:
        for y in (y0, y1): d.line([(x0 - t, y), (x0 + t, y)], fill=INK, width=SS)
        d.text((x0 + side * 8 * SS, (y0 + y1) / 2), text, fill=INK, font=f, anchor='lm' if side > 0 else 'rm')

def closeup(sole):
    W, H, ppm = 640 * SS, 230 * SS, 500 * SS                     # three prints, large enough to read
    img = Image.new('RGB', (W, H), FLOOR); d = ImageDraw.Draw(img); f = font(15 * SS)
    cy, x0 = H * 0.42, 85 * SS - STRIDE * ppm
    dashed(d, 0, W, cy, SS)
    steps = walk(3, seed=7)
    for dist, left, yaw, strength in steps:
        stamp(img, sole, x0 + dist * ppm, cy + (-FOOT if left else FOOT) * ppm, ppm, left, yaw, strength)
    xa, xb = x0 + steps[0][0] * ppm, x0 + steps[1][0] * ppm
    measure(d, (xa, H * 0.84), (xb, H * 0.84), '42 cm', f, 1)
    xm = x0 + steps[2][0] * ppm + 0.16 * ppm
    measure(d, (xm, cy - FOOT * ppm), (xm, cy), '6.5 cm', f, 1)
    d.text((xb + 0.21 * ppm, cy - 12 * SS), 'walking line', fill=GUIDE, font=font(13 * SS), anchor='mm')
    img.resize((W // SS, H // SS), Image.LANCZOS).save(OUT + 'fp-1-trail.png')

def full_trail(sole):
    steps = walk(100)
    W, H = 640 * SS, 90 * SS
    ppm = (W - 40 * SS) / (steps[-1][0] + 0.3)
    img = Image.new('RGB', (W, H), FLOOR); d = ImageDraw.Draw(img); f = font(13 * SS)
    cy = H * 0.36
    for dist, left, yaw, strength in steps:
        stamp(img, sole, 20 * SS + dist * ppm, cy + (-FOOT if left else FOOT) * ppm, ppm, left, yaw, strength)
    y = H * 0.74
    for m in range(0, 15, 2):
        x = 20 * SS + m * ppm
        if x > W - 10 * SS: break
        d.line([(x, y - 4 * SS), (x, y + 4 * SS)], fill=INK, width=SS)
        d.text((x, y + 14 * SS), f'{m} m', fill=INK, font=f, anchor='mm')
    d.line([(20 * SS, y), (20 * SS + steps[-1][0] * ppm, y)], fill=INK, width=SS)
    img.resize((W // SS, H // SS), Image.LANCZOS).save(OUT + 'fp-2-drying.png')
    return len(steps)

def soles(sole):
    W, H, ppm = 300 * SS, 250 * SS, 900 * SS
    img = Image.new('RGB', (W, H), FLOOR); d = ImageDraw.Draw(img); f = font(14 * SS)
    for cx, left, label in ((W * 0.3, True, 'left (flipped)'), (W * 0.7, False, 'right (the texture)')):
        s = sole.resize((round(PRINT_W * ppm), round(PRINT_L * ppm)), Image.LANCZOS)
        if left: s = s.transpose(Image.FLIP_LEFT_RIGHT)
        img.paste(Image.new('RGB', s.size, INK), (round(cx - s.width / 2), round(H * 0.44 - s.height / 2)), s.getchannel('A'))
        d.text((cx, H * 0.92), label, fill=INK, font=f, anchor='mm')
    img.resize((W // SS, H // SS), Image.LANCZOS).save(OUT + 'fp-sole.png')

if __name__ == '__main__':
    sole = Image.open(sys.argv[1]).convert('RGBA')
    closeup(sole)
    print('prints before the shoes dry:', full_trail(sole))
    soles(sole)
