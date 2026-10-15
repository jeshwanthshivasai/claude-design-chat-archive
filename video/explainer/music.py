"""Synthesizes the explainer's soundtrack and sound effects from src/timeline.json.

100 BPM, D minor tension that lifts into F major at the reveal. Every sound is generated here
(no samples), so the track is ours to publish. Output: public/soundtrack.wav (48 kHz stereo).
Run: python3 music.py
"""
import json, os
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

HERE = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(HERE, 'src', 'timeline.json')))
SR = 48000
FPS, BPM = T['fps'], T['bpm']
BEAT = 60 / BPM
BAR = 4 * BEAT
DUR = T['durationInFrames'] / FPS + 1.5
N = int(DUR * SR)
rng = np.random.default_rng(7)

L = np.zeros(N); R = np.zeros(N)          # dry mix
RV = np.zeros(N)                          # reverb send (mono)

def t_of_bar(b, beat=0.0): return b * BAR + beat * BEAT
def idx(t): return int(round(t * SR))
def env_adsr(n, a, d, s, r, sr=SR):
    a, d, r = int(a * sr), int(d * sr), int(r * sr)
    e = np.ones(n) * s
    if a: e[:min(a, n)] = np.linspace(0, 1, a)[:min(a, n)]
    if d and a < n: seg = min(d, n - a); e[a:a + seg] = np.linspace(1, s, d)[:seg]
    if r and r < n: e[-r:] *= np.linspace(1, 0, r)
    return e
def lp(x, f, order=2): return sosfilt(butter(order, f / (SR / 2), 'low', output='sos'), x)
def hp(x, f, order=2): return sosfilt(butter(order, f / (SR / 2), 'high', output='sos'), x)
def bp(x, lo, hi, order=2): return sosfilt(butter(order, [lo / (SR / 2), hi / (SR / 2)], 'band', output='sos'), x)
def add(sig, t, gain=1.0, pan=0.0, send=0.0):
    i = idx(t)
    if i >= N: return
    sig = sig[:N - i]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    L[i:i + len(sig)] += sig * gain * l * 1.414
    R[i:i + len(sig)] += sig * gain * r * 1.414
    if send: RV[i:i + len(sig)] += sig * gain * send
def hz(midi): return 440.0 * 2 ** ((midi - 69) / 12)

# ---------------------------------------------------------------- instruments
def kick(gain=1.0):
    n = int(0.45 * SR); t = np.arange(n) / SR
    f = 46 + 90 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 7.5)
    click = hp(rng.standard_normal(n) * np.exp(-t * 300), 1500) * 0.15
    return np.tanh((body + click) * 1.6) * gain

def snare(gain=1.0):
    n = int(0.25 * SR); t = np.arange(n) / SR
    noise = bp(rng.standard_normal(n), 1200, 7000) * np.exp(-t * 22)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.5
    return (noise * 0.7 + tone) * gain

def hat(gain=1.0, open_=False):
    n = int((0.22 if open_ else 0.05) * SR); t = np.arange(n) / SR
    return hp(rng.standard_normal(n), 7000, 4) * np.exp(-t * (14 if open_ else 90)) * gain

def tick(pitch=2600, gain=1.0):
    n = int(0.03 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * pitch * t) + 0.4 * np.sin(2 * np.pi * pitch * 2.7 * t)) * np.exp(-t * 260) * gain

def pad_chord(notes, dur, gain=1.0, bright=1800):
    n = int(dur * SR); t = np.arange(n) / SR
    out = np.zeros(n)
    for m in notes:
        for det in (-0.07, 0.0, 0.08):
            f = hz(m + det)
            ph = rng.random()
            saw = 2 * ((f * t + ph) % 1.0) - 1
            out += saw
    out = lp(out / (len(notes) * 3), bright)
    return out * env_adsr(n, 0.35, 0.4, 0.85, 0.6) * gain

def bass_note(m, dur, gain=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    f = hz(m)
    x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t)
    return np.tanh(x * 1.4) * env_adsr(n, 0.005, 0.12, 0.6, 0.06) * gain

def pluck(m, dur=0.5, gain=1.0, damp=0.996):
    f = hz(m); n = int(dur * SR)
    period = int(SR / f)
    buf = rng.uniform(-1, 1, period)
    out = np.empty(n)
    for i in range(n):  # Karplus-Strong
        out[i] = buf[i % period]
        nxt = buf[(i + 1) % period]
        buf[i % period] = damp * 0.5 * (buf[i % period] + nxt)
    return lp(out, 5200) * np.exp(-np.arange(n) / SR * 3.2) * gain

def swept_noise(dur, path, gain=1.0):
    """Noise whose energy moves through bands along path(frac) -> position 0..1 (low..high)."""
    n = int(dur * SR); t = np.arange(n) / SR; frac = t / dur
    x = rng.standard_normal(n)
    centers = np.geomspace(250, 9000, 8)
    pos = path(frac) * (len(centers) - 1)
    out = np.zeros(n)
    for i, c in enumerate(centers):
        w = np.exp(-((pos - i) ** 2) / 0.8)
        out += bp(x, c / 1.5, min(c * 1.5, 23000)) * w
    return out * gain

def noise_riser(dur, gain=1.0):
    t = np.arange(int(dur * SR)) / SR
    return swept_noise(dur, lambda f: f ** 1.5, gain) * (t / dur) ** 2

def impact(gain=1.0):
    n = int(2.2 * SR); t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * (38 + 40 * np.exp(-t * 6)) * t) * np.exp(-t * 2.2)
    crack = bp(rng.standard_normal(n), 200, 4000) * np.exp(-t * 9) * 0.6
    return np.tanh((boom + crack) * 1.8) * gain

def stamp(gain=1.0):
    n = int(0.5 * SR); t = np.arange(n) / SR
    thump = np.sin(2 * np.pi * (60 + 80 * np.exp(-t * 40)) * t) * np.exp(-t * 16)
    slap = bp(rng.standard_normal(n), 700, 3500) * np.exp(-t * 55) * 0.9
    return np.tanh((thump + slap) * 2.0) * gain

def whoosh(dur=0.55, gain=1.0):
    t = np.arange(int(dur * SR)) / SR
    return swept_noise(dur, lambda f: 0.15 + 0.6 * np.sin(np.pi * f), gain) * np.sin(np.pi * t / dur) ** 2

def click(gain=1.0):
    n = int(0.04 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 3400 * t) * 0.6 + np.sin(2 * np.pi * 900 * t)) * np.exp(-t * 180) * gain

def pop(gain=1.0):
    n = int(0.12 * SR); t = np.arange(n) / SR
    f = 500 + 900 * np.exp(-t * 60)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 35) * gain

def typekey(gain=1.0):
    n = int(0.035 * SR); t = np.arange(n) / SR
    return bp(rng.standard_normal(n), 1500, 6000) * np.exp(-t * 160) * gain

def crumble(gain=1.0):
    n = int(1.4 * SR); t = np.arange(n) / SR
    grains = np.zeros(n)
    for _ in range(70):
        p = int(rng.random() ** 0.7 * (n - 2000)); g = typekey(rng.uniform(0.2, 0.7))
        grains[p:p + len(g)] += g
    return lp(grains, 4000) * np.exp(-t * 1.2) * gain

# ---------------------------------------------------------------- arrangement
# Chords per bar as MIDI notes (pad voicing) and bass root.
CH = {
    'Dm': ([62, 65, 69], 38), 'Bb': ([58, 62, 65], 34), 'Gm': ([55, 62, 67], 43), 'A': ([57, 61, 64], 33),
    'F': ([60, 65, 69], 41), 'C': ([60, 64, 67], 36), 'Asus': ([57, 62, 64], 33),
}
bars = ['Dm', 'Dm', 'Bb', 'Bb', 'Gm', 'A',            # 0-5   tension
        'F', 'C',                                      # 6-7   reveal
        'F', 'C', 'Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'F',   # 8-20 groove
        'Dm', 'Bb',                                    # 21-22 breakdown
        'F', 'C', 'Bb',                                # 23-25 CTA
        'F', 'F']                                      # 26-27 ending
section = lambda b: 'intro' if b < 4 else 'build' if b < 6 else 'reveal' if b < 8 else 'groove' if b < 21 else 'break' if b < 23 else 'cta' if b < 26 else 'end'

for b, name in enumerate(bars):
    notes, root = CH[name]
    sec = section(b)
    t0 = t_of_bar(b)
    last = b == len(bars) - 1
    # pad
    pad_gain = {'intro': 0.16, 'build': 0.2, 'reveal': 0.24, 'groove': 0.18, 'break': 0.32, 'cta': 0.22, 'end': 0.22}[sec]
    bright = {'intro': 900, 'build': 1400, 'break': 1100}.get(sec, 2200)
    dur = BAR * (3.2 if last else 1.12)
    add(pad_chord(notes, dur, pad_gain, bright), t0, pan=-0.2, send=0.5)
    add(pad_chord([n + 12 for n in notes[1:]], dur, pad_gain * 0.45, bright * 1.4), t0, pan=0.3, send=0.6)

    # clock ticks in the intro and build: the deadline
    if sec in ('intro', 'build'):
        for k in range(8):
            add(tick(2600 if k % 2 == 0 else 2100, 0.22 if sec == 'intro' else 0.28), t0 + k * BEAT / 2, pan=0.35 if k % 2 else -0.35, send=0.25)
        for k in range(4):  # heartbeat pulse
            add(bass_note(root - 12 + 12, BEAT * 0.5, 0.32 if sec == 'intro' else 0.4), t0 + k * BEAT)
        if sec == 'build':
            add(kick(0.35), t0); add(kick(0.3), t0 + 2 * BEAT)
    if b == 5:  # snare roll into the reveal
        for k in range(8):
            add(snare(0.08 + 0.05 * k), t0 + 2 * BEAT + k * BEAT / 4, pan=0.1, send=0.2)

    if sec in ('reveal', 'groove', 'cta', 'end'):
        full = sec in ('groove', 'cta')
        kicks = [0, 2] if sec != 'end' else ([0] if b == len(bars) - 2 else [])
        for k in kicks: add(kick(0.75 if full else 0.65), t0 + k * BEAT)
        if full:
            for k in (1, 3): add(snare(0.32), t0 + k * BEAT, pan=0.05, send=0.25)
        if full:
            for k in range(8):
                add(hat(0.16 if k % 2 else 0.1, open_=(k == 7)), t0 + k * BEAT / 2, pan=0.4)
            add(kick(0.45), t0 + 3.5 * BEAT)
        # bass
        if sec != 'end' or b == len(bars) - 2:
            pattern = [0, 1.5, 2, 3] if full else [0, 2]
            for p in pattern:
                add(bass_note(root, BEAT * (0.9 if p in (0, 2) else 0.45), 0.42), t0 + p * BEAT)
        else:
            add(bass_note(root, BAR * 2, 0.4), t0)

    # plucked arpeggio: the "archive" motif
    if sec in ('groove', 'break', 'cta', 'reveal'):
        arp = [notes[0] + 12, notes[1] + 12, notes[2] + 12, notes[1] + 24, notes[2] + 12, notes[1] + 12, notes[0] + 24, notes[2] + 12]
        for k, m in enumerate(arp):
            g = 0.2 if sec != 'break' else 0.36
            if sec == 'reveal' and k % 2: continue
            add(pluck(m, 0.6, g), t0 + k * BEAT / 2, pan=(-0.45 if k % 2 else 0.45), send=0.45)

    if sec == 'break':
        add(kick(0.4), t0); add(bass_note(root, BAR * 0.9, 0.3), t0)
        for k in range(4):
            add(tick(2300, 0.12), t0 + k * BEAT + BEAT / 2, pan=0.5, send=0.4)

# Risers into the two big moments.
add(noise_riser(BAR, 0.32), t_of_bar(5), send=0.4)
add(noise_riser(BAR, 0.28), t_of_bar(22), send=0.4)
# Final chord ring-out pluck
add(pluck(77, 3.0, 0.3, 0.999), t_of_bar(26), send=0.7)
add(pluck(72, 3.0, 0.25, 0.999), t_of_bar(26) + 0.08, send=0.7)

# ---------------------------------------------------------------- sound effects from the timeline
SFX = {'impact': (impact, 0.85, 0.0, 0.5), 'stamp': (stamp, 0.8, 0.1, 0.25), 'whoosh': (whoosh, 0.35, 0.0, 0.3),
       'click': (click, 0.45, 0.15, 0.1), 'pop': (pop, 0.32, 0.0, 0.2), 'tick': (lambda g: tick(3000, g), 0.4, 0.2, 0.15),
       'crumble': (crumble, 0.55, -0.1, 0.4), 'swipe': (lambda g: whoosh(0.35, g), 0.3, 0.3, 0.2)}
for e in T['sfx']:
    t = e['frame'] / FPS
    if e['type'] == 'type':
        for k in range(e.get('count', 8)):
            add(typekey(rng.uniform(0.25, 0.4)), t + k * e.get('gap', 3) / FPS + rng.uniform(-0.008, 0.008), pan=rng.uniform(-0.2, 0.2), send=0.1)
        continue
    fn, g, pan, send = SFX[e['type']]
    add(fn(g), t, pan=pan, send=send)

# ---------------------------------------------------------------- reverb, mix, master
ir_n = int(2.4 * SR); ti = np.arange(ir_n) / SR
ir = rng.standard_normal(ir_n) * np.exp(-ti * 2.6)
ir = lp(ir, 6000); ir /= np.sqrt(np.sum(ir ** 2))
wet = fftconvolve(RV, ir)[:N] * 0.35
L += wet; R += fftconvolve(RV, np.roll(ir, 97))[:N] * 0.35
mix = np.stack([L, R], 1)
mix = hp(mix.T, 28).T
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
fade = int(1.2 * SR); mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
mix *= 0.89 / np.max(np.abs(mix))

out = os.path.join(HERE, 'public', 'soundtrack.wav')
os.makedirs(os.path.dirname(out), exist_ok=True)
import wave
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('wrote', out, f'{len(mix) / SR:.1f}s')
