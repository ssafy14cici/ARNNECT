from fontTools.ttLib import TTFont
from pathlib import Path

SRC_DIR = Path("public/fonts")
targets = [
    "MuseumClassic-L.ttf",
    "MuseumClassic-M.ttf",
    "MuseumClassic-B.ttf",
]

for name in targets:
    src = SRC_DIR / name
    out = SRC_DIR / name.replace(".ttf", ".fixed.ttf")

    font = TTFont(str(src), recalcBBoxes=False, recalcTimestamp=False)
    if "kern" in font:
        del font["kern"]
    font.save(str(out))
    print("Wrote:", out)
