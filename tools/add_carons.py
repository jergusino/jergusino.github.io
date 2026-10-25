"""Add missing caron letters (Č, Ľ, Ť, Ň, Ď, Ž ...) to a TTF by lifting the
caron contours out of Š/š and placing them centred over the base letter."""
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen

src, dst = sys.argv[1], sys.argv[2]
f = TTFont(src)
gs = f.getGlyphSet()
cmap = f.getBestCmap()
glyf, hmtx = f['glyf'], f['hmtx']


def contours(name):
    rp = RecordingPen()
    gs[name].draw(rp)
    out, cur = [], []
    for op in rp.value:
        cur.append(op)
        if op[0] in ('closePath', 'endPath'):
            out.append(cur)
            cur = []
    return out


def bounds_of(ops):
    bp = BoundsPen(gs)
    for op, args in ops:
        getattr(bp, op)(*args)
    return bp.bounds


def gbounds(name):
    bp = BoundsPen(gs)
    gs[name].draw(bp)
    return bp.bounds


def shifted(ops, dx, dy):
    out = []
    for op, args in ops:
        out.append((op, tuple((a[0] + dx, a[1] + dy) if isinstance(a, tuple) else a for a in args)))
    return out


def caron_from(accented, base):
    g = glyf[accented]
    if g.isComposite():
        others = [c for c in g.components if c.glyphName != base]
        cs = [shifted(c2, o.x, o.y) for o in others for c2 in contours(o.glyphName)]
    else:
        top = gbounds(base)[3]
        cs = [c for c in contours(accented) if bounds_of(c)[1] >= top - 5]
    allb = [bounds_of(c) for c in cs]
    xmin = min(b[0] for b in allb)
    xmax = max(b[2] for b in allb)
    return cs, (xmin + xmax) / 2


def safe(a, b):
    try:
        return caron_from(cmap[ord(a)], cmap[ord(b)])
    except ValueError:
        return None


UP = safe('Š', 'S')
LO = safe('š', 's')

targets = {'Č': 'C', 'Ľ': 'L', 'Ť': 'T', 'Ň': 'N', 'Ď': 'D', 'Ž': 'Z', 'Ř': 'R', 'Ě': 'E',
           'č': 'c', 'ň': 'n', 'ž': 'z'}
added = []
for ch, base in targets.items():
    if ord(ch) in cmap or ord(base) not in cmap:
        continue
    bname = cmap[ord(base)]
    src_c = UP if ch.isupper() else LO
    if src_c is None:
        continue
    cs, cx = src_c
    bb = gbounds(bname)
    if ch in 'ĽĎ':
        tx = (bb[0] + (bb[0] + (bb[2] - bb[0]) * 0.45)) / 2 - cx
    else:
        tx = (bb[0] + bb[2]) / 2 - cx
    pen = TTGlyphPen(None)
    gs[bname].draw(pen)
    tp = TransformPen(pen, (1, 0, 0, 1, tx, 0))
    for c in cs:
        for op, args in c:
            getattr(tp, op)(*args)
    gname = 'uni%04X' % ord(ch)
    glyf[gname] = pen.glyph()
    hmtx[gname] = hmtx[bname]
    for t in f['cmap'].tables:
        if t.isUnicode():
            t.cmap[ord(ch)] = gname
    added.append(ch)

if 'post' in f and hasattr(f['post'], 'extraNames'):
    f['post'].formatType = 3.0
f.save(dst)
print('added', ''.join(added), '->', dst)
