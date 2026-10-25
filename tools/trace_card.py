"""Trace the wordmark from the business card (Front.png) into SVG paths.

The card's letters are edited versions of Slithen (counters and bars were moved by hand), so the
website uses the card itself as the source of truth instead of the font's outlines.

Writes: _includes/wordmark.svg (one path per letter, for the rise animation), assets/img/wordmark.svg,
assets/img/mark.svg and favicon.svg.

Usage: python3 -I trace_card.py <Front.png> <site_dir>
"""
import os
import sys

import cv2
import numpy as np
from PIL import Image

card, site = sys.argv[1:3]
INK, CREAM, YELLOW = '#060909', '#FAF1D6', '#FFC600'
UP = 8                      # supersampling for the trace
EPS = 1.4                   # simplification tolerance, in supersampled px (0.18 card px)

rgb = np.asarray(Image.open(card).convert('RGB')).astype(np.float32)
R, G, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]
cream = np.clip((B - 9) / (214 - 9), 0, 1)                      # Ink 9, Cream 214, Yellow 0 in the blue channel
yellow = np.clip((R - B) / 255.0, 0, 1)                          # Yellow 255, Cream 36, Ink 0

TOP = 300                    # everything above is the script "i am"
cream[:TOP] = 0
yellow[:TOP] = 0

# letter columns (x ranges of the cream ink in the card), found from the image
cols = (cream > 0.5).any(0)
runs, st = [], None
for x, v in enumerate(cols):
    if v and st is None:
        st = x
    if not v and st is not None:
        runs.append((st, x - 1))
        st = None
if st is not None:
    runs.append((st, len(cols) - 1))
assert len(runs) == 9, runs

ys, xs = np.where(cream > 0.5)
X0, Y0 = int(xs.min()), int(ys.min())          # the wordmark's top-left corner on the card
W = int(xs.max()) - X0 + 1
H = int(ys.max()) - Y0 + 1


def trace(mask, x_lo, x_hi, y_lo, y_hi, pad=3):
    """Closed contours of mask>0.5 inside the box, in wordmark coordinates (card px, origin X0,Y0)."""
    x_lo, y_lo = max(0, x_lo - pad), max(0, y_lo - pad)
    x_hi, y_hi = min(mask.shape[1], x_hi + pad + 1), min(mask.shape[0], y_hi + pad + 1)
    crop = mask[y_lo:y_hi, x_lo:x_hi]
    big = cv2.resize(crop, None, fx=UP, fy=UP, interpolation=cv2.INTER_CUBIC)
    bw = (big > 0.5).astype(np.uint8)
    cs, _ = cv2.findContours(bw, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    d = ''
    for c in cs:
        if cv2.contourArea(c) < 20:
            continue
        c = cv2.approxPolyDP(c, EPS, True)[:, 0, :].astype(np.float64)
        px = (c[:, 0] + 0.5) / UP + x_lo - X0
        py = (c[:, 1] + 0.5) / UP + y_lo - Y0
        d += 'M' + ' '.join('%.2f %.2f' % (a, b) for a, b in zip(px, py)).replace(' ', ',', 0) + 'Z'
    return d.replace('M', 'M').replace(',', ',')


def pathify(d):
    # "x y x y ..." -> "x y L x y ..." keeps the file small and valid
    out = []
    for sub in d.split('M')[1:]:
        pts = sub.rstrip('Z').split(' ')
        pairs = [pts[i] + ' ' + pts[i + 1] for i in range(0, len(pts), 2)]
        out.append('M' + pairs[0] + 'L' + ' '.join(pairs[1:]) + 'Z')
    return ''.join(out)


letters = []
for lo, hi in runs:
    letters.append(pathify(trace(cream, lo, hi, Y0, Y0 + H)))

# the bar: the yellow rectangle above the S (6th letter); ignore the script's yellow elsewhere
yellow[:, :runs[5][0] - 6] = 0
yellow[:, runs[5][1] + 7:] = 0
yellow[:310] = 0
yb = np.where(yellow > 0.5)
bx0, bx1, by0, by1 = int(yb[1].min()), int(yb[1].max()), int(yb[0].min()), int(yb[0].max())
bar_d = pathify(trace(yellow, bx0, bx1, by0, by1))
bar_x, bar_y, bar_w, bar_h = bx0 - X0, by0 - Y0, bx1 - bx0 + 1, by1 - by0 + 1
s_x0, s_x1 = runs[5]

os.makedirs(os.path.join(site, '_includes'), exist_ok=True)
os.makedirs(os.path.join(site, 'assets', 'img'), exist_ok=True)

inline = (
    f'<svg class="wordmark" viewBox="0 0 {W} {H}" role="img" aria-label="Jergušino" xmlns="http://www.w3.org/2000/svg">'
    + ''.join(f'<path class="wm-l" style="--i:{i}" d="{d}"/>' for i, d in enumerate(letters))
    + f'<path class="wm-bar" d="{bar_d}"/></svg>\n'
)
open(os.path.join(site, '_includes', 'wordmark.svg'), 'w').write(inline)

open(os.path.join(site, 'assets', 'img', 'wordmark.svg'), 'w').write(
    f'<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg"><rect width="{W}" height="{H}" fill="{INK}"/>'
    f'<path fill="{CREAM}" fill-rule="evenodd" d="{"".join(letters)}"/><path fill="{YELLOW}" d="{bar_d}"/></svg>\n'
)

# the mark: the S with its bar, centred in a square of Ink
SQ = 360
mx = (SQ - (s_x1 - s_x0 + 1)) / 2 - (s_x0 - X0)
my = (SQ - H) / 2
mark = (
    f'<svg viewBox="0 0 {SQ} {SQ}" xmlns="http://www.w3.org/2000/svg"><rect width="{SQ}" height="{SQ}" fill="{INK}"/>'
    f'<g transform="translate({mx:.2f} {my:.2f})"><path fill="{CREAM}" fill-rule="evenodd" d="{letters[5]}"/><path fill="{YELLOW}" d="{bar_d}"/></g></svg>\n'
)
open(os.path.join(site, 'assets', 'img', 'mark.svg'), 'w').write(mark)
open(os.path.join(site, 'favicon.svg'), 'w').write(mark)
print('traced', W, 'x', H, '| bar', bar_x, bar_y, bar_w, bar_h, '| bytes', len(inline))
