"""Compress public images losslessly; replace only smaller, pixel-identical files."""
from pathlib import Path
from io import BytesIO
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
REPORT = ROOT / '.openai/image-optimization.json'
previous = json.loads(REPORT.read_text()) if REPORT.exists() else {'images': {}}
records = {}
alternates = {}

def digest(data):
    return hashlib.sha256(data).hexdigest()

def decoded(data):
    with Image.open(BytesIO(data)) as image:
        return image.size, image.convert('RGBA').tobytes()

for path in sorted((ROOT / 'public').rglob('*')):
    if path.suffix.lower() not in {'.png', '.webp', '.jpg', '.jpeg'}:
        continue
    relative = path.relative_to(ROOT).as_posix()
    original = path.read_bytes()
    old = previous.get('images', {}).get(relative)
    old_alternate = old.get('webpAlternative') if old else None
    alternate_current = not old_alternate or (ROOT.joinpath(old_alternate['path']).is_file() and digest(ROOT.joinpath(old_alternate['path']).read_bytes()) == old_alternate.get('sha256'))
    if old and old['sha256'] == digest(original) and alternate_current:
        records[relative] = old
        if old.get('webpAlternative'):
            alternates[relative] = old['webpAlternative']
        continue
    with Image.open(BytesIO(original)) as opened:
        opened.load()
        size = opened.size
        rgba = opened.convert('RGBA').tobytes()
        options = {key: opened.info[key] for key in ('icc_profile', 'exif') if opened.info.get(key)}
        image = opened.copy()
    output = BytesIO()
    candidate = original
    if path.suffix.lower() == '.png':
        image.save(output, 'PNG', optimize=True, compress_level=9, **options)
        candidate = output.getvalue()
    elif path.suffix.lower() == '.webp':
        image.save(output, 'WEBP', lossless=True, quality=100, method=6, exact=True, **options)
        candidate = output.getvalue()
    # Already compressed JPEGs are never recompressed with a lossy codec.
    if len(candidate) < len(original):
        assert decoded(candidate) == (size, rgba), f'Pixel verification failed: {relative}'
        path.write_bytes(candidate)
    final = path.read_bytes()
    record = {'sha256': digest(final), 'width': size[0], 'height': size[1], 'beforeBytes': len(original), 'afterBytes': len(final), 'decodedPixelSha256': digest(rgba), 'pixelVerified': True}
    # Retain the original PNG for download/social compatibility; use lossless WebP in page markup.
    if path.suffix.lower() == '.png' and path.name != 'tyrex-opengraph.png':
        webp = BytesIO()
        image.save(webp, 'WEBP', lossless=True, quality=100, method=6, exact=True, **options)
        value = webp.getvalue()
        alternate = path.with_suffix('.webp')
        if len(value) < len(final) and (not alternate.exists() or old and old.get('webpAlternative')):
            assert decoded(value) == (size, rgba), f'WebP pixel verification failed: {relative}'
            alternate.write_bytes(value)
            alternate_path = alternate.relative_to(ROOT).as_posix()
            alternative = {'path': alternate_path, 'bytes': len(value), 'bytesSaved': len(final)-len(value), 'sha256': digest(value), 'pixelVerified': True}
            record['webpAlternative'] = alternative
            alternates[relative] = alternative
            records[alternate_path] = {'sha256': digest(value), 'width': size[0], 'height': size[1], 'beforeBytes': len(value), 'afterBytes': len(value), 'decodedPixelSha256': digest(rgba), 'pixelVerified': True}
    records[relative] = record

report = {'method': 'Lossless compression only; decoded RGBA pixels verified before every replacement.', 'images': records, 'alternates': alternates}
REPORT.parent.mkdir(exist_ok=True)
REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True)+'\n')
print(json.dumps({'imagesChecked':len(records), 'losslessBytesSaved':sum(r['beforeBytes']-r['afterBytes'] for r in records.values()), 'webpAlternates':alternates}, ensure_ascii=False))
