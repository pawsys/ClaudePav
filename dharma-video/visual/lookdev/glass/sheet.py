# Labelled contact sheet for the glass lookdev stills. usage: python3 visual/lookdev/glass/sheet.py
from PIL import Image, ImageDraw, ImageFont
import numpy as np, textwrap, os
R = os.path.dirname(os.path.abspath(__file__)) + '/../../../'
O = R + 'out/lookdev/glass/'
F = R + 'visual/fonts/'
fT = ImageFont.truetype(F + 'JetBrainsMono-Bold.ttf', 26)
fL = ImageFont.truetype(F + 'JetBrainsMono-Bold.ttf', 19)
fS = ImageFont.truetype(F + 'JetBrainsMono-Medium.ttf', 15)
frames = [('000.00', '0.0 s  HOOK  clench', 'a colour-glass iris closes on the dark knot; poster frame'),
          ('012.50', '12.5 s  "it\'s this little guy."', 'the cause of all suffering as a church-window saint (unspoken word = unlit glass)'),
          ('022.20', '22.2 s  sung "un-clench"', 'the shell cracks off: the knot was a jewel; spectrum fan; iris opens'),
          ('026.50', '26.5 s  "you are the sky"', 'no lead lines left: open sky, rainbow refracted through his glass'),
          ('036.60', '36.6 s  DROP "the joy was free."', 'kaleidoscope rose clicks half a facet per beat; Hockney fields'),
          ('046.50', '46.5 s  metta "love him open."', 'af Klint glass rosette opens; open gold enso, dry brush'),
          ('057.00', '57.0 s  rest "just come back."', 'Moon Room: the same window at night lays its colours on the floor')]
def share(im):
    a = np.asarray(im.resize((32, 32), Image.BILINEAR)).astype(float) / 255
    mx = a.max(2); mn = a.min(2); s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    return ((s >= 0.25) & (mx >= 0.15)).mean()
cw, ch, pad, lab, cols, rows = 400, 500, 18, 104, 4, 2
S = Image.new('RGB', (pad + cols * (cw + pad), 64 + rows * (ch + lab + pad) + pad), (14, 11, 26)); d = ImageDraw.Draw(S)
d.text((pad, 18), 'UNCLENCH v2 lookdev  /  direction: TRANSLUCENT GLASS AND PRISM   (1080x1350 frames shown at 400 px)', font=fT, fill=(245, 240, 255))
for i, (k, a, b) in enumerate(frames):
    im = Image.open(O + f'still_{k}.png').convert('RGB')
    x = pad + (i % cols) * (cw + pad); y = 64 + (i // cols) * (ch + lab + pad)
    S.paste(im.resize((cw, ch), Image.LANCZOS), (x, y))
    d.text((x, y + ch + 8), a, font=fL, fill=(255, 236, 170))
    for j, ln in enumerate(textwrap.wrap(b, 44)[:2]): d.text((x, y + ch + 34 + j * 19), ln, font=fS, fill=(220, 215, 240))
    d.text((x, y + ch + 76), f'colourful share {share(im):.2f}', font=fS, fill=(140, 240, 190))
x = pad + 3 * (cw + pad); y = 64 + (ch + lab + pad)
notes = ["Shapes are where coloured glass overlaps:", " iris blades, window panes, kaleidoscope", " shards, af Klint circles, glass lobes.",
         "Grabbygrab = clear coloured glass: the GL", " pass refracts + disperses the world", " inside his outline; white-hot contour", " with a magenta/cyan prism fringe.",
         "The knot = the only opaque thing: dark", " lead-came tangle, split neon edge (12 Hz).", " Unclenched, it turns out to be a jewel.",
         "Lead lines = grasping. They crack at", " 22 s, are gone in the sky, return as", " the night window at rest.", "",
         "Light: 1 GL pass at 540x675 (lens, prism,", " iris, window, kaleidoscope, rosette,", " rainbow) + bloom; type/lines Canvas2D.", "Cost ~440-780 ms/frame (mean ~600)."]
for j, n in enumerate(notes): d.text((x, y + j * 21), n, font=fS, fill=(225, 220, 245))
for j, c in enumerate(['#2A1A8A', '#FF2E8A', '#14B8D0', '#FFC21F', '#8A4BFF', '#A8F02A', '#FF7A14', '#1C8BE6', '#FFB000', '#16237E']):
    d.rectangle([x + j * 38, y + ch + 40, x + j * 38 + 32, y + ch + 72], fill=c)
S.save(O + 'sheet.png'); print(O + 'sheet.png', S.size)
