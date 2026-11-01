#!/usr/bin/env bash
# Full build: audio -> frames -> final mp4 (1080x1350, 30 fps, 60.000 s loop)
set -euo pipefail
cd "$(dirname "$0")"
if [ "${SKIP_AUDIO:-0}" != "1" ]; then
  (cd audio && python3 song.py && python3 vocals.py && python3 mix.py)
fi
(cd visual && sed -i "s/'-crf', '14'/'-crf', '12'/" render.js && node render.js --out ../out/video_noaudio.mp4 --start 0 --end 60 --workers ${WORKERS:-3} --quality 96)
ffmpeg -y -loglevel error -i out/video_noaudio.mp4 -i out/unclench_audio.wav \
  -c:v libx264 -preset slow -crf 16 -tune animation -pix_fmt yuv420p -r 30 \
  -c:a aac -b:a 256k -ar 48000 -movflags +faststart -shortest out/unclench.mp4
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,nb_frames,r_frame_rate -of compact out/unclench.mp4
