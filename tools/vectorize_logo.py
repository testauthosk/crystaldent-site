"""Векторизует вырезанный логотип CrystalDent в SVG (potracer, pure-python)."""
from PIL import Image
import numpy as np
import potrace
import os

A = r"C:\Users\openclaw\Desktop\crystaldent\assets"
OUT = r"C:\Users\openclaw\Desktop\crystaldent\site\public\brand"
os.makedirs(OUT, exist_ok=True)

SCALE = 4  # апскейл перед трассировкой — сглаживает лесенку JPEG


def trace_to_path(png_name, upscale=SCALE):
    im = Image.open(os.path.join(A, png_name)).convert("RGBA")
    alpha = im.split()[-1]
    if upscale > 1:
        alpha = alpha.resize((alpha.width * upscale, alpha.height * upscale), Image.LANCZOS)
    # potracer трактует False как объект: инвертируем, чтобы обводился лого, а не фон
    arr = np.array(alpha) < 128
    bmp = potrace.Bitmap(arr)
    path = bmp.trace(turdsize=8, alphamax=1.0, opticurve=1, opttolerance=0.2)

    d = []
    for curve in path:
        s = curve.start_point
        d.append(f"M{s.x:.2f},{s.y:.2f}")
        for seg in curve:
            e = seg.end_point
            if seg.is_corner:
                c = seg.c
                d.append(f"L{c.x:.2f},{c.y:.2f}L{e.x:.2f},{e.y:.2f}")
            else:
                c1, c2 = seg.c1, seg.c2
                d.append(f"C{c1.x:.2f},{c1.y:.2f} {c2.x:.2f},{c2.y:.2f} {e.x:.2f},{e.y:.2f}")
        d.append("Z")
    return " ".join(d), arr.shape[1], arr.shape[0]


def write_svg(png_name, svg_name, title):
    d, w, h = trace_to_path(png_name)
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
        f'fill="none" role="img" aria-label="{title}">'
        f'<path d="{d}" fill="currentColor" fill-rule="evenodd"/>'
        f"</svg>"
    )
    p = os.path.join(OUT, svg_name)
    with open(p, "w", encoding="utf-8") as f:
        f.write(svg)
    print(f"{svg_name}: viewBox 0 0 {w} {h}, {len(svg)} bytes")
    return w, h


write_svg("logo-mark-white.png", "mark.svg", "CrystalDent")
write_svg("logo-text-white.png", "wordmark.svg", "CrystalDent")
write_svg("logo-full-white.png", "logo-full.svg", "CrystalDent — Viena Dental Clinic")
print("done")
