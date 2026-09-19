import sys, io, tarfile, urllib.request, os, re

URL = 'https://registry.npmjs.org/lxgw-wenkai-webfont/-/lxgw-wenkai-webfont-1.7.0.tgz'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEST = os.path.join(ROOT, 'public', 'fonts', 'lxgw-wenkai')

req = urllib.request.Request(URL, headers={'User-Agent': 'Mozilla/5.0'})
data = urllib.request.urlopen(req, timeout=120).read()
print('tgz bytes:', len(data), file=sys.stderr)

tf = tarfile.open(fileobj=io.BytesIO(data), mode='r:gz')
css_member = None
count = 0
total = 0
os.makedirs(os.path.join(DEST, 'files'), exist_ok=True)

for m in tf.getmembers():
    name = m.name
    base = os.path.basename(name)
    if name == 'package/lxgwwenkai-regular.css':
        css_member = m
        continue
    if re.match(r'package/files/lxgwwenkai-regular-subset-\d+\.woff2$', name):
        out_path = os.path.join(DEST, 'files', base)
        src = tf.extractfile(m)
        with open(out_path, 'wb') as f:
            f.write(src.read())
        count += 1
        total += m.size

# extract css
if css_member:
    src = tf.extractfile(css_member)
    with open(os.path.join(DEST, 'regular.css'), 'wb') as f:
        f.write(src.read())

print('extracted subsets:', count, 'total bytes:', total)
print('css tail:')
with open(os.path.join(DEST, 'regular.css'), 'r', encoding='utf-8') as f:
    css = f.read()
print('css len', len(css))
# show a sample @font-face and the family/url pattern
print(css[:600])
print('...')
print(css[-400:])