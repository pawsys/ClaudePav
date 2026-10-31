import time, soundfile as sf, numpy as np
from kokoro_onnx import Kokoro
k = Kokoro("/tmp/dl/kokoro-v1.0.onnx", "/tmp/dl/voices-v1.0.bin")
print(sorted(k.get_voices()))
t=time.time()
for v in ["af_heart","af_bella","af_nicole","bf_emma","am_michael","bm_george","am_puck","af_sky"]:
    a, sr = k.create("You are not the cloud. You are the sky.", voice=v, speed=0.9, lang="en-us")
    sf.write(f"audio/tests/{v}.wav", a, sr)
    print(v, sr, len(a)/sr)
print("time", time.time()-t)
