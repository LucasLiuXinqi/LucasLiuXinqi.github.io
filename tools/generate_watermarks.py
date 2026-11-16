"""Generate separate web derivatives; never modify source images (requires Pillow)."""
from pathlib import Path
from hashlib import sha256
from html.parser import HTMLParser
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
FONT = Path('/System/Library/Fonts/Supplemental/Arial.ttf')
TEXT = '© Xinqi Liu'

class GalleryImages(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'img' and 'data-w' in attrs:
            self.paths.append(attrs['src'].replace('images/watermarked/', 'images/'))

def digest(path):
    return sha256(path.read_bytes()).hexdigest()

def main():
    paths = []
    for page in ('photography.html', 'cats.html'):
        parser = GalleryImages()
        parser.feed((ROOT / page).read_text())
        paths.extend(parser.paths)
    assert len(paths) == len(set(paths)) == 128
    before = {p: digest(ROOT / p) for p in paths}
    manifest = []
    for relative in paths:
        source = ROOT / relative
        target = ROOT / relative.replace('images/', 'images/watermarked/', 1)
        target.parent.mkdir(parents=True, exist_ok=True)
        with Image.open(source) as original:
            assert original.mode == 'RGB'
            assert original.getexif().get(274, 1) == 1, f'Normalize orientation explicitly: {relative}'
            profile = original.info.get('icc_profile')
            image = original.convert('RGBA')
            overlay = Image.new('RGBA', image.size)
            draw = ImageDraw.Draw(overlay)
            font = ImageFont.truetype(str(FONT), max(14, round(image.width * 0.017)))
            bounds = draw.textbbox((0, 0), TEXT, font=font)
            pad = max(12, round(image.width * 0.018))
            x = image.width - pad - (bounds[2] - bounds[0]) - bounds[0]
            y = image.height - pad - (bounds[3] - bounds[1]) - bounds[1]
            draw.text((x + 1, y + 1), TEXT, font=font, fill=(0, 0, 0, 100))
            draw.text((x, y), TEXT, font=font, fill=(255, 255, 255, 112))
            result = Image.alpha_composite(image, overlay).convert('RGB')
            result.save(target, format='JPEG', quality=95, subsampling=0, progressive=True,
                        **({'icc_profile': profile} if profile else {}))
            with Image.open(target) as check:
                assert check.size == original.size
                assert check.info.get('icc_profile') == profile
                assert not check.getexif()
            manifest.append({'source': relative, 'derivative': str(target.relative_to(ROOT)),
                             'source_sha256': before[relative], 'derivative_sha256': digest(target),
                             'width': image.width, 'height': image.height})
    assert before == {p: digest(ROOT / p) for p in paths}, 'A source file changed'
    (ROOT / 'watermark-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(f'Generated and checked {len(manifest)} derivatives; all source hashes unchanged.')

if __name__ == '__main__':
    main()
