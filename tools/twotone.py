"""Turn a photo into a true two-tone image: every pixel Ink or Cream (brand guide, "Images and footage").
The website already does this live for every image, so you only need this script if you want the
file itself converted (for social posts, for example).

Usage: python3 tools/twotone.py input.jpg output.png [threshold 0-255, default 128]
Needs Pillow:  pip install pillow
"""
import sys
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
threshold = int(sys.argv[3]) if len(sys.argv) > 3 else 128
INK, CREAM = (6, 9, 9), (250, 241, 214)

im = Image.open(src).convert('L')
out = Image.new('RGB', im.size, INK)
out.paste(Image.new('RGB', im.size, CREAM), mask=im.point(lambda v: 255 if v >= threshold else 0))
out.save(dst)
print('saved', dst)
