"""Рендерит полученные SVG в PNG через Playwright — убедиться что fill-rule и контуры верны."""
from playwright.sync_api import sync_playwright
import pathlib

BRAND = pathlib.Path(r"C:\Users\openclaw\Desktop\crystaldent\site\public\brand")
OUT = pathlib.Path(r"C:\Users\openclaw\Desktop\crystaldent\assets\_check_svg.png")

svgs = ["mark.svg", "wordmark.svg", "logo-full.svg"]
blocks = []
for s in svgs:
    content = (BRAND / s).read_text(encoding="utf-8")
    blocks.append(f'<div class="row"><span class="lbl">{s}</span><div class="art">{content}</div></div>')

html = f"""<!doctype html><html><head><meta charset="utf-8"><style>
  body {{ margin:0; background:#0C1A22; color:#fff; font-family:sans-serif; padding:32px; }}
  .row {{ margin-bottom:40px; }}
  .lbl {{ font-size:12px; opacity:.5; letter-spacing:.08em; text-transform:uppercase; }}
  .art {{ margin-top:12px; color:#fff; }}
  .art svg {{ height:120px; width:auto; display:block; }}
  .row:nth-child(2) .art svg {{ height:70px; }}
  .row:nth-child(3) .art svg {{ height:80px; }}
</style></head><body>{''.join(blocks)}</body></html>"""

tmp = pathlib.Path(r"C:\Users\openclaw\Desktop\crystaldent\assets\_check_svg.html")
tmp.write_text(html, encoding="utf-8")

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 900, "height": 700}, device_scale_factor=2)
    pg.goto(tmp.as_uri())
    pg.wait_for_timeout(300)
    pg.screenshot(path=str(OUT), full_page=True)
    b.close()
print("saved", OUT)
