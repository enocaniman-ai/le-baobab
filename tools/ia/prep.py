"""Améliore les photos et prépare les textures de splats (couleur détourée + profondeur)."""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
SRC, AI, SITE = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
names = {4:'garba',5:'riz-gras-poisson',6:'alloco-oeufs',7:'foutou-banane-sauce-graine',8:'foutou-igname-gombo',9:'attieke-poisson-braise',
 10:'eau-minerale',11:'coca-cola',12:'red-bull',13:'monster',14:'desperados',15:'vody',16:'jus-bissap',17:'jus-orange',23:'gbofloto',25:'choukouya'}
(SITE/'assets/splat').mkdir(parents=True, exist_ok=True)

def solid_bottle(alpha):
    """Boissons : silhouette pleine (le plastique transparent laisse des trous dans
    le détourage) et suppression des éléments à côté (glaçons, éclaboussures)."""
    a = np.asarray(alpha).astype(np.float32)
    on = a > 40
    cx = int(np.argmax(on.sum(0)))  # colonne la plus couverte = axe de la bouteille
    halves = []
    rows = []
    for y in range(a.shape[0]):
        xs = np.flatnonzero(on[y])
        if xs.size == 0 or not on[y, max(0, cx-3):cx+4].any():
            rows.append(None); continue
        # segment continu (petits trous tolérés) qui contient l'axe
        gaps = np.flatnonzero(np.diff(xs) > 6)
        starts = np.r_[xs[0], xs[gaps + 1]]; ends = np.r_[xs[gaps], xs[-1]]
        k = [i for i in range(len(starts)) if starts[i] - 4 <= cx <= ends[i] + 4]
        if not k: rows.append(None); continue
        l, r = starts[k[0]], ends[k[0]]
        rows.append((l, r)); halves.append(max(cx - l, r - cx))
    lim = np.percentile(halves, 92) * 1.04 if halves else 1e9
    out = np.zeros_like(a)
    for y, seg in enumerate(rows):
        if seg is None: continue
        l, r = max(seg[0], cx - lim), min(seg[1], cx + lim)
        out[y, int(l):int(r) + 1] = 255
    m = Image.fromarray(out.astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    return m

def enhance(im):
    if max(im.size) < 700:  # petites photos : agrandissement doux
        k = 700 / max(im.size); im = im.resize((round(im.width*k), round(im.height*k)), Image.LANCZOS)
    im = ImageOps.autocontrast(im, cutoff=0.5, preserve_tone=True)
    im = ImageEnhance.Color(im).enhance(1.14)
    im = ImageEnhance.Contrast(im).enhance(1.06)
    return im.filter(ImageFilter.UnsharpMask(radius=1.6, percent=70, threshold=2))

for n, name in names.items():
    photo = enhance(Image.open(SRC/f'{n}.jpg').convert('RGB'))
    big = photo.copy(); big.thumbnail((900, 900), Image.LANCZOS)
    big.save(SITE/f'assets/img/{name}.webp', 'WEBP', quality=70, method=6)
    (SITE/'assets/img/sm').mkdir(exist_ok=True)
    sm = photo.copy(); sm.thumbnail((420, 420), Image.LANCZOS)
    sm.save(SITE/f'assets/img/sm/{name}.webp', 'WEBP', quality=60, method=6)
    cut = Image.open(AI/f'{name}-cut.png').convert('RGBA')
    alpha = cut.getchannel('A').resize(photo.size, Image.LANCZOS)
    if 10 <= n <= 17: alpha = solid_bottle(alpha)
    color = photo.copy(); color.putalpha(alpha)
    depth = Image.open(AI/f'{name}-depth.png').convert('L').resize(photo.size, Image.BILINEAR)
    bb = alpha.point(lambda a: 255 if a > 24 else 0).getbbox()
    color, depth = color.crop(bb), depth.crop(bb)
    for im in (color, depth): pass
    k = min(1.0, (150000 / (color.width * color.height)) ** 0.5)
    color = color.resize((round(color.width*k), round(color.height*k)), Image.LANCZOS)
    depth = depth.resize(color.size, Image.BILINEAR).filter(ImageFilter.GaussianBlur(1.4))  # lisse : pas de déchirures
    color.save(SITE/f'assets/splat/{name}-color.webp', 'WEBP', quality=88, method=6)
    depth.save(SITE/f'assets/splat/{name}-depth.webp', 'WEBP', quality=90, method=6)
    # affiche (accueil) en plus grande résolution
    if name == 'garba':
        hi = photo.copy(); hi.putalpha(alpha); hi = hi.crop(bb); hi.thumbnail((440, 700), Image.LANCZOS)
        hi.save(SITE/'assets/img/garba-3d.webp', 'WEBP', quality=74, method=6)
        hi.thumbnail((240, 380), Image.LANCZOS)
        hi.save(SITE/'assets/img/garba-3d-sm.webp', 'WEBP', quality=72, method=6)
    print(name, color.size)
