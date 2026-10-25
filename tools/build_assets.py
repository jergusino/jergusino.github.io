"""Build the Jergusino site assets from the original fonts.

1. Patches Slovak letters into Slithen and Borisna (see add_carons.py / add_apos.py)
   and writes TTF + WOFF files for the website.
The wordmark and mark are NOT drawn from the font any more: the business card's letters are
edited versions of Slithen, so tools/trace_card.py traces them from Front.png instead.

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
print('fonts ok')
