"""Контактный лист скачанных стоков — отсмотреть все кандидаты разом."""
from PIL import Image, ImageDraw
import glob, os, sys

SRC = r"C:\Users\openclaw\Desktop\crystaldent\assets\stock"
prefix = sys.argv[1] if len(sys.argv) > 1 else ""
files = sorted(glob.glob(os.path.join(SRC, f"{prefix}*.jpg")))
if not files:
    sys.exit("нет файлов")

COL = 4
TH = 230
TW = 320
pad = 10
rows = (len(files) + COL - 1) // COL

canvas = Image.new("RGB", (COL * (TW + pad) + pad, rows * (TH + pad + 20) + pad), (12, 26, 34))
d = ImageDraw.Draw(canvas)

for i, f in enumerate(files):
    im = Image.open(f).convert("RGB")
    im.thumbnail((TW, TH), Image.LANCZOS)
    x = pad + (i % COL) * (TW + pad)
    y = pad + (i // COL) * (TH + pad + 20)
    canvas.paste(im, (x, y))
    d.text((x + 2, y + TH + 3), os.path.basename(f).replace(".jpg", ""), fill=(150, 175, 185))

out = os.path.join(SRC, f"_sheet_{prefix or 'all'}.png")
canvas.save(out)
print(out, canvas.size, len(files), "files")
