import sys, os, json; sys.path.insert(0,'.')
import numpy as np, soundfile as sf
from lib import *; from asr import asr, wer
m,_ = sf.read('../out/unclench_audio.wav', dtype='float32')
S = json.load(open('../script.json'))
narr = np.load('build/stem_voice_narr.npy')[60*SR:120*SR]; guide = np.load('build/stem_voice_guide.npy')[60*SR:120*SR]
dry = narr + guide
tot_m = tot_d = 0
for ln in S['spoken']:
    a = int(ln['t']*SR); b = a + int(2.4*SR)
    hm = asr(mono(m[a:b])); hd = asr(mono(dry[a:b]))
    wm, wd = wer(ln['text'], hm), wer(ln['text'], hd)
    tot_m += wm; tot_d += wd
    print(f"{ln['id']:5} dry={wd:.2f} mix={wm:.2f} | {ln['text']!r} -> mix: {hm!r}")
print('avg WER dry', round(tot_d/len(S['spoken']),3), 'mix', round(tot_m/len(S['spoken']),3))
