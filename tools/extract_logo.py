"""Вырезает логотип CrystalDent из присланного JPG в прозрачные PNG.
Лого белый на чёрном → alpha берём из яркости."""
from PIL import Image
import os

SRC = r"C:\Users\openclaw\.claude\channels\telegram\media\1783677376_AgACAgIAAxkBAAI3.jpg"
OUT = r"C:\Users\openclaw\Desktop\crystaldent\assets"
os.makedirs(OUT, exist_ok=True)

img = Image.open(SRC).convert("RGB")
lum = img.convert("L")
w, h = img.size
print("source:", w, h)


def bbox_of(region, thresh=40):
    """bbox непрозрачных пикселей внутри region (l,t,r,b)."""
    crop = lum.crop(region)
    mask = crop.point(lambda p: 255 if p > thresh else 0)
    bb = mask.getbbox()
    if not bb:
        return None
    l, t, r, b = region
    return (l + bb[0], t + bb[1], l + bb[2], t + bb[3])


def save_white(region, name, pad=6):
    """Сохраняет белый лого с alpha=luma."""
    l, t, r, b = region
    l, t = max(0, l - pad), max(0, t - pad)
    r, b = min(w, r + pad), min(h, b + pad)
    crop_l = lum.crop((l, t, r, b))
    # Белый слой, alpha = яркость (растянутая для чистоты краёв)
    alpha = crop_l.point(lambda p: 0 if p < 12 else min(255, int((p - 12) * 255 / 200)))
    out = Image.new("RGBA", crop_l.size, (255, 255, 255, 0))
    out.putalpha(alpha)
    path = os.path.join(OUT, name)
    out.save(path)
    print(f"{name}: {out.size} -> {path}")
    return out


# Весь лок (знак + текст), без подписи снизу: ограничим по y < 480
full = bbox_of((0, 0, w, 480))
print("full logo bbox:", full)
save_white(full, "logo-full-white.png")

# Знак (зуб) — левая часть до начала буквы C
# ищем колонку-разрыв между знаком и текстом
mask = lum.point(lambda p: 255 if p > 40 else 0).crop((0, 0, w, 480))
cols = [any(mask.getpixel((x, y)) for y in range(0, 480, 2)) for x in range(w)]
# найдём первый длинный пробел после начала знака
start = cols.index(True)
gap_start = None
for x in range(start, w):
    if not cols[x]:
        run = 0
        xx = x
        while xx < w and not cols[xx]:
            run += 1
            xx += 1
        if run > 20:
            gap_start = x
            gap_end = xx
            break
print("mark ends at", gap_start, "text starts at", gap_end)

mark_bb = bbox_of((0, 0, gap_start, 480))
save_white(mark_bb, "logo-mark-white.png", pad=4)

text_bb = bbox_of((gap_end, 0, w, 480))
save_white(text_bb, "logo-text-white.png", pad=4)

# Подпись VIENA DENTAL CLINIC (серая, ниже)
sub = bbox_of((0, 500, w, h), thresh=60)
print("subline bbox:", sub)
if sub:
    save_white(sub, "logo-subline-white.png", pad=4)

print("done")
