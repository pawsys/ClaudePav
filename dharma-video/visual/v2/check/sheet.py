# Contact sheet of PNG stills (sorted by name), labelled. usage: python3 -I sheet.py <dir> <out.png> [cell_w=360] [cols=6] [labels.txt]
import sys, os
from PIL import Image, ImageDraw, ImageFont
d, out = sys.argv[1], sys.argv[2]
cw = int(sys.argv[3]) if len(sys.argv) > 3 else 360
cols = int(sys.argv[4]) if len(sys.argv) > 4 else 6
names = {}
if len(sys.argv) > 5 and os.path.exists(sys.argv[5]):
    for ln in open(sys.argv[5]):
        if '\t' in ln: k, v = ln.rstrip('\n').split('\t', 1); names[k] = v
files = sorted(f for f in os.listdir(d) if f.endswith('.png') and f.startswith('still_'))
ch = int(cw * 1350 / 1080); pad = 10; lab = 30
here = os.path.dirname(os.path.abspath(__file__))
try: font = ImageFont.truetype(os.path.join(here, '../../fonts/JetBrainsMono-SemiBold.ttf'), 16)
except Exception: font = ImageFont.load_default()
rows = (len(files) + cols - 1) // cols
S = Image.new('RGB', (pad + cols * (cw + pad), pad + rows * (ch + lab + pad)), (14, 11, 26))
dr = ImageDraw.Draw(S)
for i, f in enumerate(files):
    im = Image.open(os.path.join(d, f)).convert('RGB').resize((cw, ch), Image.LANCZOS)
    x = pad + (i % cols) * (cw + pad); y = pad + (i // cols) * (ch + lab + pad)
    S.paste(im, (x, y))
    key = f[6:-4]
    dr.text((x, y + ch + 6), names.get(key, key), font=font, fill=(235, 230, 255))
S.save(out); print(out, S.size)
