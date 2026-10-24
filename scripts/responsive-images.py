"""Build size-adapted lossless WebP derivatives; full-resolution sources stay untouched."""
from pathlib import Path
from PIL import Image
import json,hashlib
root=Path(__file__).resolve().parent.parent
covers=json.loads((root/'lib/product-art.json').read_text());cats=json.loads((root/'lib/category-art.json').read_text())
videos=json.loads((root/'lib/product-videos.json').read_text())
galleries=json.loads((root/'lib/product-galleries.json').read_text())
paths=set(covers.values())|set(cats.values())|{p for values in galleries.values() for p in values}|{v['poster'] for values in videos.values() for v in values}
# Include fallback product covers and large brand art actually used by the storefront.
paths|={str('/'+str(p.relative_to(root/'public'))) for p in (root/'public/assets/products/v4').glob('*.webp') if p.stem not in covers}
paths|={'/assets/brand/hero-wishes.webp','/assets/brand/discord-palace.webp','/assets/brand/wish-lamp.webp','/assets/gift-cards-promo.webp'}
report_path=root/'.openai/image-optimization.json';report=json.loads(report_path.read_text());manifest={}
folder=root/'public/assets/responsive';folder.mkdir(exist_ok=True)
for path in sorted(paths):
 src=root/'public'/path.lstrip('/');im=Image.open(src);im.load();entries=[]
 for width in ([96,320,640,960] if 'wish-lamp' in path else [320,640,960]):
  if width>=im.width:continue
  digest=hashlib.sha256(path.encode()).hexdigest()[:12];dst=folder/f'{digest}-{width}.webp'
  if not dst.exists():
   resized=im.resize((width,round(im.height*width/im.width)),Image.Resampling.LANCZOS)
   resized.save(dst,'WEBP',lossless=True,quality=100,method=1,exact=True)
   assert Image.open(dst).convert('RGBA').tobytes()==resized.convert('RGBA').tobytes()
  small=Image.open(dst);pixels=small.convert('RGBA').tobytes();b=dst.read_bytes()
  report['images'][str(dst.relative_to(root))]={'sha256':hashlib.sha256(b).hexdigest(),'width':small.width,'height':small.height,'beforeBytes':len(b),'afterBytes':len(b),'decodedPixelSha256':hashlib.sha256(pixels).hexdigest(),'pixelVerified':True,'responsiveSource':path}
  entries.append({'src':'/'+str(dst.relative_to(root/'public')),'width':width})
 entries.append({'src':path,'width':im.width});manifest[path]=entries
(root/'lib/responsive-images.json').write_text(json.dumps(manifest,indent=2)+'\n');report_path.write_text(json.dumps(report,indent=2,sort_keys=True)+'\n')
print(json.dumps({'sourceImages':len(manifest),'responsiveFiles':len(list(folder.glob('*.webp')))}))
