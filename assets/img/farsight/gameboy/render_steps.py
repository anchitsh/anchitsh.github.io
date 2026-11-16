# Python port of Assets/Shaders/GameBoyCameraDither.shader, values from
# Resources/Gameboy/Game Boy Camera Filter.mat. Renders the page's step images at 288.
import sys, numpy as np
from PIL import Image
src_path, out = sys.argv[1], sys.argv[2]
N = 288
BLACK, WHITE, GAMMA, ROLL, HDR = 0.06, 0.6, 0.9, 0.3, 1.5
STRENGTH, CLEAN, SOFT = 1.0, 0.8, 1.2
PAL = np.array([[242]*3, [188]*3, [132]*3, [81]*3, [28]*3], np.uint8)  # light -> dark
B = np.array([0,32,8,40,2,34,10,42,48,16,56,24,50,18,58,26,12,44,4,36,14,46,6,38,60,28,52,20,62,30,54,22,
              3,35,11,43,1,33,9,41,51,19,59,27,49,17,57,25,15,47,7,39,13,45,5,37,63,31,55,23,61,29,53,21]).reshape(8,8)

im = Image.open(src_path).convert('RGB').crop((0, 0, 384, 384)).resize((N, N), Image.BOX if False else Image.LANCZOS)
im.save(f'{out}/gb-source.png')
s = np.asarray(im, np.float64) / 255
lin = np.where(s <= 0.04045, s / 12.92, ((s + 0.055) / 1.055) ** 2.4)

def bil(a, y, x):
    y = np.clip(y, 0, N - 1); x = np.clip(x, 0, N - 1)
    y0 = np.floor(y).astype(int); x0 = np.floor(x).astype(int)
    y1 = np.minimum(y0 + 1, N - 1); x1 = np.minimum(x0 + 1, N - 1)
    fy = (y - y0)[..., None]; fx = (x - x0)[..., None]
    return (a[y0, x0]*(1-fy)*(1-fx) + a[y0, x1]*(1-fy)*fx + a[y1, x0]*fy*(1-fx) + a[y1, x1]*fy*fx)

yy, xx = np.mgrid[0:N, 0:N].astype(np.float64)
col = lin * 0.4
for dy, dx in ((1,1),(1,-1),(-1,1),(-1,-1)):
    col = col + bil(lin, yy + dy*SOFT, xx + dx*SOFT) * 0.15
L = col @ np.array([0.2126, 0.7152, 0.0722])
over = np.maximum(L - 1, 0); L = np.where(L > 1, 1 + over / (1 + over*HDR), L)

# auto exposure, as GameBoyCameraFilter meters it (16x16, highlights capped at 0.78)
raw = lin @ np.array([0.2126, 0.7152, 0.0722])
m = raw.reshape(16, N//16, 16, N//16).mean((1, 3))
meter = np.minimum(m ** 0.4545, 0.78).mean()
exposure = float(sys.argv[5]) if len(sys.argv) > 5 else (3.0 if meter < 0.36 else 0.5)
print('meter', round(meter, 3), 'exposure', exposure)

lum = np.maximum(L * exposure, 0) ** 0.4545
x = np.maximum((lum - BLACK) / (WHITE - BLACK), 0)
knee = 1 - ROLL; o = np.maximum(x - knee, 0)
x = np.where(x > knee, knee + ROLL * (o / (o + ROLL)), x)
lum = np.minimum(x, 1) ** GAMMA
Image.fromarray((lum * 255 + 0.5).astype(np.uint8)).convert('RGB').save(f'{out}/gb-tone.png')

def quant(strength):
    t = (B[yy.astype(int) & 7, xx.astype(int) & 7] + 0.5) / 64
    e = np.clip((lum - 0.8) / 0.2, 0, 1); clean = e*e*(3 - 2*e) * CLEAN
    t = 0.5 + (t - 0.5) * strength * (1 - clean)
    q = np.clip(np.floor(lum * 4 + t) / 4, 0, 1)
    return PAL[np.rint((1 - q) * 4).astype(int)]
band, dith = quant(0.0), quant(STRENGTH)
Image.fromarray(band).save(f'{out}/gb-banded.png')
Image.fromarray(dith).save(f'{out}/gb-dithered.png')
zx, zy = int(sys.argv[3]), int(sys.argv[4])
for name, a in (('gb-zoom-banded', band), ('gb-zoom-dithered', dith)):
    Image.fromarray(a[zy:zy+72, zx:zx+72]).resize((288, 288), Image.NEAREST).save(f'{out}/{name}.png')
Image.fromarray(np.repeat(np.repeat(PAL[None, :, :], 24, 0), 288 // 5 + 1, 1)[:, :288]).save(f'{out}/gb-palette.png')
