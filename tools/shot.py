"""Скриншоты сайта на реальных брейкпоинтах через Playwright (не Edge — DPI-trap)."""
from playwright.sync_api import sync_playwright
import sys, pathlib

URL = "http://localhost:4322/"
OUT = pathlib.Path(r"C:\Users\openclaw\Desktop\crystaldent\assets\shots")
OUT.mkdir(parents=True, exist_ok=True)

FORCE_VISIBLE = """
  const s = document.createElement('style');
  s.textContent = `.reveal{opacity:1 !important; transform:none !important}
    [data-hero-fade]{opacity:1 !important; transform:none !important}
    [data-draw]{stroke-dashoffset:0 !important}
    #preloader{display:none !important}
    astro-dev-toolbar{display:none !important}`;
  document.head.appendChild(s);
"""

def run(width, height, name, full=True, dsf=2):
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": width, "height": height}, device_scale_factor=dsf,
                        is_mobile=width < 700, has_touch=width < 700)
        pg.goto(URL, wait_until="networkidle")
        pg.wait_for_timeout(2600)
        pg.evaluate(FORCE_VISIBLE)
        # прокрутка, чтобы отработали lazy-картинки
        pg.evaluate("""async () => {
          const h = document.body.scrollHeight;
          for (let y = 0; y < h; y += 700) { window.scrollTo(0, y); await new Promise(r=>setTimeout(r,60)); }
          window.scrollTo(0, 0);
        }""")
        pg.wait_for_timeout(900)

        overflow = pg.evaluate("({sw: document.documentElement.scrollWidth, iw: window.innerWidth})")
        path = OUT / f"{name}.png"
        pg.screenshot(path=str(path), full_page=full)
        print(f"{name}: {overflow}  overflow={'YES' if overflow['sw'] > overflow['iw'] else 'no'} -> {path}")
        b.close()


if __name__ == "__main__":
    which = sys.argv[1] if len(sys.argv) > 1 else "both"
    if which in ("both", "mobile"):
        run(390, 844, "mobile")
    if which in ("both", "desktop"):
        run(1440, 900, "desktop", dsf=1)
