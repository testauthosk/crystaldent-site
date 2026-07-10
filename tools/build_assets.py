"""Финальные ассеты сайта: тонировка вырезок + кадрирование портретов.

Портреты кадрируются выше нагрудных карманов — там читаются имена и логотипы
чужих клиник (Dentify, Dr. Carlos Novakowski и т.п.), им не место на сайте клиента.
"""
from PIL import Image, ImageEnhance, ImageOps
import os

STOCK = r"C:\Users\openclaw\Desktop\crystaldent\assets\stock"
CUT = r"C:\Users\openclaw\Desktop\crystaldent\assets\cutout"
OUT = r"C:\Users\openclaw\Desktop\crystaldent\site\public\img"
os.makedirs(OUT, exist_ok=True)

INK = (21, 33, 40)


def cool_grade(im: Image.Image, sat=0.62, bright=1.06, cool=0.10) -> Image.Image:
    """Приглушает клиническую желтизну, уводит в холодный тон палитры."""
    rgb = im.convert("RGB")
    rgb = ImageEnhance.Color(rgb).enhance(sat)
    rgb = ImageEnhance.Brightness(rgb).enhance(bright)
    rgb = ImageEnhance.Contrast(rgb).enhance(1.05)
    tint = Image.new("RGB", rgb.size, (140, 210, 215))
    rgb = Image.blend(rgb, tint, cool)
    if im.mode == "RGBA":
        rgb = rgb.convert("RGBA")
        rgb.putalpha(im.split()[-1])
    return rgb


def save_cutout(name, out_name, sat, cool, maxw=1100):
    im = Image.open(os.path.join(CUT, f"{name}.png")).convert("RGBA")
    im = cool_grade(im, sat=sat, cool=cool)
    if im.width > maxw:
        h = round(im.height * maxw / im.width)
        im = im.resize((maxw, h), Image.LANCZOS)
    p = os.path.join(OUT, out_name)
    im.save(p, "WEBP", quality=88, method=6)
    print(f"{out_name}: {im.size}")


def crop_portrait(name, out_name, box, size=(720, 900), duotone=False):
    """box = (l, t, r, b) в долях исходника."""
    im = Image.open(os.path.join(STOCK, f"{name}.jpg")).convert("RGB")
    w, h = im.size
    im = im.crop((int(box[0] * w), int(box[1] * h), int(box[2] * w), int(box[3] * h)))
    im = ImageOps.fit(im, size, Image.LANCZOS, centering=(0.5, 0.35))
    if duotone:
        im = cool_grade(im, sat=0.55, bright=1.0, cool=0.13)
        im = ImageEnhance.Contrast(im).enhance(1.08)
    else:
        im = cool_grade(im, sat=0.72, bright=1.02, cool=0.06)
    p = os.path.join(OUT, out_name)
    im.save(p, "WEBP", quality=86, method=6)
    print(f"{out_name}: {im.size}")


# ── объекты для панелей ──
save_cutout("p6812500", "aligners.webp", sat=0.75, cool=0.09)   # прозрачная модель
save_cutout("p4687905", "implant.webp", sat=0.5, cool=0.12)      # имплант в разрезе

# ── врач для центральной панели: кадр выше кармана с чужим именем ──
crop_portrait("d14235194", "doctor-main.webp", (0.10, 0.02, 0.95, 0.60), (860, 1160), duotone=True)

# ── карточки врачей: голова + плечи ──
crop_portrait("d31017709", "doc-1.webp", (0.12, 0.02, 0.90, 0.52))
crop_portrait("d37458046", "doc-2.webp", (0.30, 0.14, 0.82, 0.45))  # выше логотипа Dentify
crop_portrait("d31043312", "doc-3.webp", (0.14, 0.05, 0.92, 0.60))
crop_portrait("d20596946", "doc-4.webp", (0.10, 0.02, 0.94, 0.55))

print("done")
