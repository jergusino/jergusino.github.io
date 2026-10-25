"""Build the Jergusino site assets from the original fonts.

1. Patches Slovak letters into Slithen and Borisna (see add_carons.py / add_apos.py)
   and writes TTF + WOFF files for the website.
2. Draws the wordmark and the Š mark as outlined SVG from Slithen, using the
   construction numbers in the brand guide (v5, section 4).

Usage: python3 -I build_assets.py <slithen.ttf> <borisna.ttf> <site_dir> [edwardian.ttf]
"""
import os
import shutil
import subprocess
import sys
import tempfile

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
slithen_src, borisna_src, site = sys.argv[1:4]
edwardian_src = sys.argv[4] if len(sys.argv) > 4 else None
INK, CREAM, YELLOW = '#060909', '#FAF1D6', '#FFC600'

fonts_dir = os.path.join(site, 'assets', 'fonts')
img_dir = os.path.join(site, 'assets', 'img')
os.makedirs(fonts_dir, exist_ok=True)
os.makedirs(img_dir, exist_ok=True)
os.makedirs(os.path.join(site, '_includes'), exist_ok=True)

# ── 1. fonts ─────────────────────────────────────────────────────────────────
tmp = tempfile.mkdtemp()
to_patch = [('Slithen', slithen_src, '0'), ('Borisna', borisna_src, '0')]
if edwardian_src:
    to_patch.append(('Edwardian', edwardian_src, '0.35'))  # slanted script: pull the apostrophe in
for name, src, tight in to_patch:
    mid = os.path.join(tmp, name + '.ttf')
    subprocess.run([sys.executable, '-I', os.path.join(HERE, 'add_carons.py'), src, mid], check=True)
    subprocess.run([sys.executable, '-I', os.path.join(HERE, 'add_apos.py'), mid, tight], check=True)
    shutil.copy(mid, os.path.join(fonts_dir, name + '.ttf'))
    f = TTFont(mid)
    f.flavor = 'woff'
    f.save(os.path.join(fonts_dir, name + '.woff'))

# ── 2. wordmark ──────────────────────────────────────────────────────────────
font = TTFont(slithen_src)
gs = font.getGlyphSet()
cmap = font.getBestCmap()

W, H = 1019, 262          # wordmark box (card)
GAP = 8.5                 # letter gap (card: 8 to 9 px)
BAR_H, BAR_GAP, BAR_R = 46, 10, 8
WORD = 'JERGUSINO'


def ink(ch):
    bp = BoundsPen(gs)
    gs[cmap[ord(ch)]].draw(bp)
    return bp.bounds  # xmin, ymin, xmax, ymax


widths = [ink(c)[2] - ink(c)[0] for c in WORD]
sx = (W - GAP * (len(WORD) - 1)) / sum(widths)   # horizontal scale so the word is exactly W wide
sy = H / 700.0                                    # cap height = full wordmark height
s_sy = (H - BAR_H - BAR_GAP) / 700.0              # the S is shorter: bar + gap sit above it


def glyph_path(ch, x0, sx_, sy_):
    b = ink(ch)
    pen = SVGPathPen(gs, ntos=lambda v: ('%.2f' % v).rstrip('0').rstrip('.'))
    # x' = x0 + (gx - xmin) * sx ; y' = H - gy * sy   (SVG y runs down)
    tp = TransformPen(pen, (sx_, 0, 0, -sy_, x0 - b[0] * sx_, H))
    gs[cmap[ord(ch)]].draw(tp)
    return pen.getCommands()


x = 0.0
letters = []
bar = None
for ch, w in zip(WORD, widths):
    is_s = ch == 'S'
    d = glyph_path(ch, x, sx, s_sy if is_s else sy)
    letters.append(d)
    if is_s:
        bar = (x, w * sx)
    x += w * sx + GAP
assert abs((x - GAP) - W) < 0.5, x
bar_x, bar_w = bar
d_all = ' '.join(letters)


def bar_rect(x_, y_, w_, cls=None, fill=None):
    attrs = f'x="{x_:.2f}" y="{y_:.2f}" width="{w_:.2f}" height="{BAR_H}" rx="{BAR_R}"'
    attrs += f' class="{cls}"' if cls else f' fill="{fill}"'
    return f'<rect {attrs}/>'


# inline version for templates (colours come from CSS)
inline = (
    f'<svg class="wordmark" viewBox="0 0 {W} {H}" role="img" aria-label="Jergušino" xmlns="http://www.w3.org/2000/svg">'
    f'<path class="wm-letters" d="{d_all}"/>{bar_rect(bar_x, 0, bar_w, cls="wm-bar")}</svg>\n'
)
open(os.path.join(site, '_includes', 'wordmark.svg'), 'w').write(inline)

# standalone files, brand colours baked in
open(os.path.join(img_dir, 'wordmark.svg'), 'w').write(
    f'<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg"><rect width="{W}" height="{H}" fill="{INK}"/>'
    f'<path fill="{CREAM}" d="{d_all}"/>{bar_rect(bar_x, 0, bar_w, fill=YELLOW)}</svg>\n'
)

# the mark: the S with its bar, centred in a square of Ink with at least one bar-height of clear space
SQ = 360
s_w = bar_w
mx = (SQ - s_w) / 2
my = (SQ - H) / 2
s_d = glyph_path('S', mx, sx, s_sy)
# glyph_path places y with the wordmark baseline at H; shift into the square
mark_body = (
    f'<g transform="translate(0 {my:.2f})"><path fill="{CREAM}" d="{s_d}"/>'
    f'{bar_rect(mx, 0, s_w, fill=YELLOW)}</g>'
)
mark = f'<svg viewBox="0 0 {SQ} {SQ}" xmlns="http://www.w3.org/2000/svg"><rect width="{SQ}" height="{SQ}" fill="{INK}"/>{mark_body}</svg>\n'
open(os.path.join(img_dir, 'mark.svg'), 'w').write(mark)
open(os.path.join(site, 'favicon.svg'), 'w').write(mark)
print('wordmark ok: S x=%.1f w=%.1f, sx=%.4f sy=%.4f, S sy=%.4f' % (bar_x, bar_w, sx, sy, s_sy))
