"""Посекционные скрины на заданной ширине — читаемо для проверки глазами."""
from playwright.sync_api import sync_playwright
import sys, pathlib

URL = "http://localhost:4322/"
OUT = pathlib.Path(r"C:\Users\openclaw\Desktop\crystaldent\assets\shots")
OUT.mkdir(parents=True, exist_ok=True)

FORCE = """
  const s = document.createElement('style');
  s.textContent = `.reveal{opacity:1 !important; transform:none !important}
    [data-hero-fade]{opacity:1 !important; transform:none !important}
    [data-draw]{stroke-dashoffset:0 !important}
    #preloader{display:none !important}
    astro-dev-toolbar{display:none !important}`;
  document.head.appendChild(s);
"""

SECTIONS = [
    (".hero", "hero"),
    (".tri", "tri"),
    ("#services", "services"),
    ("#doctors", "doctors"),
    ("#booking", "booking"),
    ("#faq", "faq"),
    ("footer", "footer"),
]

width = int(sys.argv[1]) if len(sys.argv) > 1 else 390
tag = sys.argv[2] if len(sys.argv) > 2 else ("m" if width < 700 else "d")

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": width, "height": 900}, device_scale_factor=2,
                    is_mobile=width < 700, has_touch=width < 700)
    pg.goto(URL, wait_until="networkidle")
    pg.wait_for_timeout(2500)
    pg.evaluate(FORCE)
    pg.evaluate("""async () => {
      const h = document.body.scrollHeight;
      for (let y = 0; y < h; y += 700) { window.scrollTo(0, y); await new Promise(r=>setTimeout(r,50)); }
      window.scrollTo(0,0);
    }""")
    pg.wait_for_timeout(800)

    for sel, name in SECTIONS:
        el = pg.query_selector(sel)
        if not el:
            print("нет", sel)
            continue
        path = OUT / f"{tag}_{name}.png"
        el.screenshot(path=str(path))
        print(f"{tag}_{name} -> {path}")
    b.close()
