"""Write each project's dominant colour into its front matter as `color:` (used as the
placeholder while the poster image loads; the most common colour of the poster's edge). Run from the site folder:  python3 tools/poster_colors.py
Needs Pillow (pip install pillow)."""
import glob
import re

from PIL import Image

for f in sorted(glob.glob('_projects/*.md')):
    txt = open(f, encoding='utf-8').read()
    m = re.search(r'^thumb: (\S+)', txt, re.M) or re.search(r'^cover: (\S+)', txt, re.M)
    if not m:
        continue
    im = Image.open(m.group(1).lstrip('/')).convert('RGB')
    # the paper/background is what the eye reads first, so take the most common colour of the outer ring
    im = im.resize((50, 70))
    ring = [im.getpixel((x, y)) for x in range(50) for y in range(70) if x < 6 or x > 43 or y < 6 or y > 63]
    strip = Image.new('RGB', (len(ring), 1))
    strip.putdata(ring)
    q = strip.quantize(colors=4, method=Image.Quantize.MEDIANCUT)
    pal = q.getpalette()
    idx = max(q.getcolors(), key=lambda c: c[0])[1]
    r, g, b = pal[idx * 3: idx * 3 + 3]
    col = '#%02x%02x%02x' % (r, g, b)
    txt = re.sub(r'^color: .*\n', '', txt, flags=re.M)
    txt = re.sub(r'^(thumb: .*\n)', r'\1color: "%s"\n' % col, txt, count=1, flags=re.M)
    open(f, 'w', encoding='utf-8').write(txt)
    print(f, col)
