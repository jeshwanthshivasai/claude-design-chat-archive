"""Animated inserts for the Design Chat Archive video and Short.

Renders three segments in two aspects (16:9 1920x1080, 9:16 1080x1920), 30 fps, no audio:
  1-deadline   chats stack up, the closure stamp lands, the chats fade away
  2-saved      chats fly into a folder, SAVED stamp lands
  3-endcard    icon, name, where to get it
Usage: python3 video/render.py OUTDIR
"""
import math, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

FPS = 30
INK = (22, 30, 56); INK2 = (34, 45, 80); MANILA = (234, 217, 174); MANILA_D = (205, 184, 132)
PAPER = (251, 246, 233); RUST = (196, 86, 52); SOFT = (190, 196, 214)
CB = '/usr/share/fonts/type1/texlive-fonts-recommended/bchb8a.pfb'
IM = '/usr/share/fonts/opentype/inter/Inter-SemiBold.otf'
IR = '/usr/share/fonts/opentype/inter/Inter-Regular.otf'
SS = 3  # supersampling for sprites

def font(p, s): return ImageFont.truetype(p, max(1, int(s)))
def clamp(x, a=0.0, b=1.0): return max(a, min(b, x))
def seg(t, a, b): return clamp((t - a) / (b - a)) if b > a else float(t >= a)
def ease_out(x): return 1 - (1 - x) ** 3
def ease_in(x): return x ** 3
def ease_inout(x): return 4 * x ** 3 if x < .5 else 1 - (-2 * x + 2) ** 3 / 2
def back_out(x, s=1.7): x -= 1; return 1 + (s + 1) * x ** 3 + s * x ** 2
def lerp(a, b, x): return a + (b - a) * x

def with_alpha(img, a):
    if a >= 0.999: return img
    out = img.copy(); out.putalpha(img.split()[3].point(lambda v: int(v * a))); return out

def shadowed(sprite, blur, dy, alpha=110):
    pad = int(blur * 3) + abs(int(dy))
    W, H = sprite.size
    can = Image.new('RGBA', (W + pad * 2, H + pad * 2), (0, 0, 0, 0))
    sh = Image.new('RGBA', sprite.size, (0, 0, 0, 0)); sh.putalpha(sprite.split()[3].point(lambda v: v * alpha // 255))
    can.alpha_composite(sh, (pad, pad + int(dy))); can = can.filter(ImageFilter.GaussianBlur(blur))
    can.alpha_composite(sprite, (pad, pad)); return can

def bubble(w, h, fill, tail_right, line_col, widths):
    W, H = int(w * SS), int(h * SS); r = int(h * .3 * SS); tl = int(h * .32 * SS)
    im = Image.new('RGBA', (W + tl * 2, H + tl * 2), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    x0, y0 = tl, tl // 2
    d.rounded_rectangle([x0, y0, x0 + W, y0 + H], radius=r, fill=fill)
    if tail_right: d.polygon([(x0 + W - tl * 1.6, y0 + H - 2), (x0 + W + tl * .2, y0 + H + tl), (x0 + W - tl * .5, y0 + H - 2)], fill=fill)
    else: d.polygon([(x0 + tl * 1.6, y0 + H - 2), (x0 - tl * .2, y0 + H + tl), (x0 + tl * .5, y0 + H - 2)], fill=fill)
    lh = H * .11; gap = H * .24; ly = y0 + H * .3
    for i, fw in enumerate(widths):
        d.rounded_rectangle([x0 + W * .1, ly + i * gap, x0 + W * .1 + W * fw, ly + i * gap + lh], radius=lh / 2, fill=line_col)
    im = im.resize((im.width // SS, im.height // SS), Image.LANCZOS)
    return shadowed(im, max(2, h * .12), h * .1)

def stamp(text, size, color=RUST):
    f = font(IM, size * SS); tmp = ImageDraw.Draw(Image.new('L', (1, 1)))
    l, t, r, b = tmp.textbbox((0, 0), text, font=f); tw, th = r - l, b - t
    px, py = size * .9 * SS, size * .55 * SS; bw = max(3, int(size * .14 * SS))
    im = Image.new('RGBA', (int(tw + px * 2), int(th + py * 2)), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle([bw // 2, bw // 2, im.width - bw // 2, im.height - bw // 2], radius=size * .3 * SS, outline=color, width=bw)
    d.text((im.width / 2, im.height / 2), text, font=f, fill=color, anchor='mm')
    # ink texture: knock out a few speckles so it reads as a rubber stamp
    import random; random.seed(7)
    for _ in range(int(im.width * im.height / 900)):
        x, y = random.randrange(im.width), random.randrange(im.height); rr = random.randint(1, 3) * SS // 2
        d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=(0, 0, 0, 0))
    return im.resize((im.width // SS, im.height // SS), Image.LANCZOS)

def text_sprite(text, path, size, color):
    f = font(path, size * SS); tmp = ImageDraw.Draw(Image.new('L', (1, 1)))
    l, t, r, b = tmp.textbbox((0, 0), text, font=f)
    im = Image.new('RGBA', (r - l + 4 * SS, b - t + 4 * SS), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((2 * SS - l, 2 * SS - t), text, font=f, fill=color)
    return im.resize((im.width // SS, im.height // SS), Image.LANCZOS)

def folder_parts(w, h):
    def part(draw_fn):
        im = Image.new('RGBA', (int(w * SS), int(h * 1.5 * SS)), (0, 0, 0, 0)); draw_fn(ImageDraw.Draw(im), SS)
        return im.resize((im.width // SS, im.height // SS), Image.LANCZOS)
    r = h * .09
    back = part(lambda d, s: (d.rounded_rectangle([0, h * .5 * s, w * s, h * 1.5 * s], radius=r * s, fill=MANILA_D),
                              d.rounded_rectangle([0, h * .38 * s, w * .4 * s, h * .62 * s], radius=r * .8 * s, fill=MANILA_D)))
    front = part(lambda d, s: (d.rounded_rectangle([0, h * .72 * s, w * s, h * 1.5 * s], radius=r * s, fill=MANILA),
                               d.line([(w * .08 * s, h * .88 * s), (w * .92 * s, h * .88 * s)], fill=MANILA_D, width=int(h * .025 * s))))
    return back, shadowed(front, h * .04, -h * .03, 80)

def icon(size):
    s = size * SS / 512; im = Image.new('RGBA', (size * SS, size * SS), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    P = lambda *v: [x * s for x in v]
    d.rounded_rectangle(P(0, 0, 512, 512), radius=112 * s, fill=INK2)
    d.rounded_rectangle(P(82, 206, 430, 432), radius=34 * s, fill=MANILA_D); d.rounded_rectangle(P(82, 178, 222, 230), radius=26 * s, fill=MANILA_D)
    b = Image.new('RGBA', im.size, (0, 0, 0, 0)); bd = ImageDraw.Draw(b)
    bd.rounded_rectangle(P(128, 58, 392, 214), radius=46 * s, fill=PAPER); bd.polygon([tuple(P(170, 206)), tuple(P(142, 262)), tuple(P(236, 208))], fill=PAPER)
    for i, w in enumerate([180, 124]): bd.rounded_rectangle(P(172, 100 + i * 52, 172 + w, 126 + i * 52), radius=13 * s, fill=INK)
    im.alpha_composite(b.rotate(-7, resample=Image.BICUBIC, center=(260 * s, 150 * s))); d = ImageDraw.Draw(im)
    d.rounded_rectangle(P(82, 268, 430, 432), radius=34 * s, fill=MANILA); d.line([tuple(P(122, 312)), tuple(P(390, 312))], fill=MANILA_D, width=int(12 * s))
    return im.resize((size, size), Image.LANCZOS)

def background(W, H, u):
    im = Image.new('RGBA', (W, H), INK + (255,)); d = ImageDraw.Draw(im)
    step = int(48 * u)
    for y in range(step, H, step): d.line([(0, y), (W, y)], fill=INK2, width=max(1, int(1.5 * u)))
    d.line([(int(120 * u), 0), (int(120 * u), H)], fill=(70, 46, 60), width=max(1, int(2 * u)))  # margin rule, like ledger paper
    return im

def place(base, sprite, cx, cy, a=1.0, scale=1.0, rot=0.0):
    if a <= 0.003: return
    sp = sprite
    if abs(scale - 1) > 1e-3: sp = sp.resize((max(1, int(sp.width * scale)), max(1, int(sp.height * scale))), Image.BICUBIC)
    if abs(rot) > 1e-3: sp = sp.rotate(rot, resample=Image.BICUBIC, expand=True)
    sp = with_alpha(sp, a); base.alpha_composite(sp, (int(cx - sp.width / 2), int(cy - sp.height / 2)))

# ---------------------------------------------------------------- segments
def seg_deadline(W, H, portrait):
    u = min(W, H) / 1080; bg = background(W, H, u); dur = 6.0
    bw, bh = (520 * u, 120 * u)
    specs = [(PAPER, False, INK, [.7, .45]), (MANILA, True, (120, 96, 46), [.62, .5]), (PAPER, False, INK, [.74, .38]),
             (MANILA, True, (120, 96, 46), [.55, .42]), (PAPER, False, INK, [.66, .5]), (MANILA, True, (120, 96, 46), [.7, .3])]
    bubbles = [bubble(bw, bh, c + (255,), tr, lc + (255,), ws) for c, tr, lc, ws in specs]
    cx = W * .5; gapy = bh * (1.28 if portrait else 1.06); top = (H - (5 * gapy + bh)) / 2 - (H * .06 if portrait else 0)
    xs = [cx - 70 * u if not s[1] else cx + 70 * u for s in specs]
    st = stamp('CLOSES 14 DEC 2026', (64 if portrait else 92) * u)
    cap = text_sprite('Your chats go with it.', CB, 78 * u, PAPER)
    frames = []
    for i in range(int(dur * FPS)):
        t = i / FPS; im = bg.copy()
        fade = ease_in(seg(t, 3.0, 4.2))                     # chats dissolve after the stamp
        for k, b in enumerate(bubbles):
            p = seg(t, .15 + k * .32, .55 + k * .32)
            if p <= 0: continue
            y = top + k * gapy + (1 - ease_out(p)) * 40 * u - fade * (60 + 25 * k) * u
            place(im, b, xs[k], y + bh / 2, a=ease_out(p) * (1 - fade), scale=lerp(.85, 1, back_out(p)))
        ps = seg(t, 2.35, 2.7)
        if ps > 0:
            sc = lerp(1.9, 1, ease_out(ps)); jolt = math.sin(seg(t, 2.7, 2.95) * math.pi * 3) * 6 * u * (1 - seg(t, 2.7, 2.95))
            place(im, st, W / 2 + jolt, H * (.44 if portrait else .46), a=ease_out(ps), scale=sc, rot=-7)
        pc = seg(t, 4.1, 4.7)
        place(im, cap, W / 2, H * (.58 if portrait else .66), a=ease_out(pc))
        frames.append(im)
    return frames

def seg_saved(W, H, portrait):
    u = min(W, H) / 1080; bg = background(W, H, u); dur = 5.5
    fw, fh = (680 if portrait else 760) * u, (460 if portrait else 500) * u; back, front = folder_parts(fw, fh)
    fcx, fcy = W / 2, H * (.56 if portrait else .58)
    bw, bh = 420 * u, 100 * u
    specs = [(PAPER, False, INK, [.7, .45]), (MANILA, True, (120, 96, 46), [.62, .5]), (PAPER, False, INK, [.74, .38]), (MANILA, True, (120, 96, 46), [.55, .4])]
    bubbles = [bubble(bw, bh, c + (255,), tr, lc + (255,), ws) for c, tr, lc, ws in specs]
    starts = [(-.15, .18), (1.15, .12), (-.1, .32), (1.1, .3)]
    st = stamp('SAVED', 74 * u)
    cap = text_sprite('Every chat. One click.', CB, 78 * u, PAPER)
    frames = []
    pocket_y = fcy - fh * .1
    for i in range(int(dur * FPS)):
        t = i / FPS; im = bg.copy()
        pf = ease_out(seg(t, 0, .5))
        place(im, back, fcx, fcy + (1 - pf) * 80 * u, a=pf)
        for k, b in enumerate(bubbles):
            p = seg(t, .45 + k * .38, 1.35 + k * .38)
            if p <= 0: continue
            sx, sy = W * starts[k][0], H * starts[k][1]; ex, ey = fcx + (k - 1.5) * 40 * u, pocket_y + 30 * u
            e = ease_inout(p); arc = math.sin(e * math.pi) * -160 * u
            x, y = lerp(sx, ex, e), lerp(sy, ey, e) + arc
            place(im, b, x, y, scale=lerp(1, .78, e), rot=lerp(-12 if k % 2 == 0 else 12, (k - 1.5) * 3, e))
        place(im, front, fcx, fcy + (1 - pf) * 80 * u, a=pf)
        ps = seg(t, 2.65, 2.95)
        if ps > 0: place(im, st, fcx, fcy + fh * .45, a=ease_out(ps), scale=lerp(2, 1, ease_out(ps)), rot=-6)
        place(im, cap, W / 2, H * (.17 if portrait else .14), a=ease_out(seg(t, 3.3, 3.9)))
        frames.append(im)
    return frames

def seg_endcard(W, H, portrait):
    u = min(W, H) / 1080; bg = background(W, H, u); dur = 5.0
    ic = icon(int(300 * u))
    name1 = text_sprite('Design Chat Archive', CB, 104 * u, PAPER)
    line2 = text_sprite('Free on the Chrome Web Store', IM, 44 * u, MANILA)
    line3 = text_sprite('Search "Design Chat Archive"', IR, 36 * u, SOFT)
    line4 = text_sprite('Unofficial. Not made by Anthropic.', IR, 28 * u, (130, 138, 160))
    frames = []
    cy = H * (.4 if portrait else .36)
    for i in range(int(dur * FPS)):
        t = i / FPS; im = bg.copy()
        p = seg(t, .1, .7); place(im, ic, W / 2, cy, a=ease_out(p), scale=lerp(.6, 1, back_out(p)))
        y = cy + ic.height * .5 + 90 * u
        for k, (spr, gap) in enumerate([(name1, 0), (line2, 110), (line3, 175), (line4, 260)]):
            q = seg(t, .55 + k * .18, 1.05 + k * .18)
            place(im, spr, W / 2, y + gap * u + (1 - ease_out(q)) * 24 * u, a=ease_out(q))
        frames.append(im)
    return frames

def write(frames, path):
    W, H = frames[0].size
    p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                          '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'medium', '-movflags', '+faststart', path], stdin=subprocess.PIPE)
    for f in frames: p.stdin.write(f.convert('RGB').tobytes())
    p.stdin.close(); p.wait()

if __name__ == '__main__':
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    only = sys.argv[2:] or None
    for name, fn in [('1-deadline', seg_deadline), ('2-saved', seg_saved), ('3-endcard', seg_endcard)]:
        for tag, (W, H, portrait) in [('16x9', (1920, 1080, False)), ('9x16', (1080, 1920, True))]:
            key = f'{name}-{tag}'
            if only and key not in only: continue
            fr = fn(W, H, portrait); write(fr, os.path.join(out, key + '.mp4'))
            fr[-1].convert('RGB').save(os.path.join(out, key + '-last.png')); fr[len(fr) // 2].convert('RGB').save(os.path.join(out, key + '-mid.png'))
            print('wrote', key, len(fr), 'frames')
