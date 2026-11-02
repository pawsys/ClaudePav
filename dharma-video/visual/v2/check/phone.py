# Phone legibility sheets (LOOK.md 5.7): every still at 360 px wide (feed size on a phone) in one sheet, plus the
# 270x338 thumbnail of frame 0 (the poster test). usage: python3 -I phone.py <dir> [out_dir (default: dir)]
import sys, os, re
from PIL import Image, ImageDraw, ImageFont
d = sys.argv[1]; od = sys.argv[2] if len(sys.argv) > 2 else d
os.makedirs(od, exist_ok=True)
here = os.path.dirname(os.path.abspath(__file__))
try: font = ImageFont.truetype(os.path.join(here, '../../fonts/JetBrainsMono-SemiBold.ttf'), 16)
except Exception: font = ImageFont.load_default()
files = sorted(f for f in os.listdir(d) if re.match(r'still_\d+\.\d+\.png$', f))
W, H = 360, 450; cols = min(6, max(1, len(files))); pad = 8
rows = (len(files) + cols - 1) // cols
S = Image.new('RGB', (pad + cols * (W + pad), pad + rows * (H + 26 + pad)), (14, 11, 26)); dr = ImageDraw.Draw(S)
for i, f in enumerate(files):
    im = Image.open(os.path.join(d, f)).convert('RGB').resize((W, H), Image.LANCZOS)
    x = pad + (i % cols) * (W + pad); y = pad + (i // cols) * (H + 26 + pad)
    S.paste(im, (x, y)); dr.text((x, y + H + 4), f[6:-4] + ' s @ 360 px', font=font, fill=(235, 230, 255))
S.save(os.path.join(od, 'phone_sheet.png')); print(os.path.join(od, 'phone_sheet.png'), S.size)
f0 = os.path.join(d, 'still_000.00.png')
if os.path.exists(f0):
    t = Image.open(f0).convert('RGB').resize((270, 338), Image.LANCZOS)
    t.save(os.path.join(od, 'frame0_270.png'))
    big = t.resize((540, 676), Image.NEAREST); big.save(os.path.join(od, 'frame0_270_x2.png'))
    print(os.path.join(od, 'frame0_270.png'))
