from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = root / "assets/images/icon.png"
image = Image.open(source).convert("RGB")
image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
for name in ["icon.png", "splash-icon.png", "favicon.png", "android-icon-foreground.png"]:
    image.save(root / "assets/images" / name, format="PNG", optimize=True, compress_level=9)
