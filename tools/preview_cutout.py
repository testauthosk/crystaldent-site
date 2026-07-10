"""Кладёт вырезанные объекты на фон панели сайта — проверить края и читаемость."""
from PIL import Image
import glob, os

CUT = r"C:\Users\openclaw\Desktop\crystaldent\assets\cutout"
files = sorted(glob.glob(os.path.join(CUT, "*.png")))

CELL = 380
canvas = Image.new("RGB", (CELL * len(files), CELL + 26), (21, 33, 40))

for i, f in enumerate(files):
    im = Image.open(f).convert("RGBA")
    im.thumbnail((CELL - 40, CELL - 40), Image.LANCZOS)
    x = i * CELL + (CELL - im.width) // 2
    y = (CELL - im.height) // 2
    canvas.paste(im, (x, y), im)

out = os.path.join(CUT, "_preview.png")
canvas.save(out)
print(out, canvas.size, [os.path.basename(f) for f in files])
