# Diagrams for Farsight_Drawing.html.
# The smoothing panel is a port of the pointer path in MaterialDrawingSurface.cs
# (dead zone -> SmoothDamp spring -> centripetal Catmull-Rom), with the Pencil preset.
# Usage: python3 scripts/drawing.py   (from the site root)
import math, random
from PIL import Image, ImageDraw

OUT = 'assets/img/farsight/drawing/'
BG, RED, INK = (246, 243, 236), (190, 120, 110), (28, 32, 40)
W, H, SS = 640, 300, 3

def smooth_damp(cur, target, vel, smooth_time, dt):   # UnityEngine.Vector2.SmoothDamp, no max speed
    omega = 2.0 / smooth_time; x = omega * dt
    e = 1.0 / (1.0 + x + 0.48 * x * x + 0.235 * x * x * x)
    ch = (cur[0] - target[0], cur[1] - target[1])
    tmp = ((vel[0] + omega * ch[0]) * dt, (vel[1] + omega * ch[1]) * dt)
    vel = ((vel[0] - omega * tmp[0]) * e, (vel[1] - omega * tmp[1]) * e)
    out = (target[0] + (ch[0] + tmp[0]) * e, target[1] + (ch[1] + tmp[1]) * e)
    if (target[0] - cur[0]) * (out[0] - target[0]) + (target[1] - cur[1]) * (out[1] - target[1]) > 0:
        out = target; vel = (0.0, 0.0)
    return out, vel

def catmull(p0, p1, p2, p3, u):
    d = lambda a, b: max(1e-3, math.sqrt(math.dist(a, b)))
    t0 = 0.0; t1 = t0 + d(p0, p1); t2 = t1 + d(p1, p2); t3 = t2 + d(p2, p3)
    t = t1 + (t2 - t1) * u
    mix = lambda a, b, ta, tb: tuple((tb - t) / (tb - ta) * a[i] + (t - ta) / (tb - ta) * b[i] for i in (0, 1))
    a1, a2, a3 = mix(p0, p1, t0, t1), mix(p1, p2, t1, t2), mix(p2, p3, t2, t3)
    b1, b2 = mix(a1, a2, t0, t2), mix(a2, a3, t1, t3)
    return mix(b1, b2, t1, t2)

def simulate(raw, dead_zone, inertia, dt=1 / 60):
    anchor = tip = prev = raw[0]; vel = (0.0, 0.0); path = [tip]
    for p in raw + [raw[-1]] * 20:                     # extra frames let the tip catch up at the end
        dx, dy = p[0] - anchor[0], p[1] - anchor[1]; m = math.hypot(dx, dy)
        if m > dead_zone:
            k = (m - dead_zone) / m; anchor = (anchor[0] + dx * k, anchor[1] + dy * k)
        nxt, vel = smooth_damp(tip, anchor, vel, max(inertia, 0.001), dt)
        steps = max(1, min(48, math.ceil(math.dist(tip, nxt) / 2.5)))
        for i in range(1, steps + 1):
            path.append(catmull(prev, tip, nxt, anchor, i / steps))
        prev, tip = tip, nxt
    return path

def pointer(corners, speed, jitter, dt=1 / 60, seed=4):
    rnd = random.Random(seed); pts = []; i = 0; pos = corners[0]
    while i < len(corners) - 1:
        pts.append((pos[0] + rnd.gauss(0, jitter), pos[1] + rnd.gauss(0, jitter)))
        step = speed * dt
        while step > 0 and i < len(corners) - 1:
            d = math.dist(pos, corners[i + 1])
            if d <= step: step -= d; pos = corners[i + 1]; i += 1
            else:
                pos = (pos[0] + (corners[i + 1][0] - pos[0]) * step / d, pos[1] + (corners[i + 1][1] - pos[1]) * step / d); step = 0
    return pts

def zigzag():
    scale = 4                                           # one texture pixel = 4 diagram pixels
    corners = [(18, 58), (42, 18), (66, 58), (90, 18), (114, 58), (142, 18)]
    raw = pointer(corners, speed=260, jitter=0.7)
    path = simulate(raw, dead_zone=1.0, inertia=0.018)  # Pencil.asset
    im = Image.new('RGB', (W * SS, H * SS), BG); d = ImageDraw.Draw(im)
    S = lambda p: (p[0] * scale * SS, p[1] * scale * SS)
    d.line([S(p) for p in raw], fill=RED, width=SS)
    for p in raw:
        x, y = S(p); r = 2.2 * SS; d.ellipse((x - r, y - r, x + r, y + r), fill=RED)
    d.line([S(p) for p in path], fill=INK, width=int(2.4 * SS), joint='curve')
    im.resize((W, H), Image.LANCZOS).save(OUT + 'draw-1b-zigzag.png')

def dirty():
    im = Image.new('RGB', (W * SS, H * SS), BG); d = ImageDraw.Draw(im)
    R = lambda *v: tuple(x * SS for x in v)
    d.rectangle(R(150, 20, 490, 280), fill=(255, 255, 255), outline=(200, 196, 188), width=SS)
    for y in range(50, 270, 22):
        d.line(R(166, y, 474, y), fill=(214, 222, 232), width=SS)
    pts = [(190 + t * 2.3, 150 - 46 * math.sin(t / 17.0) - t * 0.18) for t in range(0, 101)]
    d.line([R(*p) for p in pts], fill=INK, width=int(2.6 * SS), joint='curve')
    tail = pts[-9:]                                     # the stamps laid down this frame
    xs, ys = [p[0] for p in tail], [p[1] for p in tail]
    d.rectangle(R(min(xs) - 7, min(ys) - 7, max(xs) + 7, max(ys) + 7), outline=(200, 60, 50), width=int(1.5 * SS))
    im.resize((W, H), Image.LANCZOS).save(OUT + 'draw-4-dirty.png')

zigzag(); dirty()
