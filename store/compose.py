"""Composes store screenshots (1280x800) and README images from the captures made by store/shots.js."""
import json, os, sys
from PIL import Image
L = json.load(open(sys.argv[1])); out = sys.argv[2]
docs = os.path.join(os.path.dirname(out.rstrip('/')), 'docs')
os.makedirs(docs, exist_ok=True)

def with_panel(panel_path, name):
    page = Image.open(L['pageA']).convert('RGB').crop((0, 0, 899, 800))
    panel = Image.open(panel_path).convert('RGB')
    c = Image.new('RGB', (1280, 800), '#3C3C3C')
    c.paste(page, (0, 0)); c.paste(panel, (900, 0))
    c.save(os.path.join(out, name))

with_panel(L['panelA'], 'screenshot-1.png')
with_panel(L['panelDone'], 'screenshot-2.png')
Image.open(L['csF']).convert('RGB').save(os.path.join(out, 'screenshot-3.png'))
Image.open(L['readerF']).convert('RGB').save(os.path.join(out, 'screenshot-4.png'))
Image.open(L['toastF']).convert('RGB').resize((1280, 800)).save(os.path.join(out, 'screenshot-5.png'))
for src, dst in [('panelA', 'panel.png'), ('panelRun', 'exporting.png'), ('panelDone', 'done.png')]:
    Image.open(L[src]).convert('RGB').save(os.path.join(docs, dst))
Image.open(L['readerF']).convert('RGB').resize((960, 600)).save(os.path.join(docs, 'reader.png'))
Image.open(L['csF']).convert('RGB').resize((960, 600)).save(os.path.join(docs, 'case-study.png'))
print('composed', sorted(os.listdir(out)))
