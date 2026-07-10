"""Кладёт вырезанные PNG на тёмный фон — проверить качество alpha глазами."""
from PIL import Image
import os

A = r"C:\Users\openclaw\Desktop\crystaldent\assets"
files = ["logo-full-white.png", "logo-mark-white.png", "logo-text-white.png", "logo-subline-white.png"]

pad = 24
imgs = [Image.open(os.path.join(A, f)).convert("RGBA") for f in files]
W = max(i.width for i in imgs) + pad * 2
H = sum(i.height for i in imgs) + pad * (len(imgs) + 1)

canvas = Image.new("RGB", (W, H), (10, 26, 34))  # тёмный teal фон сайта
y = pad
for im in imgs:
    canvas.paste(im, (pad, y), im)
    y += im.height + pad

out = os.path.join(A, "_preview_on_dark.png")
canvas.save(out)
print("saved", out, canvas.size)

# Зум на знак — проверить края
mark = Image.open(os.path.join(A, "logo-mark-white.png")).convert("RGBA")
big = mark.resize((mark.width * 4, mark.height * 4), Image.LANCZOS)
bg = Image.new("RGB", big.size, (10, 26, 34))
bg.paste(big, (0, 0), big)
out2 = os.path.join(A, "_preview_mark_zoom.png")
bg.save(out2)
print("saved", out2, bg.size)
