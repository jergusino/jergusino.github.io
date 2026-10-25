"""Add ľ ť ď Ľ (Slovak 'apostrophe caron' letters) to a TTF in place: base glyph +
the font's own right single quote, placed just after the stem, advance widened.
Usage: python3 add_apos.py font.ttf [tight]"""
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

path = sys.argv[1]
tight = float(sys.argv[2]) if len(sys.argv) > 2 else 0.0
f = TTFont(path)
gs = f.getGlyphSet()
cmap = f.getBestCmap()
glyf, hmtx = f['glyf'], f['hmtx']


def bounds(name):
    bp = BoundsPen(gs)
    gs[name].draw(bp)
    return bp.bounds


q = cmap.get(ord('’')) or cmap.get(ord("'"))
qb = bounds(q)
added = []
for ch, base in {'ľ': 'l', 'ť': 't', 'ď': 'd', 'Ľ': 'L'}.items():
    if ord(ch) in cmap or ord(base) not in cmap:
        continue
    bn = cmap[ord(base)]
    bb = bounds(bn)
    adv, lsb = hmtx[bn]
    top = bb[3]
    x = (bb[2] if ch != 'ť' else bb[0] + (bb[2] - bb[0]) * 0.75) + (qb[2] - qb[0]) * (0.05 - tight) - qb[0]
    y = top - qb[3] + (0 if ch != 'ť' else (qb[3] - qb[1]) * 0.15)
    pen = TTGlyphPen(None)
    gs[bn].draw(pen)
    tp = TransformPen(pen, (1, 0, 0, 1, x, y))
    gs[q].draw(tp)
    g = 'uni%04X' % ord(ch)
    glyf[g] = pen.glyph()
    extra = max(0, x + qb[2] - adv) * (1 - min(1, tight)) if ch != 'ť' else 0
    hmtx[g] = (int(adv + extra + (qb[2] - qb[0]) * 0.1), lsb)
    for t in f['cmap'].tables:
        if t.isUnicode():
            t.cmap[ord(ch)] = g
    added.append(ch)
f.save(path)
print('added', ''.join(added), path)
