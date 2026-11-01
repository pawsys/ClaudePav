import sys, os; sys.path.insert(0,'.')
import numpy as np
from lib import *
B='build'; CYC=60
names=["piano","rhodes","pad","strings","sub","drums","perc","buzz","tanpura","bells","sfx","oohs","musicbox","harp","crackle","voice_narr","voice_guide","choir","choir_aahs2"]
G=dict(piano=1.6, rhodes=2.2, pad=0.55, strings=1.3, sub=0.32, drums=0.9, perc=1.4, buzz=1.0, tanpura=1.0, bells=0.9, harp=0.9, oohs=1.5, musicbox=0.9, crackle=0.9, sfx=1.0, choir_aahs2=0.5, voice_narr=1.6, voice_guide=1.6, choir=1.1)
print('stem      '+' '.join(f'{i+1:>5}' for i in range(20)))
for n in names:
    x=np.load(f'{B}/stem_{n}.npy')[CYC*SR:2*CYC*SR]*G.get(n,1)
    r=[20*np.log10(np.sqrt((mono(x[i*3*SR:(i+1)*3*SR])**2).mean())+1e-9) for i in range(20)]
    print(f'{n:10s}'+' '.join(f'{v:5.0f}' if v>-90 else '    .' for v in r))
