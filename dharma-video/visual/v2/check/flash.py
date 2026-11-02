# Flash count (LOOK.md 2.10): mean luminance per frame from the video; a flash is a rise of >= 0.10 followed by a fall
# of >= 0.10 (or the reverse). Gate: <= 3 flashes in any 1 s window.
# usage: python3 -I flash.py <video.mp4> [--plot out.png]
import sys, subprocess
import numpy as np
v = sys.argv[1]
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', v, '-vf', 'scale=54:68,format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, 68 * 54).astype(float) / 255
L = fr.mean(1); n = len(L)
# turning points with hysteresis 0.10
ext = [(0, L[0])]; direction = 0
for i in range(1, n):
    x = L[i]; j, y = ext[-1]
    if direction >= 0 and x > y: ext[-1] = (i, x) if direction == 1 else ext[-1]
    if direction <= 0 and x < y: ext[-1] = (i, x) if direction == -1 else ext[-1]
    if direction == 0 and abs(x - y) >= 0.10: direction = 1 if x > y else -1; ext.append((i, x))
    elif direction == 1:
        if x > ext[-1][1]: ext[-1] = (i, x)
        elif ext[-1][1] - x >= 0.10: direction = -1; ext.append((i, x))
    elif direction == -1:
        if x < ext[-1][1]: ext[-1] = (i, x)
        elif x - ext[-1][1] >= 0.10: direction = 1; ext.append((i, x))
trans = [ext[k][0] for k in range(1, len(ext))]           # frame of each >= 0.10 transition end
# a flash is a PAIR of opposing transitions (a rise then a fall, or the reverse): in each 30-frame window the number
# of flashes is the number of transitions in it // 2 (counting every transition after the first over-counts 2x)
worst, at = 0, 0
for i in range(n):
    c = sum(1 for f in trans if i <= f < i + 30) // 2
    if c > worst: worst, at = c, i
print(f'frames {n}, mean luma {L.mean():.3f}, transitions {len(trans)}, flashes ~{len(trans) // 2}')
print(f'worst 1 s window: {worst} flashes starting at frame {at} ({at / 30:.2f} s)  ->  {"PASS" if worst <= 3 else "FAIL"}')
sys.exit(0 if worst <= 3 else 1)
