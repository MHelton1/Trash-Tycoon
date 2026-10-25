# Draws the app icons: a garbage truck on the Roundsman navy. Use: python3 tools/icons.py
from PIL import Image, ImageDraw
import os
out = os.path.join(os.path.dirname(__file__), '..', 'web', 'icons')
def draw(size, pad):
    S = 1024; im = Image.new('RGBA', (S, S), '#14284B'); d = ImageDraw.Draw(im)
    k = (1 - 2 * pad); o = S * pad
    P = lambda x, y: (o + x * k, o + y * k)
    def rect(x0, y0, x1, y1, fill, r=0): d.rounded_rectangle([P(x0, y0), P(x1, y1)], radius=r * k, fill=fill)
    def circ(x, y, r, fill): d.ellipse([P(x - r, y - r), P(x + r, y + r)], fill=fill)
    rect(0, 840, 1024, 1024, '#2A3856')                # road
    rect(150, 330, 690, 720, '#2F6B4F', 40)             # body
    rect(690, 430, 900, 720, '#ECE8DA', 40)             # cab
    rect(730, 470, 860, 580, '#7FA3DA', 18)             # window
    rect(110, 600, 170, 720, '#8F6F1F', 10)             # hopper lip
    for x in (250, 330, 410, 490, 570): rect(x, 380, x + 40, 660, '#3F8F6A', 12)   # ribs
    for x in (280, 560, 790): circ(x, 760, 85, '#0C1424'); circ(x, 760, 35, '#9FAEC6')
    im = im.resize((size, size), Image.LANCZOS)
    return im
os.makedirs(out, exist_ok=True)
draw(512, 0.08).save(os.path.join(out, 'icon-512.png'))
draw(192, 0.08).save(os.path.join(out, 'icon-192.png'))
draw(180, 0.08).convert('RGB').save(os.path.join(out, 'icon-180.png'))
draw(512, 0.2).save(os.path.join(out, 'icon-maskable-512.png'))
draw(1024, 0.2).convert('RGB').save(os.path.join(out, '..', '..', 'apps', 'mobile', 'assets', 'icon-only.png')) if os.path.isdir(os.path.join(out, '..', '..', 'apps', 'mobile', 'assets')) else None
print('icons written')
