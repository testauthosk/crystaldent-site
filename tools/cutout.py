"""Вырезает предметные фото (модели зубов/имплантов) из фона -> PNG с alpha."""
from rembg import remove, new_session
from PIL import Image
import os, sys

SRC = r"C:\Users\openclaw\Desktop\crystaldent\assets\stock"
OUT = r"C:\Users\openclaw\Desktop\crystaldent\assets\cutout"
os.makedirs(OUT, exist_ok=True)

session = new_session("isnet-general-use")

targets = sys.argv[1:] or ["p6812500", "p6502343", "p4687905", "p6502305", "a28407748"]

for name in targets:
    src = os.path.join(SRC, f"{name}.jpg")
    if not os.path.exists(src):
        print("skip", name)
        continue
    im = Image.open(src).convert("RGB")
    out = remove(im, session=session, alpha_matting=True,
                 alpha_matting_foreground_threshold=250,
                 alpha_matting_background_threshold=12,
                 alpha_matting_erode_size=6)
    bb = out.getbbox()
    if bb:
        out = out.crop(bb)
    p = os.path.join(OUT, f"{name}.png")
    out.save(p)
    print(f"{name}: {out.size} -> {p}")
print("done")
